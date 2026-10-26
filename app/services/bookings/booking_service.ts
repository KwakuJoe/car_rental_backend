import type { HttpContext } from '@adonisjs/core/http'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import db from '@adonisjs/lucid/services/db'
import type { Infer } from '@vinejs/vine/types'
import { DateTime } from 'luxon'
import Booking, { type BookingStatus } from '#models/booking'
import BookingExtra from '#models/booking_extra'
import Business from '#models/business'
import CarAllocation from '#models/car_allocation'
import DriverAllocation from '#models/driver_allocation'
import Category from '#models/category'
import Customer from '#models/customer'
import CustomerIdentity, { LICENCE_TYPES } from '#models/customer_identity'
import Extra from '#models/extra'
import type User from '#models/user'
import VehicleDocument from '#models/vehicle_document'
import AuditService from '#services/audit_service'
import CancellationService from '#services/bookings/cancellation_service'
import NumberingService from '#services/numbering_service'
import PricingService, { type Quote, QuoteError } from '#services/pricing/pricing_service'
import SettingsService from '#services/settings/settings_service'
import { userCan } from '#helpers/permissions'
import type { createBookingValidator } from '#validators/booking'

export type CreateBookingPayload = Infer<typeof createBookingValidator>
export type BookingWarning = { code: string; message: string }

/** A booking can't be made / changed: 422 with the field to fix, or 409 when the car is taken. */
export class BookingError extends Error {
  constructor(
    public field: string,
    message: string,
    public status: 409 | 422 = 422,
    public code = 'E_BOOKING'
  ) {
    super(message)
  }
}

/** The only status changes allowed (the full machine is in modules.txt M3.5). */
const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  draft: ['pending', 'confirmed', 'cancelled'],
  pending: ['confirmed', 'cancelled', 'expired', 'no_show'],
  confirmed: ['on_rent', 'cancelled', 'no_show'],
  on_rent: ['returned'],
  returned: ['closed'],
  closed: [],
  cancelled: [],
  no_show: [],
  expired: [],
}

/** Quote warnings that stop a booking (the rest are shown to staff) */
const BLOCKING_WARNINGS: Record<string, string> = {
  min_rental_days: 'returnAt',
  max_rental_days: 'returnAt',
  pickup_closure: 'pickupAt',
  return_closure: 'returnAt',
  pickup_after_hours: 'pickupAt',
  return_after_hours: 'returnAt',
}

const label = (booking: Booking) => booking.reference

