import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import Booking from '#models/booking'
import Business from '#models/business'
import Customer from '#models/customer'
import Payment from '#models/payment'
import { BookingError } from '#services/bookings/booking_service'
import PaymentPdfService from '#services/payments/payment_pdf_service'
import PaymentService, { normaliseRef } from '#services/payments/payment_service'
import { paymentToJson } from '#transformers/payment_transformer'
import {
  listPaymentsValidator,
  paymentReasonValidator,
  recordPaymentValidator,
  settleDepositValidator,
} from '#validators/payment'

const fail = (response: HttpContext['response'], error: BookingError) =>
  response.unprocessableEntity({
    message: error.message,
    code: error.code,
    errors: [{ field: error.field, rule: 'payment', message: error.message }],
  })

/** Runs a payment action, turning rule failures into a 422 the form can show. */
async function attempt<T>(response: HttpContext['response'], action: () => Promise<T>) {
  try {
    return { ok: true as const, value: await action() }
  } catch (error) {
    if (error instanceof BookingError) return { ok: false as const, reply: fail(response, error) }
    throw error
  }
}

/** Payments with the staff who recorded, verified or voided them */
const payments = () => Payment.query().preload('recorder').preload('verifier').preload('voider')

/** Payments, deposits and refunds (Phase 5 slice 1). */
export default class PaymentsController {
  /** A booking's money: summary + every payment (voided ones too, greyed out). */
  async forBooking({ params, response }: HttpContext) {
    const booking = await Booking.findOrFail(params.id)
    const [summary, rows] = await Promise.all([
      PaymentService.summary(booking),
      payments().where('booking_id', booking.id).orderBy('created_at', 'asc'),
    ])
    return response.ok({
      message: 'Payments fetched successfully',
      data: { summary, payments: rows.map(paymentToJson) },
    })
  }

  async store(ctx: HttpContext) {
    const { auth, params, request, response } = ctx
    const payload = await request.validateUsing(recordPaymentValidator)
    let paidAt: DateTime | null = null
    if (payload.paidAt) {
      paidAt = DateTime.fromISO(payload.paidAt)
      if (!paidAt.isValid) {
        return fail(response, new BookingError('paidAt', 'Enter a valid date and time.'))
      }
    }
    const result = await attempt(response, () =>
      PaymentService.record(ctx, params.id, { ...payload, paidAt }, auth.getUserOrFail())
    )
    if (!result.ok) return result.reply
    const payment = await payments().where('id', result.value.id).firstOrFail()
    return response.created({
      message:
        payment.status === 'pending_verification'
          ? 'Payment recorded - waiting to be verified'
          : 'Payment recorded',
      data: paymentToJson(payment),
    })
  }

  async settleDeposit(ctx: HttpContext) {
    const { auth, params, request, response } = ctx
    const payload = await request.validateUsing(settleDepositValidator)
    const result = await attempt(response, () =>
      PaymentService.settleDeposit(ctx, params.id, payload, auth.getUserOrFail())
    )
    if (!result.ok) return result.reply
    return response.ok({
      message: 'Deposit settled',
      data: result.value.map(paymentToJson),
    })
  }

  /** All payments with filters; status=pending_verification is the "To verify" queue. */
  async index({ request, response }: HttpContext) {
    const payload = await request.validateUsing(listPaymentsValidator)
    const business = await Business.query().first()
    const zone = business?.timezone || 'Africa/Accra'
    const query = payments().preload('booking').preload('customer')

    if (payload.status) query.where('status', payload.status)
    if (payload.type) query.where('type', payload.type)
    if (payload.method) query.where('method', payload.method)
    if (payload.search) {
      const term = payload.search
      const ref = normaliseRef(term)
      query.where((q) => {
        q.whereILike('number', `%${term}%`)
          .if(ref, (inner) => inner.orWhere('transaction_ref', 'like', `%${ref}%`))
          .orWhereIn(
            'booking_id',
            Booking.query().select('id').whereILike('reference', `%${term}%`)
          )
          .orWhereIn(
            'customer_id',
            Customer.query().select('id').whereILike('full_name', `%${term}%`)
          )
      })
    }
    if (payload.dateFrom) {
      const from = payload.dateFrom.setZone(zone, { keepLocalTime: true })
      query.where('paid_at', '>=', from.startOf('day').toSQL()!)
    }
    if (payload.dateTo) {
      const to = payload.dateTo.setZone(zone, { keepLocalTime: true })
      query.where('paid_at', '<=', to.endOf('day').toSQL()!)
    }

    const [page, pending] = await Promise.all([
      query.orderBy('created_at', 'desc').paginate(payload.page ?? 1, payload.limit ?? 20),
      Payment.query().where('status', 'pending_verification').count('* as total').first(),
    ])
    return response.ok({
      message: 'Payments fetched successfully',
      data: page.all().map(paymentToJson),
      meta: { ...page.getMeta(), pendingCount: Number(pending?.$extras.total ?? 0) },
    })
  }

  async verify(ctx: HttpContext) {
    const { auth, params, response } = ctx
    const result = await attempt(response, () =>
      PaymentService.verify(ctx, params.id, auth.getUserOrFail())
    )
    if (!result.ok) return result.reply
    return response.ok({ message: 'Payment verified', data: paymentToJson(result.value) })
  }

  async reject(ctx: HttpContext) {
    const { auth, params, request, response } = ctx
    const { reason } = await request.validateUsing(paymentReasonValidator)
    const result = await attempt(response, () =>
      PaymentService.reject(ctx, params.id, reason, auth.getUserOrFail())
    )
    if (!result.ok) return result.reply
    return response.ok({ message: 'Payment rejected', data: paymentToJson(result.value) })
  }

  async void(ctx: HttpContext) {
    const { auth, params, request, response } = ctx
    const { reason } = await request.validateUsing(paymentReasonValidator)
    const result = await attempt(response, () =>
      PaymentService.void(ctx, params.id, reason, auth.getUserOrFail())
    )
    if (!result.ok) return result.reply
    return response.ok({ message: 'Payment voided', data: paymentToJson(result.value) })
  }

  /** The receipt (money in) or refund note (money out), once the payment counts. */
  async receipt({ params, response }: HttpContext) {
    const payment = await Payment.findOrFail(params.id)
    const result = await attempt(response, () => PaymentPdfService.receipt(payment.id))
    if (!result.ok) return result.reply
    response.header('Content-Type', 'application/pdf')
    response.header('Content-Disposition', `inline; filename="${payment.number ?? 'receipt'}.pdf"`)
    return response.send(result.value)
  }
}
