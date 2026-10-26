import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import type Booking from '#models/booking'
import BookingExtra from '#models/booking_extra'
import BookingModification, { type ModificationType } from '#models/booking_modification'
import Business from '#models/business'
import Car from '#models/car'
import CarAllocation from '#models/car_allocation'
import Driver from '#models/driver'
import type User from '#models/user'
import AuditService from '#services/audit_service'
import BookingService, { BookingError } from '#services/bookings/booking_service'
import DriverService from '#services/bookings/driver_service'
import PricingService, {
  type Quote,
  type QuoteInput,
  QuoteError,
} from '#services/pricing/pricing_service'
import SettingsService from '#services/settings/settings_service'

export type ModificationInput = {
  type: ModificationType
  pickupAt?: string
  returnAt?: string
  carId?: string
  /** swap_car: 'none' keeps the agreed price (e.g. our car broke down), 'difference' re-prices */
  charge?: 'none' | 'difference'
  reason?: string | null
}

/** What a change would do - shown to staff before they save it. */
export type ModificationPlan = {
  type: ModificationType
  before: { pickupAt: string; returnAt: string; carId: string; totalAmount: number }
  after: { pickupAt: string; returnAt: string; carId: string; totalAmount: number }
  priceDifference: number
  quote: Quote | null
  /** Re-price the whole booking (snapshot + amounts) instead of adding to it */
  replacesPrice: boolean
  warnings: { code: string; message: string }[]
}

const ALLOWED: Record<ModificationType, string[]> = {
  extend: ['pending', 'confirmed', 'on_rent'],
  change_dates: ['pending', 'confirmed'],
  swap_car: ['pending', 'confirmed'],
  early_return: ['on_rent'],
}

const NAMES: Record<ModificationType, string> = {
  extend: 'extended',
  change_dates: 'given new dates',
  swap_car: 'given another car',
  early_return: 'returned early',
}

/** Quote warnings that stop a change, as when booking (M3.5) */
const BLOCKING: Record<string, string> = {
  min_rental_days: 'returnAt',
  max_rental_days: 'returnAt',
  pickup_closure: 'pickupAt',
  return_closure: 'returnAt',
  pickup_after_hours: 'pickupAt',
  return_after_hours: 'returnAt',
}

/**
 * Extend, change dates, swap the car, return early (M3.8). Every change goes
 * through the quote engine and is recorded in booking_modifications with
 * before / after and the price difference (posted to the folio in Phase 5).
 * The car's (and driver's) allocation moves in the same transaction, so the
 * exclusion constraints still make a clash impossible.
 */
