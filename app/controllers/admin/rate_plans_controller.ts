import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import Car from '#models/car'
import Category from '#models/category'
import RatePlan from '#models/rate_plan'
import RatePlanFilter from '#filters/rate_plan_filter'
import RatePlanTransformer from '#transformers/rate_plan_transformer'
import AuditService from '#services/audit_service'
import {
  createRatePlanValidator,
  ratePlanFilterValidator,
  updateRatePlanValidator,
} from '#validators/rate_plan'
import type { Infer } from '@vinejs/vine/types'

type RatePlanPayload = Infer<typeof createRatePlanValidator>

class RatePlanRuleError extends Error {
  constructor(
    public field: string,
    message: string
  ) {
    super(message)
  }
}

/**
 * Cross-field rules, and clearing fields that don't apply so a plan never
 * carries stale chauffeur or mileage values.
 */
async function normalise(payload: RatePlanPayload) {
  const category = await Category.findOrFail(payload.categoryId)

  if (payload.carId) {
    const car = await Car.findOrFail(payload.carId)
    if (car.categoryId !== category.id) {
      throw new RatePlanRuleError(
        'carId',
        `This car is in another category. Choose the car's own category (${car.make} ${car.model}).`
      )
    }
  }

  if (payload.driveType === 'self_drive' && !category.selfDriveAllowed) {
    throw new RatePlanRuleError(
      'driveType',
      `${category.name} is chauffeur-only, so it can't have a self-drive rate.`
    )
  }

  const mileageMode = payload.mileageMode ?? 'default'
  if (
    mileageMode === 'limited' &&
    (!payload.includedKmPerDay ||
      payload.excessKmAmount === null ||
      payload.excessKmAmount === undefined)
  ) {
    throw new RatePlanRuleError(
      'includedKmPerDay',
      'Limited mileage needs the free km per day and the price per extra km.'
    )
  }

  const chauffeur = payload.driveType === 'chauffeur'
  return {
    categoryId: category.id,
    carId: payload.carId ?? null,
    driveType: payload.driveType,
    dailyAmount: payload.dailyAmount,
    weeklyAmount: payload.weeklyAmount ?? null,
    monthlyAmount: payload.monthlyAmount ?? null,
    mileageMode,
    includedKmPerDay: mileageMode === 'limited' ? payload.includedKmPerDay! : null,
    excessKmAmount: mileageMode === 'limited' ? payload.excessKmAmount! : null,
    outOfTownDailyAmount: chauffeur ? (payload.outOfTownDailyAmount ?? null) : null,
    driverOvernightAmount: chauffeur ? (payload.driverOvernightAmount ?? null) : null,
    driverHoursPerDay: chauffeur ? (payload.driverHoursPerDay ?? null) : null,
    driverOvertimeHourAmount: chauffeur ? (payload.driverOvertimeHourAmount ?? null) : null,
    fuelIncluded: chauffeur ? (payload.fuelIncluded ?? false) : false,
    effectiveFrom: payload.effectiveFrom ?? null,
    effectiveTo: payload.effectiveTo ?? null,
    active: payload.active ?? true,
    notes: payload.notes ?? null,
  }
}

/** Turns rule and overlap errors into 422/409 responses; rethrows anything else. */
function handleError(error: any, response: HttpContext['response']) {
  if (error instanceof RatePlanRuleError) {
    return response.unprocessableEntity({
      message: error.message,
      errors: [{ field: error.field, rule: 'rate_plan', message: error.message }],
    })
  }
  // Postgres 23P01: exclusion_violation on rate_plans_no_overlap
  if (error?.code === '23P01' || error?.message?.includes('rate_plans_no_overlap')) {
    return response.conflict({
      message:
        'There is already an active rate for this vehicle and drive type on some of these dates. ' +
        'Give the existing rate an end date, or deactivate it, first.',
      code: 'E_RATE_OVERLAP',
    })
  }
  throw error
}

function label(plan: RatePlan, category: Category) {
  const drive = plan.driveType === 'chauffeur' ? 'chauffeur' : 'self-drive'
  return `${category.name} ${drive} rate${plan.carId ? ' (car override)' : ''}`
}

async function loadForResponse(plan: RatePlan) {
  await plan.load('category')
  await plan.load('car')
  return new RatePlanTransformer(plan).toObject()
}

export default class RatePlansController {
  async index({ request, response }: HttpContext) {
    const payload = await request.validateUsing(ratePlanFilterValidator)
    const query = RatePlan.query().preload('category').preload('car')
    const plans = await new RatePlanFilter(query, { ...payload })
      .apply()
      .paginate(payload.page ?? 1, payload.limit ?? 50)

    return response.ok({
      message: 'Rate plans fetched successfully',
      data: plans.all().map((plan) => new RatePlanTransformer(plan).toObject()),
      meta: plans.getMeta(),
    })
  }

  async show({ params, response }: HttpContext) {
    const plan = await RatePlan.findOrFail(params.id)
    return response.ok({
      message: 'Rate plan fetched successfully',
      data: await loadForResponse(plan),
    })
  }

  async store(ctx: HttpContext) {
    const { auth, request, response } = ctx
    const payload = await request.validateUsing(createRatePlanValidator)

    try {
      const values = await normalise(payload)
      const plan = await db.transaction(async (trx) => {
        const created = await RatePlan.create(
          { ...values, createdBy: auth.getUserOrFail().id },
          { client: trx }
        )
        const category = await Category.findOrFail(created.categoryId, { client: trx })
        await AuditService.record(
          ctx,
          {
            action: 'rate_plan.created',
            subject: { type: 'rate_plan', id: created.id, label: label(created, category) },
            after: created.toJSON(),
          },
          trx
        )
        return created
      })

      return response.created({
        message: 'Rate saved',
        data: await loadForResponse(plan),
      })
    } catch (error) {
      return handleError(error, response)
    }
  }

  async update(ctx: HttpContext) {
    const { params, request, response } = ctx
    const plan = await RatePlan.findOrFail(params.id)
    const payload = await request.validateUsing(updateRatePlanValidator)

    try {
      const values = await normalise(payload)
      await db.transaction(async (trx) => {
        plan.useTransaction(trx)
        const before = plan.toJSON()
        plan.merge(values)
        await plan.save()
        const category = await Category.findOrFail(plan.categoryId, { client: trx })
        await AuditService.record(
          ctx,
          {
            action: 'rate_plan.updated',
            subject: { type: 'rate_plan', id: plan.id, label: label(plan, category) },
            before,
            after: plan.toJSON(),
          },
          trx
        )
      })

      return response.ok({
        message: 'Rate updated',
        data: await loadForResponse(plan),
      })
    } catch (error) {
      return handleError(error, response)
    }
  }
}
