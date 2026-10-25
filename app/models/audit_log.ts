import { AuditLogSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import { withUlid } from '#models/mixins/with_ulid'

// jsonb columns: encode explicitly so arrays inside snapshots aren't sent as
// Postgres arrays by the pg driver.
const json = {
  prepare: (value: unknown) =>
    value === null || value === undefined ? null : JSON.stringify(value),
}

export default class AuditLog extends compose(AuditLogSchema, withUlid) {
  @column(json)
  declare before: Record<string, unknown> | null

  @column(json)
  declare after: Record<string, unknown> | null

  @column(json)
  declare metadata: Record<string, unknown> | null

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