export default class BookingService {
  /**
   * Staff booking (M3.5): price through the quote engine (never a second
   * calculation), check the customer and driver, then save the booking, its
   * extras and the car's allocation in one transaction - the exclusion
   * constraint on car_allocations refuses a clash even under concurrency.
   */
  static async create(ctx: HttpContext, payload: CreateBookingPayload, user: User) {
    const warnings: BookingWarning[] = []
    const overrides: string[] = []
    const canOverride = await userCan(user, 'bookings.override')
    const needsOverride = (field: string, message: string, what: string) => {
      if (canOverride && payload.overrideReason) {
        overrides.push(what)
        return
      }
      throw new BookingError(
        field,
        canOverride
          ? `${message} Give an override reason to go ahead.`
          : `${message} A manager can override this.`
      )
    }

    const business = await Business.query().first()
    const zone = business?.timezone || 'Africa/Accra'
    const pickupAt = DateTime.fromISO(payload.pickupAt, { zone })
    const returnAt = DateTime.fromISO(payload.returnAt, { zone })
    if (!pickupAt.isValid) throw new BookingError('pickupAt', 'Enter a valid pickup date and time.')
    if (!returnAt.isValid) throw new BookingError('returnAt', 'Enter a valid return date and time.')
    if (pickupAt < DateTime.now().minus({ hours: 1 })) {
      throw new BookingError('pickupAt', 'The pickup time is in the past.')
    }

    // ── Customer ──────────────────────────────────────────────────
    const customer = await Customer.find(payload.customerId)
    if (!customer || customer.archivedAt) {
      throw new BookingError('customerId', 'Choose a customer.')
    }
    if (customer.blacklistSeverity === 'block') {
      needsOverride('customerId', `${customer.fullName} is blacklisted.`, 'blacklist')
    } else if (customer.blacklistSeverity === 'warn') {
      warnings.push({
        code: 'blacklist_warn',
        message: `${customer.fullName} has a blacklist warning - check the customer page.`,
      })
    }

    // ── Price (the single calculation) ────────────────────────────
    const discountAmount = payload.discountAmount ?? 0
    if (discountAmount > 0 && !payload.discountReason) {
      throw new BookingError('discountReason', 'Say why the discount is given.')
    }
    let quote: Quote
    try {
      quote = await PricingService.quote({
        carId: payload.carId,
        pickupAt,
        returnAt,
        driveType: payload.driveType,
        outOfTown: payload.outOfTown,
        driverNightsAway: payload.driverNightsAway,
        extras: payload.extras,
        protectionPlanId: payload.protectionPlanId,
        deliveryZoneId: payload.deliveryZoneId,
        collectionZoneId: payload.collectionZoneId,
        discountAmount,
      })
    } catch (error) {
      if (error instanceof QuoteError) throw new BookingError(error.field, error.message)
      throw error
    }
    for (const warning of quote.warnings) {
      if (warning.code === 'unavailable') {
        throw new BookingError(
          'carId',
          'This car is not available for these dates.',
          409,
          'E_CAR_UNAVAILABLE'
        )
      }
      if (warning.code === 'lead_time') continue // staff may book at short notice
      const field = BLOCKING_WARNINGS[warning.code]
      if (field) throw new BookingError(field, warning.message)
      warnings.push(warning)
    }

    const rental = quote.lines.find((line) => line.type === 'rental')!.amount
    const limit = await SettingsService.get('booking.staff_discount_limit_percent')
    if (discountAmount > Math.floor((rental * limit) / 100)) {
      needsOverride(
        'discountAmount',
        `Discounts above ${limit}% of the rental need a manager.`,
        'discount'
      )
    }

    // ── Driver (self-drive) ───────────────────────────────────────
    const category = await Category.findOrFail(quote.car.category.id)
    if (payload.driveType === 'self_drive') {
      const minAge =
        category.minDriverAgeOverride ?? (await SettingsService.get('booking.min_driver_age'))
      if (!customer.dateOfBirth) {
        warnings.push({
          code: 'no_date_of_birth',
          message: `Add ${customer.fullName}'s date of birth - drivers must be at least ${minAge}.`,
        })
      } else {
        const age = Math.floor(pickupAt.diff(customer.dateOfBirth, 'years').years)
        if (age < minAge) {
          needsOverride(
            'customerId',
            `Drivers of a ${category.name} must be at least ${minAge}.`,
            'driver_age'
          )
        }
      }
      const licences = await CustomerIdentity.query()
        .where('customer_id', customer.id)
        .whereIn('type', [...LICENCE_TYPES])
        .whereNot('status', 'rejected')
        .orderBy('expires_on', 'desc')
      const licence = licences[0]
      if (!licence) {
        warnings.push({
          code: 'no_licence',
          message: 'No driving licence on file - add it before the car is handed over.',
        })
      } else {
        if (licence.expiresOn && licence.expiresOn < returnAt.startOf('day')) {
          warnings.push({
            code: 'licence_expires',
            message: `The driving licence expires on ${licence.expiresOn.toFormat('d LLL yyyy')}, before the return.`,
          })
        }
        const minYears = await SettingsService.get('booking.min_licence_years')
        if (licence.issuedOn && pickupAt.diff(licence.issuedOn, 'years').years < minYears) {
          warnings.push({
            code: 'licence_years',
            message: `The licence is less than ${minYears} years old.`,
          })
        }
      }
    }

    // ── Car documents valid through the return ─────────────────────
    for (const type of ['roadworthy', 'insurance']) {
      const document = await VehicleDocument.query()
        .where('car_id', payload.carId)
        .where('type', type)
        .orderBy('expires_on', 'desc')
        .first()
      if (document?.expiresOn && document.expiresOn < returnAt.startOf('day')) {
        warnings.push({
          code: `car_${type}_expires`,
          message: `The car's ${type} expires on ${document.expiresOn.toFormat('d LLL yyyy')}, before the return.`,
        })
      }
    }

    // ── Save: booking + extras + allocation, one transaction ───────
    const confirm = payload.confirm ?? false
    const buffer = await SettingsService.get('booking.turnaround_buffer_minutes')
    const holdHours = await SettingsService.get('booking.staff_hold_hours')
    const extras = await this.extraRows(payload.extras ?? [], quote.rentalDays)

    try {
      const booking = await db.transaction(async (trx) => {
        const created = await Booking.create(
          {
            reference: await NumberingService.next('booking', trx),
            branchId: customer.branchId,
            customerId: customer.id,
            carId: quote.car.id,
            categoryId: category.id,
            source: payload.source,
            driveType: payload.driveType,
            status: confirm ? 'confirmed' : 'pending',
            pickupAt,
            returnAt,
            deliveryZoneId: payload.deliveryZoneId ?? null,
            deliveryAddress: payload.deliveryAddress ?? null,
            collectionZoneId: payload.collectionZoneId ?? null,
            collectionAddress: payload.collectionAddress ?? null,
            outOfTown: payload.driveType === 'chauffeur' && !!payload.outOfTown,
            driverNightsAway: payload.driverNightsAway ?? 0,
            destination: payload.destination ?? null,
            protectionPlanId: quote.protection?.id ?? null,
            holdExpiresAt: confirm ? null : DateTime.now().plus({ hours: holdHours }),
            priceSnapshot: quote,
            subtotalAmount: quote.subtotal + discountAmount,
            discountAmount,
            discountReason: discountAmount > 0 ? payload.discountReason! : null,
            taxAmount: quote.taxTotal,
            totalAmount: quote.total,
            depositAmount: quote.deposit,
            reservationFeeAmount: quote.reservationFee,
            paidAmount: 0,
            balanceAmount: quote.total,
            overrideReason: overrides.length ? payload.overrideReason! : null,
            overrideBy: overrides.length ? user.id : null,
            confirmedAt: confirm ? DateTime.now() : null,
            confirmedBy: confirm ? user.id : null,
            notes: payload.notes ?? null,
            createdBy: user.id,
          },
          { client: trx }
        )
        for (const extra of extras) {
          await BookingExtra.create({ ...extra, bookingId: created.id }, { client: trx })
        }
        await CarAllocation.create(
          {
            carId: created.carId,
            bookingId: created.id,
            source: confirm ? 'booking' : 'hold',
            startsAt: pickupAt,
            endsAt: returnAt,
            endsAtWithBuffer: returnAt.plus({ minutes: buffer }),
            bufferMinutes: buffer,
            active: true,
            createdBy: user.id,
          },
          { client: trx }
        )
        await AuditService.record(
          ctx,
          {
            action: 'booking.created',
            subject: { type: 'booking', id: created.id, label: created.reference },
            after: {
              status: created.status,
              customer: customer.fullName,
              car: `${quote.car.name} (${quote.car.registrationNo})`,
              pickupAt: pickupAt.toISO(),
              returnAt: returnAt.toISO(),
              total: created.totalAmount,
              discount: discountAmount,
            },
            metadata: overrides.length
              ? { overrides, overrideReason: payload.overrideReason }
              : undefined,
          },
          trx
        )
        return created
      })
      return { booking, warnings }
    } catch (error: any) {
      // 23P01: exclusion_violation - someone else took the car first
      if (error.code === '23P01' || error.message?.includes('car_allocations_no_overlap')) {
        throw new BookingError(
          'carId',
          'This car was just booked for these dates - choose another.',
          409,
          'E_CAR_UNAVAILABLE'
        )
      }
      throw error
    }
  }

