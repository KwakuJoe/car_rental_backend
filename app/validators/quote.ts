import vine from '@vinejs/vine'
import { DRIVE_TYPES } from '#models/rate_plan'

export const quoteValidator = vine.create({
  carId: vine.string(),
  // ISO date-times, e.g. "2026-12-20T09:00" (business time zone) - parsed in the controller
  pickupAt: vine.string().trim(),
  returnAt: vine.string().trim(),
  driveType: vine.enum(DRIVE_TYPES),
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
  // Omit for the default plan; null for no plan
  protectionPlanId: vine.string().nullable().optional(),
  deliveryZoneId: vine.string().nullable().optional(),
  collectionZoneId: vine.string().nullable().optional(),
})
