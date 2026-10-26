import { BlacklistEntrySchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Customer from '#models/customer'
import User from '#models/user'
import { withUlid } from '#models/mixins/with_ulid'

export const BLACKLIST_REASONS = [
  'unpaid_balance',
  'damage',
  'fraud',
  'violence',
  'late_returns',
  'other',
] as const
/** warn: booking allowed with a visible warning; block: refused unless a manager overrides */
export const BLACKLIST_SEVERITIES = ['warn', 'block'] as const
export type BlacklistSeverity = (typeof BLACKLIST_SEVERITIES)[number]

export default class BlacklistEntry extends compose(BlacklistEntrySchema, withUlid) {
  @belongsTo(() => Customer)
  declare customer: BelongsTo<typeof Customer>

  @belongsTo(() => User, { foreignKey: 'addedBy' })
  declare adder: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'liftedBy' })
  declare lifter: BelongsTo<typeof User>
}