  /** Snapshot rows for the extras (name and price as booked). */
  static async extraRows(chosen: { extraId: string; quantity: number }[], days: number) {
    const rows = []
    for (const { extraId, quantity } of chosen) {
      const extra = await Extra.findOrFail(extraId)
      const units = quantity * (extra.chargeType === 'per_day' ? days : 1)
      rows.push({
        extraId: extra.id,
        name: extra.name,
        quantity,
        unitAmount: extra.amount,
        totalAmount: extra.amount * units,
      })
    }
    return rows
  }

  static assertTransition(booking: Booking, to: BookingStatus) {
    if (!TRANSITIONS[booking.status].includes(to)) {
      throw new BookingError(
        'status',
        `A ${booking.status.replaceAll('_', ' ')} booking can't be ${to === 'confirmed' ? 'confirmed' : to.replaceAll('_', ' ')}.`
      )
    }
  }

  /** Frees the car and the driver (cancel, no-show, expired hold). */
  private static async releaseCar(booking: Booking, trx: TransactionClientContract) {
    await CarAllocation.query({ client: trx })
      .where('booking_id', booking.id)
      .where('active', true)
      .update({ active: false, updated_at: new Date() })
    await DriverAllocation.query({ client: trx })
      .where('booking_id', booking.id)
      .where('active', true)
      .update({ active: false, updated_at: new Date() })
  }

