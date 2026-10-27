import vine from '@vinejs/vine'

/** "2026-12-21T09:00" - local time in the business's timezone */
const localDateTime = () =>
  vine
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)

const driveType = () => vine.enum(['self_drive', 'chauffeur'] as const)

/** What a trip is made of: the car, dates and options (website quote + booking). */
const tripFields = () => ({
  carId: vine.string().maxLength(26),
  pickupAt: localDateTime(),
  returnAt: localDateTime(),
  driveType: driveType(),
  outOfTown: vine.boolean().optional(),
  driverNightsAway: vine.number().withoutDecimals().min(0).max(30).optional(),
  extras: vine
    .array(
      vine.object({
        extraId: vine.string().maxLength(26),
        quantity: vine.number().withoutDecimals().min(1).max(10),
      })
    )
    .maxLength(20)
    .optional(),
  protectionPlanId: vine.string().maxLength(26).nullable().optional(),
  deliveryZoneId: vine.string().maxLength(26).nullable().optional(),
  collectionZoneId: vine.string().maxLength(26).nullable().optional(),
})

/** GET /public/cars - dates are optional (without them: "from GHS x / day") */
export const publicCarsValidator = vine.create({
  pickupAt: localDateTime().optional(),
  returnAt: localDateTime().optional(),
  driveType: driveType().optional(),
  categoryId: vine.string().maxLength(26).optional(),
  transmission: vine.enum(['auto', 'manual'] as const).optional(),
  seats: vine.number().withoutDecimals().min(1).max(60).optional(),
  sort: vine.enum(['price_asc', 'price_desc'] as const).optional(),
})

/** GET /public/cars/:id - priced when the trip's dates are given */
export const publicCarValidator = vine.create({
  pickupAt: localDateTime().optional(),
  returnAt: localDateTime().optional(),
  driveType: driveType().optional(),
})

export const publicQuoteValidator = vine.create(tripFields())

export const publicBookingValidator = vine.create({
  ...tripFields(),
  deliveryAddress: vine.string().trim().maxLength(255).nullable().optional(),
  collectionAddress: vine.string().trim().maxLength(255).nullable().optional(),
  destination: vine.string().trim().maxLength(255).nullable().optional(),
  paymentPlan: vine.enum(['deposit', 'full'] as const),
  acceptTerms: vine.accepted(),
  customer: vine.object({
    fullName: vine.string().trim().minLength(2).maxLength(120),
    phone: vine.string().trim().maxLength(20),
    email: vine.string().trim().email().maxLength(254).nullable().optional(),
    dateOfBirth: vine.date({ formats: ['YYYY-MM-DD'] }),
  }),
  // Honeypot: hidden on the form, so only a bot fills it in
  website: vine.string().maxLength(0).optional(),
})

/** POST /public/bookings/:token/payments - "I've paid" */
export const publicPaymentValidator = vine.create({
  method: vine.enum(['momo', 'bank_transfer'] as const),
  transactionRef: vine.string().trim().minLength(3).maxLength(80),
  payerName: vine.string().trim().maxLength(120).nullable().optional(),
  amount: vine.number().withoutDecimals().min(1).max(100_000_000).nullable().optional(),
  proofFileId: vine.string().maxLength(26).nullable().optional(),
})

/** POST /public/bookings/lookup - the link is sent to the phone on record */
export const publicLookupValidator = vine.create({
  reference: vine.string().trim().toUpperCase().maxLength(30),
  phone: vine.string().trim().maxLength(20),
})
