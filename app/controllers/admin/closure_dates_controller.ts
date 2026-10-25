import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import Branch from '#models/branch'
import ClosureDate from '#models/closure_date'
import ClosureDateTransformer from '#transformers/closure_date_transformer'
import { closureDateFilterValidator, createClosureDateValidator } from '#validators/branch'

export default class ClosureDatesController {
  /** Defaults to upcoming dates (today onwards); pass from/to for history. */
  async index({ params, request, response, serialize }: HttpContext) {
    const branch = await Branch.findOrFail(params.branchId)
    const { from, to } = await request.validateUsing(closureDateFilterValidator)

    const query = ClosureDate.query()
      .where('branch_id', branch.id)
      .where('date', '>=', (from ?? DateTime.now()).toISODate()!)
      .orderBy('date', 'asc')
    if (to) query.where('date', '<=', to.toISODate()!)

    const transformed = await serialize(ClosureDateTransformer.transform(await query))
    return response.ok({ message: 'Closure dates fetched successfully', data: transformed.data })
  }

  async store({ params, request, response, serialize }: HttpContext) {
    const branch = await Branch.findOrFail(params.branchId)
    const { date, reason } = await request.validateUsing(createClosureDateValidator)
    const day = date

    const existing = await ClosureDate.query()
      .where('branch_id', branch.id)
      .where('date', day.toISODate()!)
      .first()
    if (existing) {
      return response.unprocessableEntity({
        errors: [
          { field: 'date', rule: 'unique', message: 'This date is already marked as closed' },
        ],
      })
    }

    const closure = await ClosureDate.create({
      branchId: branch.id,
      date: day,
      reason: reason ?? null,
    })
    const transformed = await serialize(ClosureDateTransformer.transform(closure))
    return response.created({ message: 'Closure date added successfully', data: transformed.data })
  }

  async destroy({ params, response }: HttpContext) {
    const closure = await ClosureDate.query()
      .where('branch_id', params.branchId)
      .where('id', params.id)
      .firstOrFail()
    await closure.delete()
    return response.ok({ message: 'Closure date removed successfully' })
  }
}
