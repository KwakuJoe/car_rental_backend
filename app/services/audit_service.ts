import type { HttpContext } from '@adonisjs/core/http'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'
import AuditLog from '#models/audit_log'
import { clientIp } from '#helpers/client_ip'
import type User from '#models/user'

type Snapshot = Record<string, unknown>

export type AuditEntry = {
  /** <module>.<verb>, e.g. user.updated, branch.deleted, auth.login_failed */
  action: string
  subject?: { type: string; id?: string | null; label?: string | null }
  /** State before the change - only fields that differ from `after` are stored. */
  before?: Snapshot | null
  after?: Snapshot | null
  metadata?: Snapshot | null
  /** Defaults to the authenticated user on ctx. */
  actor?: User | null
  actorType?: 'staff' | 'system' | 'customer' | 'webhook'
  /** Overrides the actor's name/email snapshot (e.g. the email tried on a failed login). */
  actorLabel?: string | null
}

const SENSITIVE_KEY = /password|token|secret|hash/i
const REDACTED = '[redacted]'

function normalize(value: unknown): unknown {
  if (value instanceof DateTime) return value.toISO()
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(normalize)
  return value === undefined ? null : value
}

function redact(snapshot: Snapshot): Snapshot {
  return Object.fromEntries(
    Object.entries(snapshot).map(([key, value]) => [
      key,
      SENSITIVE_KEY.test(key) ? REDACTED : normalize(value),
    ])
  )
}

/**
 * Keeps only the keys whose values differ. Returns null for both when
 * nothing changed (the caller then skips writing an entry).
 */
function diff(before: Snapshot, after: Snapshot) {
  const changedBefore: Snapshot = {}
  const changedAfter: Snapshot = {}
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const previous = normalize(before[key])
    const next = normalize(after[key])
    if (JSON.stringify(previous) !== JSON.stringify(next)) {
      changedBefore[key] = previous
      changedAfter[key] = next
    }
  }
  return Object.keys(changedAfter).length ? { before: changedBefore, after: changedAfter } : null
}

/**
 * Append-only audit trail (M1.4). Call it from controllers/services with the
 * intent of the change ("role.permissions_synced"), not from model hooks -
 * hooks only know "a row changed". Pass the transaction when there is one so
 * the change and its audit entry commit together.
 */
export default class AuditService {
  static async record(ctx: HttpContext | null, entry: AuditEntry, trx?: TransactionClientContract) {
    let before = entry.before ? redact(entry.before) : null
    let after = entry.after ? redact(entry.after) : null

    if (before && after) {
      const changes = diff(before, after)
      if (!changes) return null // an update that changed nothing isn't worth an entry
      ;({ before, after } = changes)
    }

    const actor = entry.actor !== undefined ? entry.actor : (ctx?.auth.user ?? null)

    return AuditLog.create(
      {
        userId: actor?.id ?? null,
        actorType: entry.actorType ?? (actor ? 'staff' : 'system'),
        actorLabel: entry.actorLabel ?? (actor ? (actor.fullName ?? actor.email) : null),
        action: entry.action,
        subjectType: entry.subject?.type ?? null,
        subjectId: entry.subject?.id ?? null,
        subjectLabel: entry.subject?.label ?? null,
        before,
        after,
        metadata: entry.metadata ? redact(entry.metadata) : null,
        ip: ctx ? clientIp(ctx) : null,
        userAgent: ctx?.request.header('user-agent')?.slice(0, 255) ?? null,
      },
      trx ? { client: trx } : undefined
    )
  }

  /** Plain snapshot of some model attributes, for before/after. */
  static pick<T extends object, K extends keyof T>(model: T, keys: K[]): Snapshot {
    return Object.fromEntries(keys.map((key) => [key as string, normalize(model[key])]))
  }
}
