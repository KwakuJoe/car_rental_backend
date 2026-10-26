import { PricingRuleSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import { withUlid } from '#models/mixins/with_ulid'

// jsonb: encode explicitly (the pg driver would send arrays as Postgres arrays)
const json = {
  prepare: (value: unknown) =>
    value === null || value === undefined ? null : JSON.stringify(value),
}

export const PRICING_RULE_TYPES = ['season', 'holiday', 'weekend'] as const
export type PricingRuleType = (typeof PRICING_RULE_TYPES)[number]

/** percent: basis points (2500 = +25%); fixed: pesewas per day. Both signed. */
export const ADJUSTMENT_TYPES = ['percent', 'fixed'] as const
export type AdjustmentType = (typeof ADJUSTMENT_TYPES)[number]

export const RULE_TARGETS = ['all', 'categories', 'cars'] as const
export type RuleTarget = (typeof RULE_TARGETS)[number]

export default class PricingRule extends compose(PricingRuleSchema, withUlid) {
  @column(json)
  declare weekdays: number[] | null

  @column(json)
  declare categoryIds: string[] | null

  @column(json)
  declare carIds: string[] | null

  @belongsTo(() => User, { foreignKey: 'createdBy' })
  declare creator: BelongsTo<typeof User>
}
