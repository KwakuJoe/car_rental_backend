import type { HttpContext } from '@adonisjs/core/http'
import type { Infer } from '@vinejs/vine/types'
import Tax from '#models/tax'
import TaxTransformer from '#transformers/tax_transformer'
import { CatalogCrud } from '#services/pricing/catalog_crud'
import TaxService from '#services/pricing/tax_service'
import { catalogFilterValidator } from '#validators/pricing_catalog'
import { taxValidator } from '#validators/tax'

const CHARGE_ORDER = ['rental', 'extras', 'protection', 'delivery', 'fees']

const values = (payload: Infer<typeof taxValidator>) => ({
  name: payload.name,
  description: payload.description ?? null,
  rateBp: payload.rateBp,
  calculation: payload.calculation ?? 'on_net',
  appliesTo: [...payload.appliesTo].sort(
    (a, b) => CHARGE_ORDER.indexOf(a) - CHARGE_ORDER.indexOf(b)
  ),
  effectiveFrom: payload.effectiveFrom ?? null,
  effectiveTo: payload.effectiveTo ?? null,
  sortOrder: payload.sortOrder ?? 0,
  active: payload.active ?? true,
})

export default class TaxesController {
  async index({ request, response }: HttpContext) {
    const payload = await request.validateUsing(catalogFilterValidator)
    const rows = await CatalogCrud.list(Tax, payload)
    return response.ok({
      message: 'Taxes fetched successfully',
      data: rows.all().map((row) => new TaxTransformer(row).toObject()),
      meta: rows.getMeta(),
      // From the business profile (Settings > Business) - readable by anyone who can see taxes
      context: { vatRegistered: await TaxService.isVatRegistered() },
    })
  }

  async store(ctx: HttpContext) {
    const payload = await ctx.request.validateUsing(taxValidator)
    const row = await CatalogCrud.create(ctx, Tax, 'tax', values(payload))
    return ctx.response.created({
      message: 'Tax saved',
      data: new TaxTransformer(row as Tax).toObject(),
    })
  }

  async update(ctx: HttpContext) {
    const row = await Tax.findOrFail(ctx.params.id)
    const payload = await ctx.request.validateUsing(taxValidator)
    await CatalogCrud.update(ctx, row, 'tax', values(payload))
    return ctx.response.ok({ message: 'Tax updated', data: new TaxTransformer(row).toObject() })
  }
}