  /** pending -> confirmed: the hold becomes a booking. */
  static async confirm(ctx: HttpContext, booking: Booking, user: User) {
    this.assertTransition(booking, 'confirmed')
    await db.transaction(async (trx) => {
      booking.useTransaction(trx)
      booking.merge({
        status: 'confirmed',
        holdExpiresAt: null,
        confirmedAt: DateTime.now(),
        confirmedBy: user.id,
      })
      await booking.save()
      await CarAllocation.query({ client: trx })
        .where('booking_id', booking.id)
        .where('active', true)
        .update({ source: 'booking', updated_at: new Date() })
      await AuditService.record(
        ctx,
        {
          action: 'booking.confirmed',
          subject: { type: 'booking', id: booking.id, label: label(booking) },
          before: { status: 'pending' },
          after: { status: 'confirmed' },
        },
        trx
      )
    })
    return booking
  }

  /** Cancel with the policy fee worked out (refunds themselves are Phase 5). */
  static async cancel(ctx: HttpContext, booking: Booking, reason: string, user: User) {
    this.assertTransition(booking, 'cancelled')
    const policy = await CancellationService.evaluate(booking)
    const from = booking.status
    await db.transaction(async (trx) => {
      booking.useTransaction(trx)
      booking.merge({
        status: 'cancelled',
        holdExpiresAt: null,
        cancelledAt: DateTime.now(),
        cancelledBy: user.id,
        cancelReason: reason,
        cancellationFeeAmount: policy.feeAmount,
      })
      await booking.save()
      await this.releaseCar(booking, trx)
      await AuditService.record(
        ctx,
        {
          action: 'booking.cancelled',
          subject: { type: 'booking', id: booking.id, label: label(booking) },
          before: { status: from },
          after: { status: 'cancelled', cancellationFee: policy.feeAmount },
          metadata: { reason, tier: policy.tier, hoursBeforePickup: policy.hoursBeforePickup },
        },
        trx
      )
    })
    return booking
  }

  /** The customer didn't come: allowed a set time after pickup; the late charge applies. */
  static async markNoShow(ctx: HttpContext, booking: Booking, user: User) {
    this.assertTransition(booking, 'no_show')
    const after = await SettingsService.get('cancellation.no_show_after_hours')
    const allowedFrom = booking.pickupAt.plus({ hours: after })
    if (DateTime.now() < allowedFrom) {
      throw new BookingError(
        'status',
        `A booking can be marked as a no-show from ${allowedFrom.setZone(booking.pickupAt.zone).toFormat('d LLL, HH:mm')} (${after} hours after pickup).`
      )
    }
    const policy = await CancellationService.evaluate(booking, { noShow: true })
    const from = booking.status
    await db.transaction(async (trx) => {
      booking.useTransaction(trx)
      booking.merge({
        status: 'no_show',
        holdExpiresAt: null,
        noShowAt: DateTime.now(),
        cancelledBy: user.id,
        cancellationFeeAmount: policy.feeAmount,
      })
      await booking.save()
      await this.releaseCar(booking, trx)
      await AuditService.record(
        ctx,
        {
          action: 'booking.no_show',
          subject: { type: 'booking', id: booking.id, label: label(booking) },
          before: { status: from },
          after: { status: 'no_show', cancellationFee: policy.feeAmount },
        },
        trx
      )
    })
    return booking
  }

  /**
   * Pending bookings past their hold expire and free their car. Run from cron
   * (`node ace bookings:expire-holds`, every 5 minutes). Safe to re-run.
   */
  static async expireHolds(now = DateTime.now()): Promise<number> {
    const due = await Booking.query()
      .where('status', 'pending')
      .whereNotNull('hold_expires_at')
      .where('hold_expires_at', '<', now.toSQL()!)
    for (const booking of due) {
      await db.transaction(async (trx) => {
        booking.useTransaction(trx)
        booking.status = 'expired'
        await booking.save()
        await this.releaseCar(booking, trx)
        await AuditService.record(
          null,
          {
            action: 'booking.expired',
            subject: { type: 'booking', id: booking.id, label: label(booking) },
            before: { status: 'pending' },
            after: { status: 'expired' },
          },
          trx
        )
      })
    }
    return due.length
  }
}