export default class ModificationService {
  static async plan(booking: Booking, input: ModificationInput): Promise<ModificationPlan> {
    if (!ALLOWED[input.type].includes(booking.status)) {
      const status = booking.status.replaceAll('_', ' ')
      throw new BookingError(
        'type',
        input.type === 'early_return'
          ? 'Only a car that is out on rent can come back early.'
          : `A ${status} booking can't be ${NAMES[input.type]}.`
      )
    }
    const business = await Business.query().first()
    const zone = business?.timezone || 'Africa/Accra'
    const parse = (value: string | undefined, field: string) => {
      const parsed = value ? DateTime.fromISO(value, { zone }) : null
      if (!parsed?.isValid) throw new BookingError(field, 'Enter a valid date and time.')
      return parsed
    }
    const extras = await BookingExtra.query().where('booking_id', booking.id)
    const base: Omit<QuoteInput, 'carId' | 'pickupAt' | 'returnAt'> = {
      driveType: booking.driveType as QuoteInput['driveType'],
      outOfTown: booking.outOfTown,
      driverNightsAway: booking.driverNightsAway,
      extras: extras
        .filter((extra) => extra.extraId)
        .map((extra) => ({ extraId: extra.extraId!, quantity: extra.quantity })),
      protectionPlanId: booking.protectionPlanId,
      excludeBookingId: booking.id,
    }
    const before = {
      pickupAt: booking.pickupAt.toISO()!,
      returnAt: booking.returnAt.toISO()!,
      carId: booking.carId,
      totalAmount: booking.totalAmount,
    }
    const quote = async (request: QuoteInput) => {
      try {
        const result = await PricingService.quote(request)
        const warnings = []
        for (const warning of result.warnings) {
          if (warning.code === 'unavailable') {
            throw new BookingError(
              request.carId === booking.carId ? 'returnAt' : 'carId',
              'The car is booked by someone else for that time.',
              409,
              'E_CAR_UNAVAILABLE'
            )
          }
          if (warning.code === 'lead_time') continue
          const field = BLOCKING[warning.code]
          if (field) throw new BookingError(field, warning.message)
          warnings.push(warning)
        }
        return { result, warnings }
      } catch (error) {
        if (error instanceof QuoteError) throw new BookingError(error.field, error.message)
        throw error
      }
    }

    if (input.type === 'extend') {
      const returnAt = parse(input.returnAt, 'returnAt')
      if (returnAt <= booking.returnAt) {
        throw new BookingError('returnAt', 'The new return must be later than the current one.')
      }
      // Extra days at TODAY's rates and rules (decided with the owner)
      const { result, warnings } = await quote({
        ...base,
        carId: booking.carId,
        pickupAt: booking.returnAt,
        returnAt,
        collectionZoneId: booking.collectionZoneId,
        extension: true,
      })
      return {
        type: 'extend',
        before,
        after: {
          ...before,
          returnAt: returnAt.toISO()!,
          totalAmount: booking.totalAmount + result.total,
        },
        priceDifference: result.total,
        quote: result,
        replacesPrice: false,
        warnings,
      }
    }

    if (input.type === 'change_dates' || input.type === 'swap_car') {
      const pickupAt =
        input.type === 'change_dates' ? parse(input.pickupAt, 'pickupAt') : booking.pickupAt
      const returnAt =
        input.type === 'change_dates' ? parse(input.returnAt, 'returnAt') : booking.returnAt
      if (input.type === 'change_dates' && pickupAt < DateTime.now().minus({ hours: 1 })) {
        throw new BookingError('pickupAt', 'The pickup time is in the past.')
      }
      const carId = input.type === 'swap_car' ? input.carId : booking.carId
      if (!carId) throw new BookingError('carId', 'Choose the new car.')
      if (input.type === 'swap_car' && carId === booking.carId) {
        throw new BookingError('carId', 'Choose a different car.')
      }
      if (input.type === 'swap_car' && !input.reason) {
        throw new BookingError('reason', 'Say why the car is being swapped.')
      }
      const { result, warnings } = await quote({
        ...base,
        carId,
        pickupAt,
        returnAt,
        deliveryZoneId: booking.deliveryZoneId,
        collectionZoneId: booking.collectionZoneId,
        discountAmount: booking.discountAmount || undefined,
      })
      const keepPrice = input.type === 'swap_car' && (input.charge ?? 'none') === 'none'
      const difference = keepPrice ? 0 : result.total - booking.totalAmount
      return {
        type: input.type,
        before,
        after: {
          pickupAt: pickupAt.toISO()!,
          returnAt: returnAt.toISO()!,
          carId,
          totalAmount: booking.totalAmount + difference,
        },
        priceDifference: difference,
        quote: result,
        replacesPrice: !keepPrice,
        warnings: keepPrice
          ? [...warnings, { code: 'price_kept', message: 'The agreed price stays the same.' }]
          : warnings,
      }
    }

    // early_return
    const returnAt = input.returnAt
      ? parse(input.returnAt, 'returnAt')
      : DateTime.now().setZone(zone)
    if (returnAt >= booking.returnAt) {
      throw new BookingError('returnAt', 'An early return must be before the booked return.')
    }
    if (returnAt < booking.pickupAt)
      throw new BookingError('returnAt', 'The return is before the pickup.')
    const policy = await SettingsService.get('booking.early_return_refund')
    let refund = 0
    if (policy === 'unused_days') {
      const rental = booking.priceSnapshot.lines.find((line) => line.type === 'rental')?.amount ?? 0
      const dayAmount = Math.round(rental / Math.max(1, booking.priceSnapshot.rentalDays))
      const unusedDays = Math.floor(booking.returnAt.diff(returnAt, 'days').days)
      refund = dayAmount * unusedDays
    }
    return {
      type: 'early_return',
      before,
      after: { ...before, returnAt: returnAt.toISO()!, totalAmount: booking.totalAmount - refund },
      priceDifference: -refund,
      quote: null,
      replacesPrice: false,
      warnings:
        policy === 'none'
          ? [
              {
                code: 'no_refund',
                message: 'No refund for the unused time (Settings → Business rules).',
              },
            ]
          : [],
    }
  }

