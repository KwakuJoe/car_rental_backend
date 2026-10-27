import logger from '@adonisjs/core/services/logger'
import AlertRecipient, { STAFF_ALERTS, type StaffAlertKey } from '#models/alert_recipient'
import type Booking from '#models/booking'
import Business from '#models/business'
import Car from '#models/car'
import Customer from '#models/customer'
import OutboundMessage from '#models/outbound_message'
import { loadBrand, renderContent, websiteUrl, type EmailContent } from '#mails/branded_message'
import MessageService from '#services/messages/message_service'
import { dial } from '#mails/branded_message'
import { formatMoney } from '#helpers/money'

export type StaffAlert = {
  /** The SMS - short, with what to do */
  sms: string
  email: Omit<EmailContent, 'button'> & {
    /** Dashboard path the button opens, e.g. /dashboard/payments */
    path?: string
    buttonLabel?: string
  }
  bookingId?: string | null
  /** At most once per booking (scheduled checks run again and again) */
  oncePerBooking?: boolean
}

/**
 * SMS / email alerts to the team, to whoever is on the alert list in
 * Settings → Notifications for that alert (staff or not). Goes through the
 * same outbox as customer messages (retries, never sent from tests). Never
 * throws: an alert going wrong mustn't break the booking that caused it.
 */
export default class StaffAlerts {
  static async send(key: StaffAlertKey, alert: StaffAlert) {
    try {
      const kind = `staff_${key}`
      if (alert.oncePerBooking && alert.bookingId) {
        const already = await OutboundMessage.query()
          .where('kind', kind)
          .where('booking_id', alert.bookingId)
          .first()
        if (already) return 0
      }
      const active = await AlertRecipient.query().where('active', true)
      const recipients = active.filter((recipient) => (recipient.alerts[key] ?? []).length > 0)
      if (recipients.length === 0) return 0

      const { brand } = await loadBrand()
      const label = STAFF_ALERTS.find((item) => item.key === key)!.label
      const { html, text } = renderContent(
        brand,
        {
          ...alert.email,
          button: alert.email.path
            ? {
                label: alert.email.buttonLabel ?? 'Open the dashboard',
                url: `${websiteUrl()}${alert.email.path}`,
              }
            : undefined,
        },
        `Staff alert - you're on the "${label}" alert list in Settings → Notifications.`
      )
      let queued = 0
      for (const recipient of recipients) {
        const channels = recipient.alerts[key] ?? []
        if (channels.includes('sms') && recipient.phone) {
          await MessageService.queue({
            channel: 'sms',
            to: recipient.phone,
            kind,
            body: alert.sms,
            bookingId: alert.bookingId ?? null,
          })
          queued++
        }
        if (channels.includes('email') && recipient.email) {
          await MessageService.queue({
            channel: 'email',
            to: recipient.email,
            kind,
            subject: alert.email.subject,
            body: text,
            html,
            bookingId: alert.bookingId ?? null,
          })
          queued++
        }
      }
      return queued
    } catch (error) {
      logger.error({ alert: key, err: (error as Error).message }, 'Staff alert failed')
      return 0
    }
  }

  /** A booking as staff see it in an alert: who, which car, when, how much. */
  static async describe(booking: Booking) {
    const [business, customer, car] = await Promise.all([
      Business.query().firstOrFail(),
      Customer.findOrFail(booking.customerId),
      Car.findOrFail(booking.carId),
    ])
    const tz = business.timezone || 'Africa/Accra'
    const when = (value: typeof booking.pickupAt) => value.setZone(tz).toFormat('ccc d LLL, HH:mm')
    const carName = `${car.make} ${car.model} (${car.registrationNo})`
    return {
      customer: customer.fullName,
      phone: dial(customer.phone),
      car: carName,
      pickup: when(booking.pickupAt),
      returns: when(booking.returnAt),
      hold: booking.holdExpiresAt ? when(booking.holdExpiresAt) : null,
      rows: [
        { label: 'Reference', value: booking.reference },
        { label: 'Customer', value: `${customer.fullName} · ${dial(customer.phone)}` },
        { label: 'Car', value: carName },
        { label: 'Pick-up', value: when(booking.pickupAt) },
        { label: 'Return', value: when(booking.returnAt) },
        { label: 'Total', value: formatMoney(booking.totalAmount) },
      ],
    }
  }

  /** "Send a test" from Settings: one SMS and/or email to this recipient. */
  static async test(recipient: AlertRecipient) {
    const { brand } = await loadBrand()
    const { html, text } = renderContent(
      brand,
      {
        subject: `Test alert from ${brand.name}`,
        preheader: 'Alerts are set up and working.',
        eyebrow: { text: 'Test', color: '#22c55e' },
        heading: `Hi ${recipient.name.split(/\s+/)[0]}, alerts work!`,
        paragraphs: [
          'This is a test from Settings → Notifications. You’ll get alerts like this one when something needs your attention.',
        ],
      },
      'You were sent this test from Settings → Notifications.'
    )
    const sent: string[] = []
    if (recipient.phone) {
      await MessageService.queue({
        channel: 'sms',
        to: recipient.phone,
        kind: 'staff_test',
        body: `${brand.name}: Test alert - SMS alerts are working for ${recipient.name}.`,
      })
      sent.push('sms')
    }
    if (recipient.email) {
      await MessageService.queue({
        channel: 'email',
        to: recipient.email,
        kind: 'staff_test',
        subject: `Test alert from ${brand.name}`,
        body: text,
        html,
      })
      sent.push('email')
    }
    return sent
  }
}
