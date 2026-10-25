import type { HttpContext } from '@adonisjs/core/http'
import Business from '#models/business'
import BusinessTransformer from '#transformers/business_transformer'
import { updateBusinessValidator } from '#validators/business'
import AuditService from '#services/audit_service'

const AUDITED_FIELDS = [
  'name',
  'tradingName',
  'email',
  'phone',
  'whatsappPhone',
  'address',
  'digitalAddress',
  'city',
  'region',
  'tin',
  'vatRegistered',
  'vatNumber',
] as const

export default class BusinessController {
  async show({ response, serialize }: HttpContext) {
    const business = await Business.current()
    const transformed = await serialize(BusinessTransformer.transform(business))
    return response.ok({ message: 'Business fetched successfully', data: transformed.data })
  }

  async update(ctx: HttpContext) {
    const { request, response, serialize } = ctx
    const data = await request.validateUsing(updateBusinessValidator)
    const business = await Business.current()

    const before = AuditService.pick(business, [...AUDITED_FIELDS])
    business.merge(data)
    if (business.vatRegistered === false) {
      business.vatNumber = null
    }
    await business.save()
    await AuditService.record(ctx, {
      action: 'business.updated',
      subject: { type: 'business', id: business.id, label: business.name },
      before,
      after: AuditService.pick(business, [...AUDITED_FIELDS]),
    })

    const transformed = await serialize(BusinessTransformer.transform(business))
    return response.ok({ message: 'Business updated successfully', data: transformed.data })
  }
}
