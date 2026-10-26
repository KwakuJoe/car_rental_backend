import type { HttpContext } from '@adonisjs/core/http'
import DeliveryZone from '#models/delivery_zone'
import { DeliveryZoneTransformer } from '#transformers/pricing_catalog_transformers'
import { CatalogCrud } from '#services/pricing/catalog_crud'
import { catalogFilterValidator, deliveryZoneValidator } from '#validators/pricing_catalog'
import type { Infer } from '@vinejs/vine/types'

const values = (payload: Infer<typeof deliveryZoneValidator>) => ({
  name: payload.name,
  description: payload.description ?? null,
  deliveryAmount: payload.deliveryAmount,
  collectionAmount: payload.collectionAmount,
  afterHoursAmount: payload.afterHoursAmount ?? 0,
  availableOnline: payload.availableOnline ?? true,
  sortOrder: payload.sortOrder ?? 0,
  active: payload.active ?? true,
})

export default class DeliveryZonesController {
  async index({ request, response }: HttpContext) {
    const payload = await request.validateUsing(catalogFilterValidator)
    const rows = await CatalogCrud.list(DeliveryZone, payload)
    return response.ok({
      message: 'Delivery zones fetched successfully',
      data: rows.all().map((row) => new DeliveryZoneTransformer(row).toObject()),
      meta: rows.getMeta(),
    })
  }

  async store(ctx: HttpContext) {
    const payload = await ctx.request.validateUsing(deliveryZoneValidator)
    const row = await CatalogCrud.create(ctx, DeliveryZone, 'delivery_zone', values(payload))
    return ctx.response.created({
      message: 'Delivery zone saved',
      data: new DeliveryZoneTransformer(row as DeliveryZone).toObject(),
    })
  }

  async update(ctx: HttpContext) {
    const row = await DeliveryZone.findOrFail(ctx.params.id)
    const payload = await ctx.request.validateUsing(deliveryZoneValidator)
    await CatalogCrud.update(ctx, row, 'delivery_zone', values(payload))
    return ctx.response.ok({
      message: 'Delivery zone updated',
      data: new DeliveryZoneTransformer(row).toObject(),
    })
  }
}
