import vine from '@vinejs/vine'
import { paginationFields } from '#validators/shared'
import { EXTRA_CHARGE_TYPES } from '#models/extra'
import { FEE_UNITS } from '#models/fee'

/** Shared list filter for extras, protection plans, delivery zones and fees. */
export const catalogFilterValidator = vine.create({
  ...paginationFields,
  search: vine.string().trim().optional(),
  active: vine.boolean().optional(),
})

const money = () => vine.number().withoutDecimals().min(0).max(100_000_000)
const common = () => ({
  sortOrder: vine.number().withoutDecimals().min(0).max(9999).optional(),
  active: vine.boolean().optional(),
})

// Factories: VineJS rules mutate the schema, so each validator builds its own.
export const extraValidator = vine.create({
  name: vine.string().trim().minLength(2).maxLength(100),
  description: vine.string().trim().maxLength(1000).nullable().optional(),
  chargeType: vine.enum(EXTRA_CHARGE_TYPES),
  amount: money(),
  maxQuantity: vine.number().withoutDecimals().min(1).max(20).optional(),
  stock: vine.number().withoutDecimals().min(0).max(10_000).nullable().optional(),
  taxable: vine.boolean().optional(),
  availableOnline: vine.boolean().optional(),
  ...common(),
})

export const protectionPlanValidator = vine.create({
  name: vine.string().trim().minLength(2).maxLength(100),
  description: vine.string().trim().maxLength(3000).nullable().optional(),
  perDayAmount: money(),
  excessAmount: money(),
  depositAmountOverride: money().nullable().optional(),
  isDefault: vine.boolean().optional(),
  taxable: vine.boolean().optional(),
  availableOnline: vine.boolean().optional(),
  ...common(),
})

export const deliveryZoneValidator = vine.create({
  name: vine.string().trim().minLength(2).maxLength(100),
  description: vine.string().trim().maxLength(1000).nullable().optional(),
  deliveryAmount: money(),
  collectionAmount: money(),
  afterHoursAmount: money().optional(),
  availableOnline: vine.boolean().optional(),
  ...common(),
})

const feeFields = () => ({
  name: vine.string().trim().minLength(2).maxLength(100),
  description: vine.string().trim().maxLength(1000).nullable().optional(),
  unit: vine.enum(FEE_UNITS),
  // percent: basis points (1000 = 10%), max 100%
  amount: money(),
  taxable: vine.boolean().optional(),
  ...common(),
})

export const createFeeValidator = vine.create({
  code: vine
    .string()
    .trim()
    .regex(/^[a-z][a-z0-9_]{1,58}$/)
    .unique({ table: 'fees', column: 'code' }),
  ...feeFields(),
})

/** Codes never change after creation (check-in looks fees up by code). */
export const updateFeeValidator = vine.create(feeFields())
