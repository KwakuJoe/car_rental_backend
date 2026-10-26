import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import type { Infer } from '@vinejs/vine/types'
import Car from '#models/car'
import Category from '#models/category'
import PricingRule from '#models/pricing_rule'
import PricingRuleFilter from '#filters/pricing_rule_filter'
import PricingRuleTransformer from '#transformers/pricing_rule_transformer'
import AuditService from '#services/audit_service'
import {
  createPricingRuleValidator,
  pricingRuleFilterValidator,
  updatePricingRuleValidator,
} from '#validators/pricing_rule'

type PricingRulePayload = Infer<typeof createPricingRuleValidator>

class PricingRuleError extends Error {
  constructor(
    public field: string,
    message: string
  ) {
    super(message)
  }
}

/** Cross-field rules; clears fields that don't apply to the rule's type or target. */
async function normalise(payload: PricingRulePayload) {
  const isWeekend = payload.type === 'weekend'

  if (!isWeekend && !payload.dateFrom) {
    throw new PricingRuleError('dateFrom', 'Choose the date (or first date) this rule applies.')
  }
  if (isWeekend && !payload.weekdays?.length) {
    throw new PricingRuleError('weekdays', 'Choose at least one day of the week.')
  }

  const recursYearly = !isWeekend && (payload.recursYearly ?? false)
  if (recursYearly && payload.dateFrom && payload.dateTo) {
    const days = payload.dateTo.diff(payload.dateFrom, 'days').days
    if (days >= 365) {
      throw new PricingRuleError(
        'dateTo',
        'A rule that repeats every year must be shorter than a year.'
      )
    }
  }

  const value = payload.adjustmentValue
  if (value === 0) {
    throw new PricingRuleError('adjustmentValue', 'Enter how much prices go up or down.')
  }
  if (payload.adjustmentType === 'percent' && (value < -10_000 || value > 50_000)) {
    throw new PricingRuleError(
      'adjustmentValue',
      'A percentage change must be between -100% and +500%.'
    )
  }

  const appliesTo = payload.appliesTo ?? 'all'
  let categoryIds: string[] | null = null
  let carIds: string[] | null = null
  if (appliesTo === 'categories') {
    categoryIds = payload.categoryIds ?? []
    const found = categoryIds.length
      ? await Category.query().whereIn('id', categoryIds).count('* as total')
      : [{ $extras: { total: 0 } }]
    if (!categoryIds.length || Number(found[0].$extras.total) !== categoryIds.length) {
      throw new PricingRuleError('categoryIds', 'Choose at least one existing category.')
    }
  }
  if (appliesTo === 'cars') {
    carIds = payload.carIds ?? []
    const found = carIds.length
      ? await Car.query().whereIn('id', carIds).count('* as total')
      : [{ $extras: { total: 0 } }]
    if (!carIds.length || Number(found[0].$extras.total) !== carIds.length) {
      throw new PricingRuleError('carIds', 'Choose at least one existing car.')
    }
  }

  return {
    name: payload.name,
    type: payload.type,
    dateFrom: payload.dateFrom ?? null,
    // One-day holidays: dateTo = dateFrom
    dateTo: payload.dateTo ?? (isWeekend ? null : (payload.dateFrom ?? null)),
    recursYearly,
    weekdays: isWeekend ? [...payload.weekdays!].sort() : null,
    adjustmentType: payload.adjustmentType,
    adjustmentValue: value,
    appliesTo,
    categoryIds,
    carIds,
    minRentalDays: payload.minRentalDays ?? null,
    priority: payload.priority ?? 0,
    stackable: payload.stackable ?? false,
    blockOnlineBooking: payload.blockOnlineBooking ?? false,
    active: payload.active ?? true,
    notes: payload.notes ?? null,
  }
}

function handleError(error: unknown, response: HttpContext['response']) {
  if (error instanceof PricingRuleError) {
    return response.unprocessableEntity({
      message: error.message,
      errors: [{ field: error.field, rule: 'pricing_rule', message: error.message }],
    })
  }
  throw error
}

