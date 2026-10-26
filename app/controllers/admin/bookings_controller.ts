import type { HttpContext } from '@adonisjs/core/http'
import AuditLog from '#models/audit_log'
import { DateTime } from 'luxon'
import Booking from '#models/booking'
import Business from '#models/business'
import Customer from '#models/customer'
import AuditService from '#services/audit_service'
import BookingService, { BookingError } from '#services/bookings/booking_service'
import CancellationService from '#services/bookings/cancellation_service'
import SettingsService from '#services/settings/settings_service'
import AuditLogTransformer from '#transformers/audit_log_transformer'
import { bookingToJson } from '#transformers/booking_transformer'
import { normalizePhone } from '#helpers/phone'
import {
  bookingFilterValidator,
  cancelBookingValidator,
  createBookingValidator,
  updateBookingValidator,
} from '#validators/booking'

const fail = (response: HttpContext['response'], error: BookingError) => {
  const body = {
    message: error.message,
    code: error.code,
    errors: [{ field: error.field, rule: 'booking', message: error.message }],
  }
  return error.status === 409 ? response.conflict(body) : response.unprocessableEntity(body)
}

const detail = (id: string) =>
  Booking.query()
    .where('id', id)
    .preload('customer')
    .preload('car', (q) =>
      q
        .preload('category')
        .preload('photos', (photos) => photos.preload('file').orderBy('sort_order', 'asc'))
    )
    .preload('extras', (q) => q.orderBy('created_at', 'asc'))
    .firstOrFail()

export default class BookingsController {
  async index({ request, response }: HttpContext) {
    const payload = await request.validateUsing(bookingFilterValidator)
    const business = await Business.query().first()
    const zone = business?.timezone || 'Africa/Accra'
    const query = Booking.query()
      .preload('customer')
      .preload('car', (q) =>
        q
          .preload('category')
          .preload('photos', (photos) => photos.preload('file').orderBy('sort_order', 'asc'))
      )

    if (payload.search) {
      const term = payload.search
      const phone = normalizePhone(term)
      query.where((q) => {
        q.whereILike('reference', `%${term}%`).orWhereIn(
          'customer_id',
          Customer.query()
            .select('id')
            .whereILike('full_name', `%${term}%`)
            .if(phone, (c) => c.orWhere('phone', phone!))
        )
      })
    }
    if (payload.status) query.where('status', payload.status)
    if (payload.upcoming) {
      query
        .whereIn('status', ['pending', 'confirmed', 'on_rent'])
        .where('return_at', '>', DateTime.now().toSQL()!)
    }
    if (payload.customerId) query.where('customer_id', payload.customerId)
    if (payload.carId) query.where('car_id', payload.carId)
    if (payload.source) query.where('source', payload.source)
    if (payload.driveType) query.where('drive_type', payload.driveType)
    if (payload.dateFrom) {
      const from = payload.dateFrom.setZone(zone, { keepLocalTime: true })
      query.where('pickup_at', '>=', from.startOf('day').toSQL()!)
    }
    if (payload.dateTo) {
      const to = payload.dateTo.setZone(zone, { keepLocalTime: true })
      query.where('pickup_at', '<=', to.endOf('day').toSQL()!)
    }

    if (payload.sortBy === 'createdAt') query.orderBy('created_at', payload.sortOrder ?? 'desc')
    else query.orderBy('pickup_at', payload.sortOrder ?? 'desc')

    const graceMinutes = await SettingsService.get('booking.return_grace_minutes')
    const bookings = await query.paginate(payload.page ?? 1, payload.limit ?? 20)
    return response.ok({
      message: 'Bookings fetched successfully',
      data: bookings.all().map((booking) => bookingToJson(booking, { graceMinutes })),
      meta: bookings.getMeta(),
    })
  }

  async show({ params, response }: HttpContext) {
    const booking = await detail(params.id)
    const graceMinutes = await SettingsService.get('booking.return_grace_minutes')
    return response.ok({
      message: 'Booking fetched successfully',
      data: { ...bookingToJson(booking, { graceMinutes }), quote: booking.priceSnapshot },
    })
  }

  async store(ctx: HttpContext) {
    const { auth, request, response } = ctx
    const payload = await request.validateUsing(createBookingValidator)
    try {
      const { booking, warnings } = await BookingService.create(ctx, payload, auth.getUserOrFail())
      const saved = await detail(booking.id)
      return response.created({
        message: booking.status === 'confirmed' ? 'Booking confirmed' : 'Booking held',
        data: { ...bookingToJson(saved), quote: saved.priceSnapshot, warnings },
      })
    } catch (error) {
      if (error instanceof BookingError) return fail(response, error)
      throw error
    }
  }

  /** Notes and destination only - dates, car and extras change through modifications (M3.8). */
  async update(ctx: HttpContext) {
    const { params, request, response } = ctx
    const booking = await Booking.findOrFail(params.id)
    const payload = await request.validateUsing(updateBookingValidator)
    const before = { destination: booking.destination, notes: booking.notes }
    booking.merge({
      destination: payload.destination === undefined ? booking.destination : payload.destination,
      notes: payload.notes === undefined ? booking.notes : payload.notes,
    })
    await booking.save()
    await AuditService.record(ctx, {
      action: 'booking.updated',
      subject: { type: 'booking', id: booking.id, label: booking.reference },
      before,
      after: { destination: booking.destination, notes: booking.notes },
    })
    return response.ok({
      message: 'Booking updated',
      data: bookingToJson(await detail(booking.id)),
    })
  }

  async confirm(ctx: HttpContext) {
    const { auth, params, response } = ctx
    const booking = await Booking.findOrFail(params.id)
    try {
      await BookingService.confirm(ctx, booking, auth.getUserOrFail())
      return response.ok({
        message: 'Booking confirmed',
        data: bookingToJson(await detail(booking.id)),
      })
    } catch (error) {
      if (error instanceof BookingError) return fail(response, error)
      throw error
    }
  }

  /** What cancelling now would cost - shown before staff confirm. */
  async cancellationPreview({ params, response }: HttpContext) {
    const booking = await Booking.findOrFail(params.id)
    return response.ok({
      message: 'Cancellation policy',
      data: await CancellationService.evaluate(booking),
    })
  }

  async cancel(ctx: HttpContext) {
    const { auth, params, request, response } = ctx
    const booking = await Booking.findOrFail(params.id)
    const { reason } = await request.validateUsing(cancelBookingValidator)
    try {
      await BookingService.cancel(ctx, booking, reason, auth.getUserOrFail())
      return response.ok({
        message: 'Booking cancelled',
        data: bookingToJson(await detail(booking.id)),
      })
    } catch (error) {
      if (error instanceof BookingError) return fail(response, error)
      throw error
    }
  }

  async noShow(ctx: HttpContext) {
    const { auth, params, response } = ctx
    const booking = await Booking.findOrFail(params.id)
    try {
      await BookingService.markNoShow(ctx, booking, auth.getUserOrFail())
      return response.ok({
        message: 'Marked as a no-show',
        data: bookingToJson(await detail(booking.id)),
      })
    } catch (error) {
      if (error instanceof BookingError) return fail(response, error)
      throw error
    }
  }

  /** Everything that happened to the booking, oldest first (from the audit log). */
  async history({ params, response }: HttpContext) {
    const booking = await Booking.findOrFail(params.id)
    const entries = await AuditLog.query()
      .where('subject_type', 'booking')
      .where('subject_id', booking.id)
      .orderBy('created_at', 'asc')
    return response.ok({
      message: 'Booking history',
      data: entries.map((entry) => new AuditLogTransformer(entry).toObject()),
    })
  }
}
