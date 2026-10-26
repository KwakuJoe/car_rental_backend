import vine from '@vinejs/vine'
import { CHARGE_TYPES, TAX_CALCULATIONS } from '#models/tax'

export const taxValidator = vine.create({
  name: vine.string().trim().minLength(2).maxLength(100),
  description: vine.string().trim().maxLength(1000).nullable().optional(),
  // basis points: 1500 = 15%; up to 100%
  rateBp: vine.number().withoutDecimals().min(1).max(10_000),
  calculation: vine.enum(TAX_CALCULATIONS).optional(),
  appliesTo: vine.array(vine.enum(CHARGE_TYPES)).minLength(1).distinct(),
  effectiveFrom: vine
    .date({ formats: ['YYYY-MM-DD'] })
    .nullable()
    .optional(),
  effectiveTo: vine
    .date({ formats: ['YYYY-MM-DD'] })
    .afterOrSameAs('effectiveFrom')
    .nullable()
    .optional(),
  sortOrder: vine.number().withoutDecimals().min(0).max(9999).optional(),
  active: vine.boolean().optional(),
})