/** Attach category and car names so the list can show "SUV, Executive" etc. */
async function withTargetNames(rules: PricingRule[]) {
  const categoryIds = [...new Set(rules.flatMap((rule) => rule.categoryIds ?? []))]
  const carIds = [...new Set(rules.flatMap((rule) => rule.carIds ?? []))]
  const categories = categoryIds.length ? await Category.query().whereIn('id', categoryIds) : []
  const cars = carIds.length ? await Car.query().whereIn('id', carIds) : []

  for (const rule of rules) {
    rule.$extras.categories = categories
      .filter((category) => rule.categoryIds?.includes(category.id))
      .map((category) => ({ id: category.id, label: category.name }))
    rule.$extras.cars = cars
      .filter((car) => rule.carIds?.includes(car.id))
      .map((car) => ({ id: car.id, label: `${car.make} ${car.model} (${car.registrationNo})` }))
  }
  return rules.map((rule) => new PricingRuleTransformer(rule).toObject())
}

export default class PricingRulesController {
  async index({ request, response }: HttpContext) {
    const payload = await request.validateUsing(pricingRuleFilterValidator)
    const rules = await new PricingRuleFilter(PricingRule.query(), { ...payload })
      .apply()
      .paginate(payload.page ?? 1, payload.limit ?? 50)

    return response.ok({
      message: 'Price rules fetched successfully',
      data: await withTargetNames(rules.all()),
      meta: rules.getMeta(),
    })
  }

  async show({ params, response }: HttpContext) {
    const rule = await PricingRule.findOrFail(params.id)
    const [data] = await withTargetNames([rule])
    return response.ok({ message: 'Price rule fetched successfully', data })
  }

  async store(ctx: HttpContext) {
    const { auth, request, response } = ctx
    const payload = await request.validateUsing(createPricingRuleValidator)

    try {
      const values = await normalise(payload)
      const rule = await db.transaction(async (trx) => {
        const created = await PricingRule.create(
          { ...values, createdBy: auth.getUserOrFail().id },
          { client: trx }
        )
        await AuditService.record(
          ctx,
          {
            action: 'pricing_rule.created',
            subject: { type: 'pricing_rule', id: created.id, label: created.name },
            after: created.toJSON(),
          },
          trx
        )
        return created
      })

      const [data] = await withTargetNames([rule])
      return response.created({ message: 'Price rule saved', data })
    } catch (error) {
      return handleError(error, response)
    }
  }

  async update(ctx: HttpContext) {
    const { params, request, response } = ctx
    const rule = await PricingRule.findOrFail(params.id)
    const payload = await request.validateUsing(updatePricingRuleValidator)

    try {
      const values = await normalise(payload)
      await db.transaction(async (trx) => {
        rule.useTransaction(trx)
        const before = rule.toJSON()
        rule.merge(values)
        await rule.save()
        await AuditService.record(
          ctx,
          {
            action: 'pricing_rule.updated',
            subject: { type: 'pricing_rule', id: rule.id, label: rule.name },
            before,
            after: rule.toJSON(),
          },
          trx
        )
      })

      const [data] = await withTargetNames([rule])
      return response.ok({ message: 'Price rule updated', data })
    } catch (error) {
      return handleError(error, response)
    }
  }

  /** Rules aren't referenced by bookings (quotes copy the rule name), so they can be deleted. */
  async destroy(ctx: HttpContext) {
    const { params, response } = ctx
    const rule = await PricingRule.findOrFail(params.id)

    await db.transaction(async (trx) => {
      rule.useTransaction(trx)
      await AuditService.record(
        ctx,
        {
          action: 'pricing_rule.deleted',
          subject: { type: 'pricing_rule', id: rule.id, label: rule.name },
          before: rule.toJSON(),
        },
        trx
      )
      await rule.delete()
    })

    return response.ok({ message: 'Price rule deleted' })
  }
}
