import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import Booking from '#models/booking'
import Business from '#models/business'
import { BookingError } from '#services/bookings/booking_service'
import FileService from '#services/file_service'
import BookingMessages from '#services/messages/booking_messages'
import PublicBookingService from '#services/public/public_booking_service'
import { normalizePhone } from '#helpers/phone'
import {
  publicBookingValidator,
  publicCarValidator,
  publicCarsValidator,
  publicLookupValidator,
  publicPaymentValidator,
  publicQuoteValidator,
} from '#validators/public'

const fail = (response: HttpContext['response'], error: BookingError) => {
  const body = {
    message: error.message,
    code: error.code,
    errors: [{ field: error.field, rule: 'booking', message: error.message }],
  }
  return error.status === 409 ? response.conflict(body) : response.unprocessableEntity(body)
}

async function attempt<T>(response: HttpContext['response'], action: () => Promise<T>) {
  try {
    return { ok: true as const, value: await action() }
  } catch (error) {
    if (error instanceof BookingError) return { ok: false as const, reply: fail(response, error) }
    throw error
  }
}

/** The trip's dates in the business's timezone, checked; null when not given. */
async function tripDates(pickupAt?: string, returnAt?: string) {
  if (!pickupAt || !returnAt) return null
  const business = await Business.query().first()
  const zone = business?.timezone || 'Africa/Accra'
  const from = DateTime.fromISO(pickupAt, { zone })
  const to = DateTime.fromISO(returnAt, { zone })
  if (!from.isValid) throw new BookingError('pickupAt', 'Choose a valid pickup date and time.')
  if (!to.isValid || to <= from) {
    throw new BookingError('returnAt', 'The return must be after the pickup.')
  }
  if (from < DateTime.now()) throw new BookingError('pickupAt', 'The pickup time has passed.')
  return { from, to }
}

/**
 * The public website's API (no login). Rate limited per IP (start/routes.ts).
 * The booking's private link token is the only key to a customer's booking.
 */
export default class PublicController {
  async site({ response }: HttpContext) {
    return response.ok({ message: 'Site', data: await PublicBookingService.site() })
  }

  async cars({ request, response }: HttpContext) {
    const payload = await request.validateUsing(publicCarsValidator)
    const result = await attempt(response, async () => {
      const dates = await tripDates(payload.pickupAt, payload.returnAt)
      return PublicBookingService.cars({
        pickupAt: dates?.from,
        returnAt: dates?.to,
        driveType: payload.driveType ?? 'self_drive',
        categoryId: payload.categoryId,
        transmission: payload.transmission,
        seats: payload.seats,
        sort: payload.sort,
      })
    })
    if (!result.ok) return result.reply
    return response.ok({ message: 'Cars', data: result.value })
  }

  async car({ params, request, response }: HttpContext) {
    const payload = await request.validateUsing(publicCarValidator)
    const result = await attempt(response, async () => {
      const dates = await tripDates(payload.pickupAt, payload.returnAt)
      return PublicBookingService.car(
        params.id,
        dates
          ? {
              pickupAt: payload.pickupAt!,
              returnAt: payload.returnAt!,
              driveType: payload.driveType ?? 'self_drive',
            }
          : undefined
      )
    })
    if (!result.ok) return result.reply
    if (!result.value) return response.notFound({ message: 'This car isn’t available online.' })
    return response.ok({ message: 'Car', data: result.value })
  }

  async quote({ request, response }: HttpContext) {
    const payload = await request.validateUsing(publicQuoteValidator)
    const result = await attempt(response, async () => {
      await tripDates(payload.pickupAt, payload.returnAt)
      return PublicBookingService.quote(payload)
    })
    if (!result.ok) return result.reply
    return response.ok({ message: 'Quote', data: result.value })
  }

  /** Book: returns the private link token once (only its hash is stored). */
  async book(ctx: HttpContext) {
    const { request, response } = ctx
    const payload = await request.validateUsing(publicBookingValidator)
    const result = await attempt(response, async () => {
      await tripDates(payload.pickupAt, payload.returnAt)
      return PublicBookingService.book(ctx, payload)
    })
    if (!result.ok) return result.reply
    const { booking, token } = result.value
    return response.created({
      message: 'Booking made - pay the deposit to confirm it',
      data: { reference: booking.reference, token },
    })
  }

  async booking({ params, response }: HttpContext) {
    const booking = await PublicBookingService.findByToken(params.token)
    if (!booking) return response.notFound({ message: 'We couldn’t find that booking.' })
    return response.ok({ message: 'Booking', data: await PublicBookingService.status(booking) })
  }

  /** A screenshot of the transfer (optional), attached to the booking. */
  async uploadProof({ params, request, response }: HttpContext) {
    const booking = await PublicBookingService.findByToken(params.token)
    if (!booking) return response.notFound({ message: 'We couldn’t find that booking.' })
    const upload = request.file('file', { size: '5mb', extnames: ['png', 'jpg', 'jpeg', 'webp'] })
    if (!upload) return response.badRequest({ message: 'Choose a screenshot to upload.' })
    if (!upload.isValid) {
      return response.unprocessableEntity({
        message: 'Use a PNG, JPG or WebP screenshot up to 5 MB.',
        errors: upload.errors,
      })
    }
    const file = await FileService.upload(upload, {
      purpose: 'receipt_proof',
      attachableType: 'booking',
      attachableId: booking.id,
    })
    return response.created({ message: 'Screenshot uploaded', data: { id: file.id } })
  }

  /**
   * "Find my booking": the private link goes to the phone (and email) on
   * record, never back to whoever asks - and the answer is the same either
   * way, so references can't be fished for.
   */
  async lookup({ request, response }: HttpContext) {
    const { reference, phone } = await request.validateUsing(publicLookupValidator)
    const normalised = normalizePhone(phone)
    const booking = normalised
      ? await Booking.query()
          .where('reference', reference)
          .where('source', 'website')
          .whereHas('customer', (customer) => customer.where('phone', normalised))
          .first()
      : null
    if (booking) await BookingMessages.resendLink(booking)
    return response.ok({
      message: 'If those details match a booking, we’ve sent its link to that phone number.',
      data: null,
    })
  }

  /** "I've paid" - waits for staff to check the statement. */
  async submitPayment(ctx: HttpContext) {
    const { params, request, response } = ctx
    const booking = await PublicBookingService.findByToken(params.token)
    if (!booking) return response.notFound({ message: 'We couldn’t find that booking.' })
    const payload = await request.validateUsing(publicPaymentValidator)
    const result = await attempt(response, () =>
      PublicBookingService.submitPayment(ctx, booking, payload)
    )
    if (!result.ok) return result.reply
    return response.created({
      message: 'Thanks - we’re checking your payment',
      data: await PublicBookingService.status(booking),
    })
  }
}
