import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import Customer from '#models/customer'
import CreditPayment from '#models/credit_payment'
import CreditPaymentTransformer from '#transformers/credit_payment_transformer'
import {
  creditPaymentFilterValidator,
  createCreditPaymentValidator,
} from '#validators/credit_payment_validator'

export default class CreditPaymentsController {
  async index({ auth, params, request, response, serialize }: HttpContext) {
    const user = auth.getUserOrFail()

    // ensure customer belongs to this business
    await Customer.query()
      .where('id', params.customerId)
      .where('business_id', user.businessId)
      .firstOrFail()

    const payload = await request.validateUsing(creditPaymentFilterValidator)
    const page = payload.page ?? 1
    const limit = payload.limit ?? 20

    let query = CreditPayment.query()
      .where('customer_id', params.customerId)
      .where('business_id', user.businessId)
      .orderBy('created_at', 'desc')

    if (payload.paymentMethod) {
      query = query.where('payment_method', payload.paymentMethod)
    }
    if (payload.createdFrom) {
      query = query.where('created_at', '>=', payload.createdFrom)
    }
    if (payload.createdTo) {
      query = query.where('created_at', '<=', payload.createdTo)
    }

    const payments = await query.paginate(page, limit)
    const transformed = await serialize(
      CreditPaymentTransformer.paginate(payments.all(), payments.getMeta())
    )

    return response.ok({
      message: 'Credit payments fetched successfully',
      data: transformed.data,
      meta: transformed.metadata,
    })
  }

  async store({ auth, params, request, response, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const data = await request.validateUsing(createCreditPaymentValidator)

    const customer = await Customer.query()
      .where('id', params.customerId)
      .where('business_id', user.businessId)
      .firstOrFail()

    if (customer.outstandingBalance <= 0) {
      return response.badRequest({ message: 'Customer has no outstanding balance.' })
    }

    if (data.amount > customer.outstandingBalance) {
      return response.badRequest({
        message: `Payment amount exceeds outstanding balance of ${customer.outstandingBalance}.`,
      })
    }

    const payment = await db.transaction(async (trx) => {
      const newPayment = await CreditPayment.create(
        {
          businessId: user.businessId,
          customerId: customer.id,
          recordedBy: user.id,
          amount: data.amount,
          paymentMethod: data.paymentMethod,
          notes: data.notes ?? null,
        },
        { client: trx }
      )

      customer.outstandingBalance = customer.outstandingBalance - data.amount
      customer.useTransaction(trx)
      await customer.save()

      return newPayment
    })

    const transformed = await serialize(CreditPaymentTransformer.transform(payment))
    return response.created({
      message: 'Payment recorded successfully',
      data: transformed.data,
    })
  }
}
