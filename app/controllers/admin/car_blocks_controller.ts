import type { HttpContext } from '@adonisjs/core/http'
import Car from '#models/car'
import CarAllocation from '#models/car_allocation'
import CarAllocationTransformer from '#transformers/car_allocation_transformer'
import AvailabilityService from '#services/availability_service'
import { createCarBlockValidator, listCarBlocksValidator } from '#validators/car_block'

export default class CarBlocksController {
  async index({ params, request, response, serialize }: HttpContext) {
    const payload = await request.validateUsing(listCarBlocksValidator)
    await Car.findOrFail(params.carId)

    const query = CarAllocation.query()
      .where('car_id', params.carId)
      .where('source', 'block')
      .preload('creator')
      .orderBy('starts_at', 'desc')

    if (payload.activeOnly) {
      query.where('active', true)
    }

    const blocks = await query.paginate(payload.page ?? 1, payload.limit ?? 50)
    const transformed = await serialize(
      CarAllocationTransformer.paginate(blocks.all(), blocks.getMeta())
    )

    return response.ok({
      message: 'Vehicle blocks fetched successfully',
      data: transformed.data,
      meta: transformed.metadata,
    })
  }

  async store(ctx: HttpContext) {
    const { params, auth, request, response } = ctx
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(createCarBlockValidator)

    try {
      const block = await AvailabilityService.createBlock(
        ctx,
        params.carId,
        payload,
        user
      )

      return response.created({
        message: 'Vehicle availability block created successfully',
        data: new CarAllocationTransformer(block).toObject(),
      })
    } catch (error: any) {
      if (error.status === 409 || error.code === 'E_CAR_UNAVAILABLE') {
        return response.conflict({
          message: error.message || 'Vehicle is already allocated or blocked during this period',
          code: 'E_CAR_UNAVAILABLE',
        })
      }
      throw error
    }
  }

  async destroy(ctx: HttpContext) {
    const { params, response } = ctx
    await AvailabilityService.releaseBlock(ctx, params.carId, params.id)

    return response.ok({
      message: 'Vehicle block released successfully',
    })
  }
}
