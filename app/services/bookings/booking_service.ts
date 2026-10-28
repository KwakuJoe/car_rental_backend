import type { HttpContext } from '@adonisjs/core/http'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import db from '@adonisjs/lucid/services/db'
import type { Infer } from '@vinejs/vine/types'
import { DateTime } from 'luxon'
import Booking, { type BookingSource, type BookingStatus } from '#models/booking'
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
import BookingMessages from '#services/messages/booking_messages'
import StaffAlerts from '#services/messages/staff_alerts'
import CancellationService from '#services/bookings/cancellation_service'
import NumberingService from '#services/numbering_service'
import PricingService, { type Quote, QuoteError } from '#services/pricing/pricing_service'
import SettingsService from '#services/settings/settings_service'
import { userCan } from '#helpers/permissions'
import { formatMoney } from '#helpers/money'
import type { createBookingValidator } from '#validators/booking'

/** What staff send, or what the website sends (source "website", which staff can't pick). */
export type CreateBookingPayload = Omit<Infer<typeof createBookingValidator>, 'source'> & {
  source: BookingSource
}

/** A booking from the public website: no staff, no overrides, the online hold. */
export type CreateOptions = {
  online?: boolean
  /** SHA-256 of the customer's private link secret */
  publicTokenHash?: string
  /** The secret itself, encrypted with APP_KEY (for links in later messages) */
  publicTokenEncrypted?: string
  paymentPlan?: 'deposit' | 'full'
}
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
  static async create(
    ctx: HttpContext | null,
    payload: CreateBookingPayload,
    user: User | null,
    options: CreateOptions = {}
  ) {
    const online = !!options.online
    const warnings: BookingWarning[] = []
    const overrides: string[] = []
    const canOverride = !online && !!user && (await userCan(user, 'bookings.override'))
    const needsOverride = (field: string, message: string, what: string) => {
      if (canOverride && payload.overrideReason) {
        overrides.push(what)
        return
      }
      if (online) {
        // Never tell a website visitor why (a blacklist match is personal data)
        throw new BookingError(
          field,
          what === 'driver_age'
            ? message
            : 'We can’t take this booking online. Please call or WhatsApp us.'
        )
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
      if (warning.code === 'lead_time') {
        // Staff may book at short notice; the website keeps to the notice period
        if (online) throw new BookingError('pickupAt', warning.message)
        continue
      }
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
    // Online bookings wait for their deposit; staff choose
    const confirm = !online && (payload.confirm ?? false)
    const buffer = await SettingsService.get('booking.turnaround_buffer_minutes')
    const holdHours = await SettingsService.get(
      online ? 'booking.online_hold_hours' : 'booking.staff_hold_hours'
    )
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
            overrideBy: overrides.length ? (user?.id ?? null) : null,
            confirmedAt: confirm ? DateTime.now() : null,
            confirmedBy: confirm ? (user?.id ?? null) : null,
            notes: payload.notes ?? null,
            createdBy: user?.id ?? null,
            publicTokenHash: options.publicTokenHash ?? null,
            publicTokenEncrypted: options.publicTokenEncrypted ?? null,
            paymentPlan: online ? (options.paymentPlan ?? 'deposit') : null,
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
            createdBy: user?.id ?? null,
          },
          { client: trx }
        )
        await AuditService.record(
          ctx,
          {
            action: 'booking.created',
            subject: { type: 'booking', id: created.id, label: created.reference },
            ...(online ? { actorType: 'customer' as const, actorLabel: customer.fullName } : {}),
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
      if (booking.status === 'confirmed') await BookingMessages.staffConfirmed(booking)
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
    await db.transaction((trx) => this.confirmWithin(ctx, booking, user.id, trx))
    return booking
  }

  /**
   * The confirmation itself, inside the caller's transaction - also used when
   * a payment covers the reservation fee (`reason` says so in the audit log).
   */
  static async confirmWithin(
    ctx: HttpContext | null,
    booking: Booking,
    userId: string | null,
    trx: TransactionClientContract,
    reason?: string
  ) {
    booking.useTransaction(trx)
    booking.merge({
      status: 'confirmed',
      holdExpiresAt: null,
      confirmedAt: DateTime.now(),
      confirmedBy: userId,
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
        ...(reason ? { metadata: { reason } } : {}),
      },
      trx
    )
    // Phone / walk-in bookings: the customer gets the details once it's saved
    // (awaited by the commit, so the message is stored before the request answers)
    trx.after('commit', () => BookingMessages.staffConfirmed(booking))
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
    await this.alertEnded(booking, 'cancelled', `${user.fullName ?? user.email}: ${reason}`)
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
    await this.alertEnded(booking, 'no_show')
    return booking
  }

  /**
   * Pending bookings past their hold expire and free their car. The queue runs
   * it every 5 minutes (ExpireHoldsJob). Safe to re-run.
   */
  static async expireHolds(now = DateTime.now()): Promise<number> {
    const due = await Booking.query()
      .where('status', 'pending')
      .whereNotNull('hold_expires_at')
      .where('hold_expires_at', '<', now.toSQL()!)
      // A MoMo/bank payment waiting to be checked keeps the car until staff decide
      .whereNotExists((query) =>
        query
          .from('payments')
          .whereColumn('payments.booking_id', 'bookings.id')
          .where('payments.status', 'pending_verification')
      )
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
      if (booking.source === 'website') await BookingMessages.expired(booking)
      await this.alertEnded(booking, 'expired')
    }
    return due.length
  }

  /** Staff alert: a booking ended without a rental (expired hold, cancelled, no-show). */
  private static async alertEnded(
    booking: Booking,
    how: 'expired' | 'cancelled' | 'no_show',
    note?: string
  ) {
    const about = await StaffAlerts.describe(booking)
    const what = { expired: 'expired unpaid', cancelled: 'was cancelled', no_show: 'is a no-show' }[
      how
    ]
    await StaffAlerts.send('booking_ended', {
      bookingId: booking.id,
      sms: `Booking ${booking.reference} ${what}: ${about.customer}, ${about.car}, ${about.pickup}. The car is free again.`,
      email: {
        subject: `Booking ${booking.reference} ${what}`,
        preheader: `${about.customer} - ${about.car}, ${about.pickup}. The car is free again.`,
        eyebrow: {
          text: how === 'expired' ? 'Hold expired' : how === 'cancelled' ? 'Cancelled' : 'No-show',
          color: '#6b7280',
        },
        heading: `${booking.reference} ${what}`,
        paragraphs: [
          how === 'expired'
            ? 'The hold ran out without a payment, so the car was released for other bookings.'
            : how === 'cancelled'
              ? `The booking was cancelled${note ? ` (${note})` : ''}. The car is free again.`
              : 'The customer didn’t come for the car. The late charge in the terms applies.',
          ...(booking.cancellationFeeAmount
            ? [`Kept under the cancellation policy: ${formatMoney(booking.cancellationFeeAmount)}.`]
            : []),
        ],
        details: { rows: about.rows },
        path: `/dashboard/bookings/${booking.id}`,
        buttonLabel: 'Open the booking',
      },
    })
  }

  /**
   * Staff alert: online bookings whose hold ends within 2 hours with nothing
   * paid or sent - a call might still save them. Once per booking; runs in
   * the hold expiry job (ExpireHoldsJob).
   */
  static async warnExpiringHolds(now: DateTime = DateTime.now()): Promise<number> {
    const soon = await Booking.query()
      .where('status', 'pending')
      .whereNotNull('hold_expires_at')
      .where('hold_expires_at', '>', now.toSQL()!)
      .where('hold_expires_at', '<=', now.plus({ hours: 2 }).toSQL()!)
      .whereNotExists((query) =>
        query.from('payments').whereColumn('payments.booking_id', 'bookings.id')
      )
    let warned = 0
    for (const booking of soon) {
      const about = await StaffAlerts.describe(booking)
      const left = Math.max(1, Math.round(booking.holdExpiresAt!.diff(now, 'minutes').minutes))
      warned += await StaffAlerts.send('hold_expiring', {
        bookingId: booking.id,
        oncePerBooking: true,
        sms: `Hold ending: ${booking.reference} (${about.customer}, ${about.phone}) expires in ${left} min with nothing paid. Call them?`,
        email: {
          subject: `Hold ending soon - ${booking.reference} (${about.customer})`,
          preheader: `Expires ${about.hold} with nothing paid yet.`,
          eyebrow: { text: 'Hold ending soon', color: '#d97706' },
          heading: `${about.customer} hasn't paid yet`,
          paragraphs: [
            `The hold on ${booking.reference} ends at ${about.hold} (in about ${left} minutes) and no payment has come in. A quick call to ${about.phone} might save the booking.`,
          ],
          details: { rows: about.rows },
          path: `/dashboard/bookings/${booking.id}`,
          buttonLabel: 'Open the booking',
        },
      })
    }
    return warned
  }

  /**
   * Staff alert: cars out on rent past their return time (plus the grace
   * period in Settings). Once per booking. The queue runs it every 15 minutes
   * (CheckOverdueReturnsJob).
   */
  static async alertOverdueReturns(now: DateTime = DateTime.now()): Promise<number> {
    const grace = await SettingsService.get('booking.return_grace_minutes')
    const late = await Booking.query()
      .where('status', 'on_rent')
      .where('return_at', '<', now.minus({ minutes: grace }).toSQL()!)
    let alerted = 0
    for (const booking of late) {
      const about = await StaffAlerts.describe(booking)
      alerted += await StaffAlerts.send('return_overdue', {
        bookingId: booking.id,
        oncePerBooking: true,
        sms: `Overdue: ${about.car} (${booking.reference}) was due back ${about.returns}. Customer ${about.customer}, ${about.phone}.`,
        email: {
          subject: `Car not returned - ${booking.reference}`,
          preheader: `${about.car} was due back ${about.returns}.`,
          eyebrow: { text: 'Return overdue' },
          heading: `${about.car} is overdue`,
          paragraphs: [
            `It was due back ${about.returns}. Contact ${about.customer} on ${about.phone} - late hours are charged at check-in under the terms.`,
          ],
          details: { rows: about.rows },
          path: `/dashboard/bookings/${booking.id}`,
          buttonLabel: 'Open the booking',
        },
      })
    }
    return alerted
  }
}
