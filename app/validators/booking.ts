import vine from '@vinejs/vine'
import { BOOKING_SOURCES, BOOKING_STATUSES } from '#models/booking'
import { DRIVE_TYPES } from '#models/rate_plan'
import { paginationFields } from '#validators/shared'

const reason = () => vine.string().trim().minLength(3).maxLength(500)

export const createBookingValidator = vine.create({
  customerId: vine.string(),
  carId: vine.string(),
  // ISO date-times in the business time zone, e.g. "2026-12-20T09:00"
  pickupAt: vine.string().trim(),
  returnAt: vine.string().trim(),
  driveType: vine.enum(DRIVE_TYPES),
  source: vine.enum(BOOKING_SOURCES.filter((source) => source !== 'website')),
  outOfTown: vine.boolean().optional(),
  driverNightsAway: vine.number().withoutDecimals().min(0).max(90).optional(),
  extras: vine
    .array(
      vine.object({
        extraId: vine.string(),
        quantity: vine.number().withoutDecimals().min(1).max(20),
      })
    )
    .optional(),
  // Omit for the default plan; null for none
  protectionPlanId: vine.string().nullable().optional(),
  deliveryZoneId: vine.string().nullable().optional(),
  deliveryAddress: vine.string().trim().maxLength(500).nullable().optional(),
  collectionZoneId: vine.string().nullable().optional(),
  collectionAddress: vine.string().trim().maxLength(500).nullable().optional(),
  destination: vine.string().trim().maxLength(500).nullable().optional(),
  notes: vine.string().trim().maxLength(2000).nullable().optional(),
  // Pesewas off the rental; any discount needs a reason
  discountAmount: vine.number().withoutDecimals().min(0).optional(),
  discountReason: reason().nullable().optional(),
  // Manager only: let a blacklisted customer, an under-age driver or a big discount through
  overrideReason: reason().nullable().optional(),
  // true = confirmed now (staff confirmed / pay at pickup); false = held, waiting
  confirm: vine.boolean().optional(),
})

export const updateBookingValidator = vine.create({
  destination: vine.string().trim().maxLength(500).nullable().optional(),
  notes: vine.string().trim().maxLength(2000).nullable().optional(),
})

export const cancelBookingValidator = vine.create({
  reason: reason(),
})

export const bookingFilterValidator = vine.create({
  ...paginationFields,
  // reference, customer name or phone
  search: vine.string().trim().optional(),
  status: vine.enum(BOOKING_STATUSES).optional(),
  customerId: vine.string().optional(),
  carId: vine.string().optional(),
  source: vine.enum(BOOKING_SOURCES).optional(),
  driveType: vine.enum(DRIVE_TYPES).optional(),
  // pickup date range (YYYY-MM-DD, business time zone)
  dateFrom: vine.date({ formats: ['YYYY-MM-DD'] }).optional(),
  dateTo: vine.date({ formats: ['YYYY-MM-DD'] }).optional(),
  sortBy: vine.enum(['pickupAt', 'createdAt'] as const).optional(),
})

export const availabilityValidator = vine.create({
  // Default: from now, for one day
  from: vine.string().trim().optional(),
  to: vine.string().trim().optional(),
  categoryId: vine.string().optional(),
  driveType: vine.enum(DRIVE_TYPES).optional(),
  search: vine.string().trim().optional(),
})
