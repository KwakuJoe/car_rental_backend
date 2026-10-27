import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { createHash, randomBytes } from 'node:crypto'
import { DateTime } from 'luxon'
import Booking from '#models/booking'
import Branch from '#models/branch'
import Business from '#models/business'
import Car from '#models/car'
import Category from '#models/category'
import Customer from '#models/customer'
import DeliveryZone from '#models/delivery_zone'
import Extra from '#models/extra'
import File from '#models/file'
import OpeningHour from '#models/opening_hour'
import Payment from '#models/payment'
import ProtectionPlan from '#models/protection_plan'
import RatePlan from '#models/rate_plan'
import TermsVersion from '#models/terms_version'
import encryption from '@adonisjs/core/services/encryption'
import AuditService from '#services/audit_service'
import AvailabilityService from '#services/availability_service'
import BookingService, { BookingError } from '#services/bookings/booking_service'
import { CustomerStatusService } from '#services/customers/customer_status_service'
import BookingMessages from '#services/messages/booking_messages'
import NotificationService from '#services/notification_service'
import PaymentService, { normaliseRef } from '#services/payments/payment_service'
import PricingService, { type Quote, QuoteError } from '#services/pricing/pricing_service'
import SettingsService from '#services/settings/settings_service'
import { normalizePhone } from '#helpers/phone'
import { formatMoney } from '#helpers/money'

export type DriveType = 'self_drive' | 'chauffeur'

export type PublicTrip = {
  carId: string
  pickupAt: string
  returnAt: string
  driveType: DriveType
  outOfTown?: boolean
  driverNightsAway?: number
  extras?: { extraId: string; quantity: number }[]
  /** undefined = the default plan, null = none */
  protectionPlanId?: string | null
  deliveryZoneId?: string | null
  collectionZoneId?: string | null
}

export type PublicBookingInput = PublicTrip & {
  deliveryAddress?: string | null
  collectionAddress?: string | null
  destination?: string | null
  paymentPlan: 'deposit' | 'full'
  customer: { fullName: string; phone: string; email?: string | null; dateOfBirth: DateTime }
}

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex')

/** Statuses an online customer can still pay into */
const PAYABLE = ['pending', 'confirmed', 'on_rent', 'returned']

/**
 * The public website's side of bookings (Phase 7 MVP). Everything a
 * visitor sees goes through here, so nothing private leaks: no
 * registration numbers, VINs, staff names, other customers. Bookings reuse
 * BookingService.create with the online rules (notice period, no
 * overrides, the online hold); payments reuse PaymentService.
 */
export default class PublicBookingService {
  // ── Site ──────────────────────────────────────────────────────────

