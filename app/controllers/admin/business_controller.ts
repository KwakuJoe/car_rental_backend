import type { HttpContext } from '@adonisjs/core/http'
import Business from '#models/business'
import BusinessTransformer from '#transformers/business_transformer'
import { updateBusinessValidator } from '#validators/business'

export default class BusinessController {
  async show({ response, serialize }: HttpContext) {
    const business = await Business.current()
    const transformed = await serialize(BusinessTransformer.transform(business))
    return response.ok({ message: 'Business fetched successfully', data: transformed.data })
  }

  async update({ request, response, serialize }: HttpContext) {
    const data = await request.validateUsing(updateBusinessValidator)
    const business = await Business.current()

    business.merge(data)
    if (business.vatRegistered === false) {
      business.vatNumber = null
    }
    await business.save()

    const transformed = await serialize(BusinessTransformer.transform(business))
    return response.ok({ message: 'Business updated successfully', data: transformed.data })
  }
}
