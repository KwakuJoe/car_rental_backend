import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import Branch from '#models/branch'
import OpeningHour from '#models/opening_hour'
import OpeningHourTransformer from '#transformers/opening_hour_transformer'
import { updateOpeningHoursValidator } from '#validators/branch'
import AuditService from '#services/audit_service'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** { Monday: "08:00-18:00", Sunday: "closed", ... } - readable in the audit log. */
function summarize(hours: OpeningHour[]) {
  return Object.fromEntries(
    [...hours]
      .sort((a, b) => a.weekday - b.weekday)
      .map((day) => [
        DAY_NAMES[day.weekday],
        day.isClosed ? 'closed' : `${day.opensAt?.slice(0, 5)}-${day.closesAt?.slice(0, 5)}`,
      ])
  )
}

export default class OpeningHoursController {
  async index({ params, response, serialize }: HttpContext) {
    const branch = await Branch.findOrFail(params.branchId)
    const hours = await OpeningHour.query().where('branch_id', branch.id).orderBy('weekday', 'asc')
    const transformed = await serialize(OpeningHourTransformer.transform(hours))
    return response.ok({ message: 'Opening hours fetched successfully', data: transformed.data })
  }

  /** Replaces the whole week. Closed days store no times. */
  async update(ctx: HttpContext) {
    const { params, request, response, serialize } = ctx
    const branch = await Branch.findOrFail(params.branchId)
    const { days } = await request.validateUsing(updateOpeningHoursValidator)

    const invalidDay = days.find(
      (day) => !day.isClosed && (!day.opensAt || !day.closesAt || day.opensAt >= day.closesAt)
    )
    if (invalidDay) {
      return response.unprocessableEntity({
        errors: [
          {
            field: `days.${days.indexOf(invalidDay)}`,
            rule: 'openingHours',
            message: 'Open days need an opening time earlier than the closing time',
          },
        ],
      })
    }

    const previous = await OpeningHour.query().where('branch_id', branch.id)
    const hours = await db.transaction(async (trx) => {
      await OpeningHour.query({ client: trx }).where('branch_id', branch.id).delete()
      const created = await OpeningHour.createMany(
        days
          .sort((a, b) => a.weekday - b.weekday)
          .map((day) => ({
            branchId: branch.id,
            weekday: day.weekday,
            isClosed: day.isClosed,
            opensAt: day.isClosed ? null : day.opensAt!,
            closesAt: day.isClosed ? null : day.closesAt!,
          })),
        { client: trx }
      )
      await AuditService.record(
        ctx,
        {
          action: 'opening_hours.updated',
          subject: { type: 'branch', id: branch.id, label: branch.name },
          before: summarize(previous),
          after: summarize(created),
        },
        trx
      )
      return created
    })

    const transformed = await serialize(OpeningHourTransformer.transform(hours))
    return response.ok({ message: 'Opening hours updated successfully', data: transformed.data })
  }
}