  /** Business details, opening hours and the online catalogue for the website. */
  static async site() {
    const [business, branch, categories, extras, plans, zones, terms] = await Promise.all([
      Business.query().preload('logo').preload('cover').firstOrFail(),
      Branch.query().where('is_main', true).first(),
      Category.query()
        .where('active', true)
        .whereHas('cars', (cars) => cars.where('is_listed_online', true).where('status', 'active'))
        .orderBy('sort_order', 'asc'),
      Extra.query().where('active', true).where('available_online', true).orderBy('sort_order'),
      ProtectionPlan.query()
        .where('active', true)
        .where('available_online', true)
        .orderBy('sort_order'),
      DeliveryZone.query()
        .where('active', true)
        .where('available_online', true)
        .orderBy('sort_order'),
      TermsVersion.current(),
    ])
    const hours = branch
      ? await OpeningHour.query().where('branch_id', branch.id).orderBy('weekday', 'asc')
      : []
    const [onlineBookings, holdHours, leadHours, minAge, feeType, feePercent, feeAmount] =
      await Promise.all([
        SettingsService.get('booking.online_bookings_enabled'),
        SettingsService.get('booking.online_hold_hours'),
        SettingsService.get('booking.min_lead_hours'),
        SettingsService.get('booking.min_driver_age'),
        SettingsService.get('payment.reservation_fee_type'),
        SettingsService.get('payment.reservation_fee_percent'),
        SettingsService.get('payment.reservation_fee_amount'),
      ])
    return {
      business: {
        name: business.tradingName || business.name,
        email: business.email,
        phone: business.phone,
        whatsappPhone: business.whatsappPhone,
        address: business.address,
        city: business.city,
        region: business.region,
        digitalAddress: business.digitalAddress,
        logoUrl: business.logo?.url ?? null,
        coverUrl: business.cover?.url ?? null,
        currency: business.currency,
        timezone: business.timezone,
        social: {
          instagram: business.instagramUrl,
          facebook: business.facebookUrl,
          tiktok: business.tiktokUrl,
          x: business.xUrl,
        },
      },
      openingHours: hours.map((hour) => ({
        weekday: hour.weekday,
        isClosed: Boolean(hour.isClosed),
        opensAt: hour.opensAt,
        closesAt: hour.closesAt,
      })),
      rules: {
        onlineBookings,
        holdHours,
        leadHours,
        minDriverAge: minAge,
        reservationFee:
          feeType === 'fixed'
            ? { type: 'fixed' as const, amount: feeAmount }
            : { type: 'percent' as const, percent: feePercent },
      },
      categories: categories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        image: category.image,
        seats: category.seats,
      })),
      extras: extras.map((extra) => ({
        id: extra.id,
        name: extra.name,
        description: extra.description,
        amount: extra.amount,
        chargeType: extra.chargeType,
        maxQuantity: extra.maxQuantity,
      })),
      protectionPlans: plans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        description: plan.description,
        perDayAmount: plan.perDayAmount,
        excessAmount: plan.excessAmount,
        isDefault: Boolean(plan.isDefault),
      })),
      deliveryZones: zones.map((zone) => ({
        id: zone.id,
        name: zone.name,
        description: zone.description,
        deliveryAmount: zone.deliveryAmount,
        collectionAmount: zone.collectionAmount,
      })),
      terms: terms ? { version: terms.version, body: terms.body } : null,
    }
  }

  // ── Cars ──────────────────────────────────────────────────────────

  private static carToJson(car: Car) {
    const photos = (car.photos ?? []).slice().sort((a, b) => Number(b.isCover) - Number(a.isCover))
    return {
      id: car.id,
      name: car.publicTitle || `${car.make} ${car.model}`,
      make: car.make,
      model: car.model,
      year: car.year,
      category: { id: car.category.id, name: car.category.name, slug: car.category.slug },
      transmission: car.transmission,
      fuelType: car.fuelType,
      seats: car.seats,
      doors: car.doors,
      luggage: car.luggage,
      features: car.features ?? [],
      description: car.publicDescription,
      selfDriveAllowed: Boolean(car.category.selfDriveAllowed),
      coverUrl: photos[0]?.file?.url ?? null,
      photos: photos.map((photo) => photo.file?.url).filter(Boolean) as string[],
    }
  }

  /** The day price a car starts from (no dates chosen): car plan first, then its category's. */
  private static async fromPrice(car: Car, driveType: DriveType) {
    const today = DateTime.now().toISODate()!
    const plan = await RatePlan.query()
      .where('active', true)
      .where('drive_type', driveType)
      .where((q) =>
        q
          .where('car_id', car.id)
          .orWhere((c) => c.where('category_id', car.categoryId).whereNull('car_id'))
      )
      .where((q) => q.whereNull('effective_from').orWhere('effective_from', '<=', today))
      .where((q) => q.whereNull('effective_to').orWhere('effective_to', '>=', today))
      .orderByRaw('car_id is null') // the car's own plan wins
      .first()
    return plan?.dailyAmount ?? null
  }

  /** The price summary a website card shows for the chosen trip. */
  private static priceToJson(quote: Quote) {
    const rental = quote.lines.find((line) => line.type === 'rental')?.amount ?? 0
    return {
      rentalDays: quote.rentalDays,
      perDay: Math.round(rental / Math.max(1, quote.rentalDays)),
      total: quote.total,
      deposit: quote.deposit,
      reservationFee: quote.reservationFee,
    }
  }

  /** Full breakdown for the car page and the booking steps (no registration number). */
  static quoteToJson(quote: Quote) {
    return {
      ...this.priceToJson(quote),
      pickupAt: quote.pickupAt,
      returnAt: quote.returnAt,
      driveType: quote.driveType,
      tier: quote.tier,
      lines: quote.lines.map((line) => ({
        type: line.type,
        label: line.label,
        quantity: line.quantity,
        unitAmount: line.unitAmount,
        amount: line.amount,
      })),
      subtotal: quote.subtotal,
      taxes: quote.taxes.map((tax) => ({ name: tax.name, amount: tax.amount })),
      taxTotal: quote.taxTotal,
      protection: quote.protection,
      mileage: quote.mileage,
      chauffeur: quote.chauffeur,
      displayTaxInclusive: quote.displayTaxInclusive,
      warnings: quote.warnings.map((warning) => ({ code: warning.code, message: warning.message })),
    }
  }

  /** Website listing: online cars; with dates only the free ones, priced for that trip. */
  static async cars(filters: {
    pickupAt?: DateTime
    returnAt?: DateTime
    driveType: DriveType
    categoryId?: string
    transmission?: string
    seats?: number
    sort?: 'price_asc' | 'price_desc'
  }) {
    const dated = !!filters.pickupAt && !!filters.returnAt
    const buffer = await SettingsService.get('booking.turnaround_buffer_minutes')
    const query = dated
      ? AvailabilityService.getAvailableCars(
          filters.pickupAt!,
          filters.returnAt!.plus({ minutes: buffer })
        )
      : Car.query()
          .where('status', 'active')
          .whereNull('archived_at')
          .preload('category')
          .preload('photos', (photos) => photos.preload('file').orderBy('sort_order', 'asc'))
    query.where('is_listed_online', true)
    if (filters.categoryId) query.where('category_id', filters.categoryId)
    if (filters.transmission) query.where('transmission', filters.transmission)
    if (filters.seats) query.where('seats', '>=', filters.seats)
    if (filters.driveType === 'self_drive') {
      query.whereHas('category', (category) => category.where('self_drive_allowed', true))
    }
    const cars = await query.orderBy('make', 'asc').orderBy('model', 'asc')

    type Row = ReturnType<typeof PublicBookingService.carToJson> & {
      price: ReturnType<typeof PublicBookingService.priceToJson> | null
      fromPerDay: number | null
    }
    const rows: Row[] = []
    for (const car of cars) {
      if (dated) {
        try {
          const quote = await PricingService.quote({
            carId: car.id,
            pickupAt: filters.pickupAt!,
            returnAt: filters.returnAt!,
            driveType: filters.driveType,
          })
          rows.push({ ...this.carToJson(car), price: this.priceToJson(quote), fromPerDay: null })
        } catch (error) {
          if (error instanceof QuoteError) continue // no price for this drive type: not offered
          throw error
        }
      } else {
        const fromPerDay = await this.fromPrice(car, filters.driveType)
        if (fromPerDay === null) continue
        rows.push({ ...this.carToJson(car), price: null, fromPerDay })
      }
    }
    const value = (row: Row) => row.price?.total ?? row.fromPerDay ?? 0
    if (filters.sort === 'price_desc') rows.sort((a, b) => value(b) - value(a))
    else if (filters.sort === 'price_asc') rows.sort((a, b) => value(a) - value(b))
    return rows
  }

  /** One online car, with its price (and whether it's free) when dates are given. */
  static async car(id: string, trip?: Omit<PublicTrip, 'carId'>) {
    const car = await Car.query()
      .where('id', id)
      .where('is_listed_online', true)
      .where('status', 'active')
      .whereNull('archived_at')
      .preload('category')
      .preload('photos', (photos) => photos.preload('file').orderBy('sort_order', 'asc'))
      .first()
    if (!car) return null
    const [selfDrive, chauffeur] = await Promise.all([
      this.fromPrice(car, 'self_drive'),
      this.fromPrice(car, 'chauffeur'),
    ])
    const base = {
      ...this.carToJson(car),
      fromPerDay: { selfDrive: car.category.selfDriveAllowed ? selfDrive : null, chauffeur },
    }
    if (!trip) return { ...base, quote: null }
    const quote = await this.quote({ ...trip, carId: car.id })
    return { ...base, quote }
  }

  /**
   * A price for the website. Only what's offered online can be chosen;
   * "unavailable" comes back as a warning, so the page can say so.
   */
  static async quote(trip: PublicTrip) {
    await this.assertOfferedOnline(trip)
    const zone = await this.zone()
    try {
      const quote = await PricingService.quote({
        carId: trip.carId,
        pickupAt: DateTime.fromISO(trip.pickupAt, { zone }),
        returnAt: DateTime.fromISO(trip.returnAt, { zone }),
        driveType: trip.driveType,
        outOfTown: trip.driveType === 'chauffeur' && !!trip.outOfTown,
        driverNightsAway: trip.driveType === 'chauffeur' ? (trip.driverNightsAway ?? 0) : 0,
        extras: trip.extras ?? [],
        protectionPlanId: trip.protectionPlanId,
        deliveryZoneId: trip.deliveryZoneId ?? null,
        collectionZoneId: trip.collectionZoneId ?? null,
      })
      return this.quoteToJson(quote)
    } catch (error) {
      if (error instanceof QuoteError) throw new BookingError(error.field, error.message)
      throw error
    }
  }

  private static async zone() {
    const business = await Business.query().first()
    return business?.timezone || 'Africa/Accra'
  }

  /** Extras, plans and zones the website may offer; the car must be listed online. */
  private static async assertOfferedOnline(trip: PublicTrip) {
    const car = await Car.query()
      .where('id', trip.carId)
      .where('is_listed_online', true)
      .whereNull('archived_at')
      .first()
    if (!car) throw new BookingError('carId', 'This car can’t be booked online.')
    const extraIds = (trip.extras ?? []).map((extra) => extra.extraId)
    if (extraIds.length) {
      const offered = await Extra.query()
        .whereIn('id', extraIds)
        .where('active', true)
        .where('available_online', true)
      if (offered.length !== new Set(extraIds).size) {
        throw new BookingError('extras', 'One of the extras isn’t available online.')
      }
    }
    if (trip.protectionPlanId) {
      const plan = await ProtectionPlan.query()
        .where('id', trip.protectionPlanId)
        .where('active', true)
        .where('available_online', true)
        .first()
      if (!plan) throw new BookingError('protectionPlanId', 'Choose another protection plan.')
    }
    for (const [field, id] of [
      ['deliveryZoneId', trip.deliveryZoneId],
      ['collectionZoneId', trip.collectionZoneId],
    ] as const) {
      if (!id) continue
      const found = await DeliveryZone.query()
        .where('id', id)
        .where('active', true)
        .where('available_online', true)
        .first()
      if (!found)
        throw new BookingError(field, 'We don’t deliver there online - choose another place.')
    }
  }

  // ── Booking ───────────────────────────────────────────────────────

  /**
   * Book from the website: the customer is matched by phone (or added),
   * one unpaid online booking per phone at a time, then the booking is
   * made like a staff one with the online rules. Returns the private link
   * secret - shown once, only its hash is kept.
   */
  static async book(ctx: HttpContext, input: PublicBookingInput) {
    if (!(await SettingsService.get('booking.online_bookings_enabled'))) {
      throw new BookingError('carId', 'Online booking is paused. Please call or WhatsApp us.')
    }
    await this.assertOfferedOnline(input)
    const phone = normalizePhone(input.customer.phone)
    if (!phone) throw new BookingError('phone', 'Enter a valid phone number.')

    const customer = await this.customerFor(ctx, phone, input.customer)
    const waiting = await Booking.query()
      .where('customer_id', customer.id)
      .where('source', 'website')
      .where('status', 'pending')
      .first()
    if (waiting) {
      throw new BookingError(
        'phone',
        'There’s already a booking waiting for payment on this phone number. Use “Find my booking” to see it.'
      )
    }

    const token = randomBytes(24).toString('base64url')
    const { booking } = await BookingService.create(
      ctx,
      {
        customerId: customer.id,
        carId: input.carId,
        pickupAt: input.pickupAt,
        returnAt: input.returnAt,
        driveType: input.driveType,
        source: 'website',
        outOfTown: input.driveType === 'chauffeur' && !!input.outOfTown,
        driverNightsAway: input.driveType === 'chauffeur' ? (input.driverNightsAway ?? 0) : 0,
        destination: input.destination ?? null,
        extras: input.extras ?? [],
        protectionPlanId: input.protectionPlanId,
        deliveryZoneId: input.deliveryZoneId ?? null,
        deliveryAddress: input.deliveryZoneId ? (input.deliveryAddress ?? null) : null,
        collectionZoneId: input.collectionZoneId ?? null,
        collectionAddress: input.collectionZoneId ? (input.collectionAddress ?? null) : null,
      },
      null,
      {
        online: true,
        publicTokenHash: sha256(token),
        publicTokenEncrypted: encryption.encrypt(token),
        paymentPlan: input.paymentPlan,
      }
    )

    await NotificationService.sendToPermission('bookings.view', {
      type: 'booking.online',
      title: `New online booking ${booking.reference}`,
      body: `${customer.fullName} - waiting for the ${input.paymentPlan === 'full' ? 'full payment' : 'deposit'}.`,
      link: `/dashboard/bookings/${booking.id}`,
    })
    const owedNow =
      input.paymentPlan === 'full' ? booking.totalAmount : (booking.reservationFeeAmount ?? 0)
    await BookingMessages.received(booking, token, owedNow)
    return { booking, token }
  }

  /** The customer with this phone, or a new one; details they gave fill gaps only. */
  private static async customerFor(
    ctx: HttpContext,
    phone: string,
    details: PublicBookingInput['customer']
  ) {
    const existing = await Customer.query().where('phone', phone).whereNull('archived_at').first()
    if (existing) {
      // Never overwrite what staff recorded from a website form
      existing.merge({
        email: existing.email ?? details.email?.toLowerCase() ?? null,
        dateOfBirth: existing.dateOfBirth ?? details.dateOfBirth,
      })
      await existing.save()
      return existing
    }
    const branch = await Branch.query().where('is_main', true).firstOrFail()
    return db.transaction(async (trx) => {
      const created = await Customer.create(
        {
          branchId: branch.id,
          type: 'individual',
          fullName: details.fullName,
          phone,
          email: details.email?.toLowerCase() ?? null,
          dateOfBirth: details.dateOfBirth,
          source: 'website',
          verificationStatus: 'unverified',
        },
        { client: trx }
      )
      await CustomerStatusService.refresh(created, trx)
      await AuditService.record(
        ctx,
        {
          action: 'customer.created',
          actorType: 'customer',
          actorLabel: created.fullName,
          subject: { type: 'customer', id: created.id, label: created.fullName },
          metadata: { via: 'website' },
        },
        trx
      )
      return created
    })
  }

  /** The booking behind a private link, or null. */
  static findByToken(token: string) {
    if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null
    return Booking.query()
      .where('public_token_hash', sha256(token))
      .preload('customer')
      .preload('car', (car) =>
        car.preload('photos', (photos) => photos.preload('file').orderBy('sort_order', 'asc'))
      )
      .preload('extras')
      .preload('deliveryZone')
      .preload('collectionZone')
      .first()
  }

  /** What the customer's booking page shows: status, money, how to pay. */
  static async status(booking: Booking) {
    const [business, summary, payments] = await Promise.all([
      Business.query().firstOrFail(),
      PaymentService.summary(booking),
      Payment.query()
        .where('booking_id', booking.id)
        .whereIn('type', ['rental', 'deposit', 'refund', 'deposit_refund'])
        .whereNot('status', 'void')
        .orderBy('created_at', 'asc'),
    ])
    const owedNow =
      booking.paymentPlan === 'full'
        ? summary.balance
        : Math.max(0, summary.reservationFee - summary.paid)
    const photos = booking.car.photos ?? []
    const cover = photos.find((photo) => photo.isCover) ?? photos[0]
    const snapshot = booking.priceSnapshot
    return {
      reference: booking.reference,
      status: booking.status,
      holdExpiresAt: booking.holdExpiresAt?.toISO() ?? null,
      pickupAt: booking.pickupAt.toISO(),
      returnAt: booking.returnAt.toISO(),
      rentalDays: snapshot.rentalDays,
      driveType: booking.driveType,
      outOfTown: booking.outOfTown,
      driverNightsAway: booking.driverNightsAway,
      customerFirstName: booking.customer.fullName.split(/\s+/)[0],
      car: {
        name: booking.car.publicTitle || `${booking.car.make} ${booking.car.model}`,
        coverUrl: cover?.file?.url ?? null,
        transmission: booking.car.transmission,
        seats: booking.car.seats,
      },
      delivery: booking.deliveryZone
        ? { zone: booking.deliveryZone.name, address: booking.deliveryAddress }
        : null,
      collection: booking.collectionZone
        ? { zone: booking.collectionZone.name, address: booking.collectionAddress }
        : null,
      lines: snapshot.lines.map((line) => ({ label: line.label, amount: line.amount })),
      taxes: snapshot.taxes.map((tax) => ({ name: tax.name, amount: tax.amount })),
      total: summary.total,
      paid: summary.paid,
      balance: summary.balance,
      pendingAmount: summary.pendingRental + summary.pendingDeposit,
      /** Security deposit, paid at pickup and refunded after return */
      securityDeposit: booking.depositAmount,
      paymentPlan: booking.paymentPlan,
      reservationFee: summary.reservationFee,
      owedNow,
      payTo: {
        momo: business.momoNumber
          ? { number: business.momoNumber, name: business.momoName, network: business.momoNetwork }
          : null,
        bank: business.bankAccountNumber
          ? {
              bank: business.bankName,
              accountName: business.bankAccountName,
              accountNumber: business.bankAccountNumber,
              branch: business.bankBranch,
            }
          : null,
      },
      payments: payments.map((payment) => ({
        type: payment.type,
        method: payment.method,
        amount: payment.amount,
        transactionRef: payment.transactionRef,
        status: payment.status,
        number: payment.number,
        paidAt: payment.paidAt.toISO(),
      })),
    }
  }

  /**
   * "I've paid": the customer's MoMo or bank transfer, waiting for staff to
   * check the statement. Staff with payments.verify are told.
   */
  static async submitPayment(
    ctx: HttpContext,
    booking: Booking,
    input: {
      method: 'momo' | 'bank_transfer'
      transactionRef: string
      payerName?: string | null
      amount?: number | null
      proofFileId?: string | null
    }
  ) {
    if (!PAYABLE.includes(booking.status)) {
      throw new BookingError('status', 'This booking can’t take payments any more. Please call us.')
    }
    if (input.proofFileId) {
      const proof = await File.query()
        .where('id', input.proofFileId)
        .where('attachable_type', 'booking')
        .where('attachable_id', booking.id)
        .first()
      if (!proof) throw new BookingError('proofFileId', 'Upload the screenshot again.')
    }
    const status = await this.status(booking)
    const due = status.balance - status.pendingAmount
    if (due <= 0) {
      throw new BookingError('amount', 'Nothing more is due - we’re checking your payment.')
    }
    const amount = input.amount ?? Math.min(status.owedNow || due, due)
    const payment = await PaymentService.submitByCustomer(ctx, booking.id, {
      method: input.method,
      amount,
      transactionRef: normaliseRef(input.transactionRef)!,
      payerName: input.payerName ?? null,
      proofFileId: input.proofFileId ?? null,
      customerName: booking.customer.fullName,
    })
    await NotificationService.sendToPermission('payments.verify', {
      type: 'payment.to_verify',
      title: `Payment to verify - ${booking.reference}`,
      body: `${formatMoney(amount)} by ${input.method === 'momo' ? 'MoMo' : 'bank transfer'}, ref ${payment.transactionRef}.`,
      link: '/dashboard/payments',
    })
    return payment
  }
}
