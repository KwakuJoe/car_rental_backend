import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import Branch from '#models/branch'
import OpeningHour from '#models/opening_hour'
import OpeningHourTransformer from '#transformers/opening_hour_transformer'
import { updateOpeningHoursValidator } from '#validators/branch'

export default class OpeningHoursController {
  async index({ params, response, serialize }: HttpContext) {
    const branch = await Branch.findOrFail(params.branchId)
    const hours = await OpeningHour.query().where('branch_id', branch.id).orderBy('weekday', 'asc')
    const transformed = await serialize(OpeningHourTransformer.transform(hours))
    return response.ok({ message: 'Opening hours fetched successfully', data: transformed.data })
  }

  /** Replaces the whole week. Closed days store no times. */
  async update({ params, request, response, serialize }: HttpContext) {
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

    const hours = await db.transaction(async (trx) => {
      await OpeningHour.query({ client: trx }).where('branch_id', branch.id).delete()
      return OpeningHour.createMany(
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
    })

    const transformed = await serialize(OpeningHourTransformer.transform(hours))
    return response.ok({ message: 'Opening hours updated successfully', data: transformed.data })
  }
}
