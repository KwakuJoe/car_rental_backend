import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import Business from '#models/business'
import PricingService, { QuoteError } from '#services/pricing/pricing_service'
import { quoteValidator } from '#validators/quote'

const fail = (response: HttpContext['response'], field: string, message: string) =>
  response.unprocessableEntity({ message, errors: [{ field, rule: 'quote', message }] })

export default class QuotesController {
  /** Staff price preview - the same calculation bookings will use. */
  async store({ request, response }: HttpContext) {
    const payload = await request.validateUsing(quoteValidator)
    const business = await Business.query().first()
    const zone = business?.timezone || 'Africa/Accra'

    const pickupAt = DateTime.fromISO(payload.pickupAt, { zone })
    const returnAt = DateTime.fromISO(payload.returnAt, { zone })
    if (!pickupAt.isValid) return fail(response, 'pickupAt', 'Enter a valid pickup date and time.')
    if (!returnAt.isValid) return fail(response, 'returnAt', 'Enter a valid return date and time.')

    try {
      const quote = await PricingService.quote({ ...payload, pickupAt, returnAt })
      return response.ok({ message: 'Quote calculated', data: quote })
    } catch (error) {
      if (error instanceof QuoteError) return fail(response, error.field, error.message)
      throw error
    }
  }
}
