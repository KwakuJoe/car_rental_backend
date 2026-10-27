import type { HttpContext } from '@adonisjs/core/http'
import AlertRecipient, { STAFF_ALERTS, type AlertMap } from '#models/alert_recipient'
import AuditService from '#services/audit_service'
import StaffAlerts from '#services/messages/staff_alerts'
import { alertRecipientValidator } from '#validators/alert_recipient'
import { normalizePhone } from '#helpers/phone'

const toJson = (recipient: AlertRecipient) => ({
  id: recipient.id,
  name: recipient.name,
  phone: recipient.phone,
  email: recipient.email,
  alerts: recipient.alerts,
  active: recipient.active,
})

/**
 * Settings → Notifications: who gets staff alerts by SMS / email, and
 * which ones. The catalogue of alerts comes with the list, so the
 * dashboard never hard-codes it.
 */
export default class AlertRecipientsController {
  async index({ response }: HttpContext) {
    const recipients = await AlertRecipient.query().orderBy('created_at', 'asc')
    return response.ok({
      message: 'Alert recipients fetched',
      data: recipients.map(toJson),
      alerts: STAFF_ALERTS,
    })
  }

  async store(ctx: HttpContext) {
    const values = await this.values(ctx)
    if ('error' in values) return ctx.response.unprocessableEntity(values.error)
    const recipient = await AlertRecipient.create(values)
    await AuditService.record(ctx, {
      action: 'alert_recipient.created',
      subject: { type: 'alert_recipient', id: recipient.id, label: recipient.name },
      after: toJson(recipient),
    })
    return ctx.response.created({ message: `${recipient.name} added`, data: toJson(recipient) })
  }

  async update(ctx: HttpContext) {
    const recipient = await AlertRecipient.findOrFail(ctx.params.id)
    const values = await this.values(ctx)
    if ('error' in values) return ctx.response.unprocessableEntity(values.error)
    const before = toJson(recipient)
    recipient.merge(values)
    await recipient.save()
    await AuditService.record(ctx, {
      action: 'alert_recipient.updated',
      subject: { type: 'alert_recipient', id: recipient.id, label: recipient.name },
      before,
      after: toJson(recipient),
    })
    return ctx.response.ok({ message: 'Saved', data: toJson(recipient) })
  }

  async destroy(ctx: HttpContext) {
    const recipient = await AlertRecipient.findOrFail(ctx.params.id)
    await recipient.delete()
    await AuditService.record(ctx, {
      action: 'alert_recipient.deleted',
      subject: { type: 'alert_recipient', id: recipient.id, label: recipient.name },
      before: toJson(recipient),
    })
    return ctx.response.ok({ message: `${recipient.name} removed` })
  }

  /** One SMS and/or email to this person, to check it reaches them. */
  async test({ params, response }: HttpContext) {
    const recipient = await AlertRecipient.findOrFail(params.id)
    const sent = await StaffAlerts.test(recipient)
    return response.ok({
      message: `Test sent by ${sent.join(' and ')} - it should arrive within a minute.`,
      data: { sent },
    })
  }

  /** Validated values, the phone in international form; a phone or an email is required. */
  private async values({ request }: HttpContext) {
    const payload = await request.validateUsing(alertRecipientValidator)
    const phone = payload.phone ? normalizePhone(payload.phone) : null
    if (payload.phone && !phone) {
      return {
        error: {
          message: 'Enter a valid phone number.',
          errors: [{ field: 'phone', message: 'Enter a valid phone number.' }],
        },
      }
    }
    const email = payload.email?.toLowerCase() || null
    if (!phone && !email) {
      return {
        error: {
          message: 'Add a phone number or an email address.',
          errors: [{ field: 'phone', message: 'Add a phone number or an email address.' }],
        },
      }
    }
    // Only keep alerts with at least one channel - and only channels this person has
    const alerts: AlertMap = {}
    for (const [key, channels] of Object.entries(payload.alerts) as [
      keyof AlertMap,
      ('sms' | 'email')[] | undefined,
    ][]) {
      const usable = (channels ?? []).filter((channel) => (channel === 'sms' ? !!phone : !!email))
      if (usable.length) alerts[key] = usable
    }
    return { name: payload.name, phone, email, alerts, active: payload.active ?? true }
  }
}
