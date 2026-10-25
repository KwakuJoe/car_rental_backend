import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import Branch from '#models/branch'
import ClosureDate from '#models/closure_date'
import ClosureDateTransformer from '#transformers/closure_date_transformer'
import { closureDateFilterValidator, createClosureDateValidator } from '#validators/branch'
import AuditService from '#services/audit_service'

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

  async store(ctx: HttpContext) {
    const { params, request, response, serialize } = ctx
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
    await AuditService.record(ctx, {
      action: 'closure_date.created',
      subject: { type: 'branch', id: branch.id, label: branch.name },
      after: { date: day.toISODate(), reason: closure.reason },
    })
    const transformed = await serialize(ClosureDateTransformer.transform(closure))
    return response.created({ message: 'Closure date added successfully', data: transformed.data })
  }

  async destroy(ctx: HttpContext) {
    const { params, response } = ctx
    const closure = await ClosureDate.query()
      .where('branch_id', params.branchId)
      .where('id', params.id)
      .preload('branch')
      .firstOrFail()
    await closure.delete()
    await AuditService.record(ctx, {
      action: 'closure_date.deleted',
      subject: { type: 'branch', id: closure.branchId, label: closure.branch.name },
      before: { date: closure.date.toISODate(), reason: closure.reason },
    })
    return response.ok({ message: 'Closure date removed successfully' })
  }
}