  static async apply(ctx: HttpContext, booking: Booking, input: ModificationInput, user: User) {
    const plan = await this.plan(booking, input)
    const buffer = await SettingsService.get('booking.turnaround_buffer_minutes')
    const pickupAt = DateTime.fromISO(plan.after.pickupAt)
    const returnAt = DateTime.fromISO(plan.after.returnAt)
    if (booking.driverId) {
      const driver = await Driver.findOrFail(booking.driverId)
      if (driver.licenceExpiresOn < returnAt.startOf('day')) {
        throw new BookingError(
          'returnAt',
          `${driver.fullName}'s licence expires on ${driver.licenceExpiresOn.toFormat('d LLL yyyy')} - change the driver first.`
        )
      }
    }

    try {
      return await db.transaction(async (trx) => {
        // The car first: the exclusion constraint refuses a clash right here
        await CarAllocation.query({ client: trx })
          .where('booking_id', booking.id)
          .where('active', true)
          .update({
            car_id: plan.after.carId,
            starts_at: pickupAt.toSQL(),
            ends_at: returnAt.toSQL(),
            ends_at_with_buffer: returnAt.plus({ minutes: buffer }).toSQL(),
            updated_at: new Date(),
          })
        await DriverService.move(booking, pickupAt, returnAt, trx)

        booking.useTransaction(trx)
        booking.pickupAt = pickupAt
        booking.returnAt = returnAt
        if (plan.after.carId !== booking.carId) {
          const car = await Car.findOrFail(plan.after.carId, { client: trx })
          booking.carId = car.id
          booking.categoryId = car.categoryId
        }
        if (plan.replacesPrice && plan.quote) {
          booking.priceSnapshot = plan.quote
          booking.subtotalAmount = plan.quote.subtotal + booking.discountAmount
          booking.taxAmount = plan.quote.taxTotal
          booking.totalAmount = plan.quote.total
          booking.depositAmount = plan.quote.deposit
          // Extras re-priced for the new length
          const extras = await BookingExtra.query({ client: trx }).where('booking_id', booking.id)
          const rows = await BookingService.extraRows(
            extras
              .filter((extra) => extra.extraId)
              .map((extra) => ({ extraId: extra.extraId!, quantity: extra.quantity })),
            plan.quote.rentalDays
          )
          for (const extra of extras) {
            const row = rows.find((candidate) => candidate.extraId === extra.extraId)
            if (row) {
              extra.useTransaction(trx)
              extra.merge({ unitAmount: row.unitAmount, totalAmount: row.totalAmount })
              await extra.save()
            }
          }
        } else if (plan.type === 'extend' && plan.quote) {
          // Extension: added on top of what was agreed
          booking.subtotalAmount += plan.quote.subtotal
          booking.taxAmount += plan.quote.taxTotal
          booking.totalAmount += plan.quote.total
        } else {
          // Early return refund (or 0); a swap at the agreed price changes nothing
          booking.totalAmount += plan.priceDifference
        }
        booking.balanceAmount = booking.totalAmount - booking.paidAmount
        await booking.save()

        const modification = await BookingModification.create(
          {
            bookingId: booking.id,
            type: plan.type,
            before: plan.before,
            after: plan.after,
            priceDifferenceAmount: plan.priceDifference,
            quote: plan.quote as unknown as Record<string, unknown> | null,
            reason: input.reason ?? null,
            createdBy: user.id,
          },
          { client: trx }
        )
        await AuditService.record(
          ctx,
          {
            action: 'booking.modified',
            subject: { type: 'booking', id: booking.id, label: booking.reference },
            before: plan.before,
            after: plan.after,
            metadata: {
              type: plan.type,
              priceDifference: plan.priceDifference,
              reason: input.reason ?? null,
            },
          },
          trx
        )
        return { booking, modification, plan }
      })
    } catch (error: any) {
      if (error.code === '23P01' && error.message?.includes('car_allocations_no_overlap')) {
        throw new BookingError(
          plan.type === 'swap_car' ? 'carId' : 'returnAt',
          'The car is booked by someone else for that time.',
          409,
          'E_CAR_UNAVAILABLE'
        )
      }
      throw error
    }
  }
}
