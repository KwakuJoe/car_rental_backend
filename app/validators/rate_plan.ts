import vine from '@vinejs/vine'
import { paginationFields } from '#validators/shared'
import { DRIVE_TYPES, MILEAGE_MODES } from '#models/rate_plan'

export const ratePlanFilterValidator = vine.create({
  ...paginationFields,
  categoryId: vine.string().optional(),
  carId: vine.string().optional(),
  driveType: vine.enum(DRIVE_TYPES).optional(),
  active: vine.boolean().optional(),
  // category = category plans only, car = car overrides only
  scope: vine.enum(['category', 'car'] as const).optional(),
})

const amount = () => vine.number().withoutDecimals().min(0).max(100_000_000)
const optionalAmount = () => amount().nullable().optional()

/**
 * Fields shared by create and update. Factories: VineJS rules mutate the
 * schema, so each validator builds its own.
 */
function ratePlanFields() {
  return {
    categoryId: vine.string().exists({ table: 'categories', column: 'id' }),
    carId: vine.string().exists({ table: 'cars', column: 'id' }).nullable().optional(),
    driveType: vine.enum(DRIVE_TYPES),
    dailyAmount: amount().min(1),
    weeklyAmount: optionalAmount(),
    monthlyAmount: optionalAmount(),
    mileageMode: vine.enum(MILEAGE_MODES).optional(),
    includedKmPerDay: vine.number().withoutDecimals().min(1).max(5000).nullable().optional(),
    excessKmAmount: optionalAmount(),
    outOfTownDailyAmount: optionalAmount(),
    driverOvernightAmount: optionalAmount(),
    driverHoursPerDay: vine.number().withoutDecimals().min(1).max(24).nullable().optional(),
    driverOvertimeHourAmount: optionalAmount(),
    fuelIncluded: vine.boolean().optional(),
    effectiveFrom: vine
      .date({ formats: ['YYYY-MM-DD'] })
      .nullable()
      .optional(),
    effectiveTo: vine
      .date({ formats: ['YYYY-MM-DD'] })
      .afterOrSameAs('effectiveFrom')
      .nullable()
      .optional(),
    active: vine.boolean().optional(),
    notes: vine.string().trim().maxLength(1000).nullable().optional(),
  }
}

export const createRatePlanValidator = vine.create(ratePlanFields())
export const updateRatePlanValidator = vine.create(ratePlanFields())
