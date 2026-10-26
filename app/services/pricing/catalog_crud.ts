import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import type { LucidModel, LucidRow } from '@adonisjs/lucid/types/model'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import AuditService from '#services/audit_service'

type Row = LucidRow & { id: string; name: string }

/**
 * Shared list / create / update for the pricing catalog (extras, protection
 * plans, delivery zones, fees): search by name, active filter, sort order,
 * and every change audited as `<subject>.<created|updated>`.
 */
export const CatalogCrud = {
  async list<M extends LucidModel>(
    model: M,
    params: { search?: string; active?: boolean; page?: number; limit?: number }
  ) {
    const query = model.query()
    if (params.search) query.whereILike('name', `%${params.search}%`)
    if (params.active !== undefined) query.where('active', params.active)
    return query
      .orderBy('active', 'desc')
      .orderBy('sort_order', 'asc')
      .orderBy('name', 'asc')
      .paginate(params.page ?? 1, params.limit ?? 50)
  },

  async create<M extends LucidModel>(
    ctx: HttpContext,
    model: M,
    subject: string,
    values: Record<string, unknown>,
    before?: (trx: TransactionClientContract) => Promise<void>
  ) {
    return db.transaction(async (trx) => {
      await before?.(trx)
      // Generic over four models, so the attribute types are checked by each validator
      const row = (await model.create(
        { ...values, createdBy: ctx.auth.getUserOrFail().id } as any,
        {
          client: trx,
        }
      )) as unknown as Row
      await AuditService.record(
        ctx,
        {
          action: `${subject}.created`,
          subject: { type: subject, id: row.id, label: row.name },
          after: row.toJSON(),
        },
        trx
      )
      return row
    })
  },

  async update<R extends Row>(
    ctx: HttpContext,
    row: R,
    subject: string,
    values: Record<string, unknown>,
    before?: (trx: TransactionClientContract) => Promise<void>
  ) {
    await db.transaction(async (trx) => {
      await before?.(trx)
      row.useTransaction(trx)
      const previous = row.toJSON()
      row.merge(values as any)
      await row.save()
      await AuditService.record(
        ctx,
        {
          action: `${subject}.updated`,
          subject: { type: subject, id: row.id, label: row.name },
          before: previous,
          after: row.toJSON(),
        },
        trx
      )
    })
    return row
  },
}
