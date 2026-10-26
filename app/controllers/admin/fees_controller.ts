import type { HttpContext } from '@adonisjs/core/http'
import Fee from '#models/fee'
import { FeeTransformer } from '#transformers/pricing_catalog_transformers'
import { CatalogCrud } from '#services/pricing/catalog_crud'
import {
  catalogFilterValidator,
  createFeeValidator,
  updateFeeValidator,
} from '#validators/pricing_catalog'
import type { Infer } from '@vinejs/vine/types'

const values = (payload: Infer<typeof updateFeeValidator>) => ({
  name: payload.name,
  description: payload.description ?? null,
  unit: payload.unit,
  amount: payload.amount,
  taxable: payload.taxable ?? true,
  sortOrder: payload.sortOrder ?? 0,
  active: payload.active ?? true,
})

const tooHighPercent = (payload: Infer<typeof updateFeeValidator>) =>
  payload.unit === 'percent' && payload.amount > 10_000

const percentError = {
  message: 'A percentage fee can be at most 100%.',
  errors: [{ field: 'amount', rule: 'max', message: 'A percentage fee can be at most 100%.' }],
}

export default class FeesController {
  async index({ request, response }: HttpContext) {
    const payload = await request.validateUsing(catalogFilterValidator)
    const rows = await CatalogCrud.list(Fee, payload)
    return response.ok({
      message: 'Fees fetched successfully',
      data: rows.all().map((row) => new FeeTransformer(row).toObject()),
      meta: rows.getMeta(),
    })
  }

  /** Staff-added fees; the standard ones come from the seeder (is_system). */
  async store(ctx: HttpContext) {
    const payload = await ctx.request.validateUsing(createFeeValidator)
    if (tooHighPercent(payload)) return ctx.response.unprocessableEntity(percentError)
    const row = await CatalogCrud.create(ctx, Fee, 'fee', {
      ...values(payload),
      code: payload.code,
      isSystem: false,
    })
    return ctx.response.created({
      message: 'Fee saved',
      data: new FeeTransformer(row as Fee).toObject(),
    })
  }

  async update(ctx: HttpContext) {
    const row = await Fee.findOrFail(ctx.params.id)
    const payload = await ctx.request.validateUsing(updateFeeValidator)
    if (tooHighPercent(payload)) return ctx.response.unprocessableEntity(percentError)
    await CatalogCrud.update(ctx, row, 'fee', values(payload))
    return ctx.response.ok({ message: 'Fee updated', data: new FeeTransformer(row).toObject() })
  }
}
