import app from '@adonisjs/core/services/app'
import Business from '#models/business'

type Entry = { at: number; ttl: number; value: Promise<unknown> }
const store = new Map<string, Entry>()

/**
 * A small in-process cache for data read on almost every request (settings,
 * the business profile) and data a price search reads once per car (price
 * rules, rate plans, taxes, opening hours). Keeps the promise, so callers
 * at the same moment share one query. Off in tests (each test rolls its
 * data back). Per server: clear it on save (forget) and keep TTLs short, so
 * a second server catches up within the TTL. Treat what it returns as
 * read-only - it's shared.
 */
export function memo<T>(key: string, ttlMs: number, load: () => PromiseLike<T>): Promise<T> {
  if (app.inTest) return Promise.resolve().then(load)
  const hit = store.get(key)
  if (hit && Date.now() - hit.at < hit.ttl) return hit.value as Promise<T>
  // Resolved once here: a Lucid query builder runs again every time it's awaited
  const value = Promise.resolve().then(load)
  store.set(key, { at: Date.now(), ttl: ttlMs, value })
  // A failed load isn't kept
  value.catch(() => store.get(key)?.value === value && store.delete(key))
  return value
}

/** Drop cached entries whose key starts with the prefix. */
export function forget(prefix: string) {
  for (const key of store.keys()) if (key.startsWith(prefix)) store.delete(key)
}

/** The business profile (one row), cached 30 seconds; read-only - load it fresh to change it. */
export function currentBusiness() {
  return memo('business', 30_000, () => Business.query().first())
}

/** How long price-search reference data is shared: enough for one search, not to notice edits */
export const PRICING_TTL = 3_000
