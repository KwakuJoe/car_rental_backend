import type { HttpContext } from '@adonisjs/core/http'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import ProtectionPlan from '#models/protection_plan'
import { ProtectionPlanTransformer } from '#transformers/pricing_catalog_transformers'
import { CatalogCrud } from '#services/pricing/catalog_crud'
import { catalogFilterValidator, protectionPlanValidator } from '#validators/pricing_catalog'
import type { Infer } from '@vinejs/vine/types'

function values(payload: Infer<typeof protectionPlanValidator>) {
  const active = payload.active ?? true
  return {
    name: payload.name,
    description: payload.description ?? null,
    perDayAmount: payload.perDayAmount,
    excessAmount: payload.excessAmount,
    depositAmountOverride: payload.depositAmountOverride ?? null,
    // An inactive plan can't be the default
    isDefault: active && (payload.isDefault ?? false),
    taxable: payload.taxable ?? true,
    availableOnline: payload.availableOnline ?? true,
    sortOrder: payload.sortOrder ?? 0,
    active,
  }
}

/** Making a plan the default takes it away from the previous one (one default). */
const clearOtherDefaults = (exceptId?: string) => async (trx: TransactionClientContract) => {
  const query = ProtectionPlan.query({ client: trx }).where('is_default', true)
  if (exceptId) query.whereNot('id', exceptId)
  await query.update({ is_default: false })
}

export default class ProtectionPlansController {
  async index({ request, response }: HttpContext) {
    const payload = await request.validateUsing(catalogFilterValidator)
    const rows = await CatalogCrud.list(ProtectionPlan, payload)
    return response.ok({
      message: 'Protection plans fetched successfully',
      data: rows.all().map((row) => new ProtectionPlanTransformer(row).toObject()),
      meta: rows.getMeta(),
    })
  }

  async store(ctx: HttpContext) {
    const payload = await ctx.request.validateUsing(protectionPlanValidator)
    const data = values(payload)
    const row = await CatalogCrud.create(
      ctx,
      ProtectionPlan,
      'protection_plan',
      data,
      data.isDefault ? clearOtherDefaults() : undefined
    )
    return ctx.response.created({
      message: 'Protection plan saved',
      data: new ProtectionPlanTransformer(row as ProtectionPlan).toObject(),
    })
  }

  async update(ctx: HttpContext) {
    const row = await ProtectionPlan.findOrFail(ctx.params.id)
    const payload = await ctx.request.validateUsing(protectionPlanValidator)
    const data = values(payload)
    await CatalogCrud.update(
      ctx,
      row,
      'protection_plan',
      data,
      data.isDefault ? clearOtherDefaults(row.id) : undefined
    )
    return ctx.response.ok({
      message: 'Protection plan updated',
      data: new ProtectionPlanTransformer(row).toObject(),
    })
  }
}
