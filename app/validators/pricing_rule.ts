import vine from '@vinejs/vine'
import { paginationFields } from '#validators/shared'
import { ADJUSTMENT_TYPES, PRICING_RULE_TYPES, RULE_TARGETS } from '#models/pricing_rule'

export const pricingRuleFilterValidator = vine.create({
  ...paginationFields,
  search: vine.string().trim().optional(),
  type: vine.enum(PRICING_RULE_TYPES).optional(),
  active: vine.boolean().optional(),
})

/** Factories: VineJS rules mutate the schema, so each validator builds its own. */
function pricingRuleFields() {
  return {
    name: vine.string().trim().minLength(2).maxLength(120),
    type: vine.enum(PRICING_RULE_TYPES),
    dateFrom: vine
      .date({ formats: ['YYYY-MM-DD'] })
      .nullable()
      .optional(),
    dateTo: vine
      .date({ formats: ['YYYY-MM-DD'] })
      .afterOrSameAs('dateFrom')
      .nullable()
      .optional(),
    recursYearly: vine.boolean().optional(),
    weekdays: vine
      .array(vine.number().withoutDecimals().min(1).max(7))
      .distinct()
      .nullable()
      .optional(),
    adjustmentType: vine.enum(ADJUSTMENT_TYPES),
    // percent: basis points (2500 = +25%); fixed: pesewas per day. Signed.
    adjustmentValue: vine.number().withoutDecimals().min(-100_000_000).max(100_000_000),
    appliesTo: vine.enum(RULE_TARGETS).optional(),
    categoryIds: vine.array(vine.string()).distinct().nullable().optional(),
    carIds: vine.array(vine.string()).distinct().nullable().optional(),
    minRentalDays: vine.number().withoutDecimals().min(1).max(90).nullable().optional(),
    priority: vine.number().withoutDecimals().min(0).max(100).optional(),
    stackable: vine.boolean().optional(),
    blockOnlineBooking: vine.boolean().optional(),
    active: vine.boolean().optional(),
    notes: vine.string().trim().maxLength(1000).nullable().optional(),
  }
}

export const createPricingRuleValidator = vine.create(pricingRuleFields())
export const updatePricingRuleValidator = vine.create(pricingRuleFields())
