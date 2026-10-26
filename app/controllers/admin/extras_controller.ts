import type { HttpContext } from '@adonisjs/core/http'
import Extra from '#models/extra'
import { ExtraTransformer } from '#transformers/pricing_catalog_transformers'
import { CatalogCrud } from '#services/pricing/catalog_crud'
import { catalogFilterValidator, extraValidator } from '#validators/pricing_catalog'
import type { Infer } from '@vinejs/vine/types'

const values = (payload: Infer<typeof extraValidator>) => ({
  name: payload.name,
  description: payload.description ?? null,
  chargeType: payload.chargeType,
  amount: payload.amount,
  maxQuantity: payload.maxQuantity ?? 1,
  stock: payload.stock ?? null,
  taxable: payload.taxable ?? true,
  availableOnline: payload.availableOnline ?? true,
  sortOrder: payload.sortOrder ?? 0,
  active: payload.active ?? true,
})

export default class ExtrasController {
  async index({ request, response }: HttpContext) {
    const payload = await request.validateUsing(catalogFilterValidator)
    const rows = await CatalogCrud.list(Extra, payload)
    return response.ok({
      message: 'Extras fetched successfully',
      data: rows.all().map((row) => new ExtraTransformer(row).toObject()),
      meta: rows.getMeta(),
    })
  }

  async store(ctx: HttpContext) {
    const payload = await ctx.request.validateUsing(extraValidator)
    const row = await CatalogCrud.create(ctx, Extra, 'extra', values(payload))
    return ctx.response.created({
      message: 'Extra saved',
      data: new ExtraTransformer(row as Extra).toObject(),
    })
  }

  async update(ctx: HttpContext) {
    const row = await Extra.findOrFail(ctx.params.id)
    const payload = await ctx.request.validateUsing(extraValidator)
    await CatalogCrud.update(ctx, row, 'extra', values(payload))
    return ctx.response.ok({ message: 'Extra updated', data: new ExtraTransformer(row).toObject() })
  }
}
