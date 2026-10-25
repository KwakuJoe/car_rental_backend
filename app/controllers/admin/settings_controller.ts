import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import AuditService from '#services/audit_service'
import SettingsService from '#services/settings/settings_service'
import { settingGroups } from '#services/settings/definitions'
import { updateSettingsValidator } from '#validators/setting'

export default class SettingsController {
  async index({ response }: HttpContext) {
    return response.ok({
      message: 'Settings fetched successfully',
      data: { groups: settingGroups, settings: await SettingsService.all() },
    })
  }

  /** Partial update: { values: { "booking.min_driver_age": 23, ... } }. */
  async update(ctx: HttpContext) {
    const { auth, request, response } = ctx
    const { values } = await request.validateUsing(updateSettingsValidator)

    const errors = SettingsService.validate(values)
    if (errors.length) {
      return response.unprocessableEntity({ errors })
    }

    await db.transaction(async (trx) => {
      const changes = await SettingsService.update(values, auth.getUserOrFail().id, trx)
      if (Object.keys(changes.after).length) {
        await AuditService.record(
          ctx,
          {
            action: 'settings.updated',
            subject: { type: 'settings', label: 'Business rules' },
            ...changes,
          },
          trx
        )
      }
    })

    return response.ok({
      message: 'Settings updated successfully',
      data: { settings: await SettingsService.all() },
    })
  }
}
