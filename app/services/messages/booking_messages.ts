import encryption from '@adonisjs/core/services/encryption'
import logger from '@adonisjs/core/services/logger'
import type Booking from '#models/booking'
import Business from '#models/business'
import Car from '#models/car'
import Customer from '#models/customer'
import MessageService from '#services/messages/message_service'
import env from '#start/env'
import { formatMoney } from '#helpers/money'

type Content = {
  subject: string
  sms: string
  lines: string[]
  button?: { label: string; url: string }
}

const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
  )

/** "024 123 4567" for Ghana numbers, as people dial them */
const dial = (phone: string | null | undefined) => {
  const match = phone?.match(/^\+233(\d{2})(\d{3})(\d{4})$/)
  return match ? `0${match[1]}${match[2]}${match[3]}` : (phone ?? '')
}

/**
 * What online customers are told, by SMS and email, at each step of a
 * website booking. Only for bookings made on the website (they have a
 * private link); staff bookings get messages with Phase 6.
 */
export default class BookingMessages {
  static websiteUrl() {
    return (env.get('WEBSITE_URL') ?? 'http://localhost:3000').replace(/\/$/, '')
  }

  /** The private link, from the encrypted copy (null for staff bookings). */
  static link(booking: Booking, token?: string) {
    const secret =
      token ??
      (booking.publicTokenEncrypted
        ? encryption.decrypt<string>(booking.publicTokenEncrypted)
        : null)
    return secret ? `${this.websiteUrl()}/booking/${secret}` : null
  }

  private static async context(booking: Booking) {
    const [business, customer, car] = await Promise.all([
      Business.query().firstOrFail(),
      Customer.findOrFail(booking.customerId),
      Car.findOrFail(booking.carId),
    ])
    const zone = business.timezone || 'Africa/Accra'
    return {
      business,
      customer,
      name: business.tradingName || business.name,
      first: customer.fullName.split(/\s+/)[0],
      car: car.publicTitle || `${car.make} ${car.model}`,
      pickup: booking.pickupAt.setZone(zone).toFormat('ccc d LLL, HH:mm'),
      returns: booking.returnAt.setZone(zone).toFormat('ccc d LLL, HH:mm'),
      hold: booking.holdExpiresAt?.setZone(zone).toFormat('ccc d LLL, HH:mm') ?? null,
    }
  }

  /** SMS to the customer's phone and, when they gave one, an email. */
  private static async send(booking: Booking, kind: string, content: Content) {
    const { business, customer, name } = await this.context(booking)
    await MessageService.queue({
      channel: 'sms',
      to: customer.phone,
      kind,
      body: content.sms,
      bookingId: booking.id,
    })
    if (customer.email) {
      const text = [
        ...content.lines,
        content.button ? `${content.button.label}: ${content.button.url}` : '',
      ]
        .filter(Boolean)
        .join('\n\n')
      await MessageService.queue({
        channel: 'email',
        to: customer.email,
        kind,
        subject: content.subject,
        body: `${text}\n\n${name}${business.phone ? ` · ${dial(business.phone)}` : ''}`,
        html: this.html(business, name, content),
        bookingId: booking.id,
      })
    }
  }

  /** A plain, branded email that reads well in any client. */
  private static html(business: Business, name: string, content: Content) {
    const paragraphs = content.lines
      .map((line) => `<p style="margin:0 0 14px;line-height:1.55">${escape(line)}</p>`)
      .join('')
    const button = content.button
      ? `<p style="margin:22px 0"><a href="${escape(content.button.url)}" style="background:#fb242f;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;display:inline-block">${escape(content.button.label)}</a></p>`
      : ''
    const contact = [business.phone && dial(business.phone), business.email]
      .filter(Boolean)
      .join(' · ')
    return `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#111827">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden">
<tr><td style="height:5px;background:#fb242f"></td></tr>
<tr><td style="padding:24px 28px 8px;font-size:18px;font-weight:700">${escape(name)}</td></tr>
<tr><td style="padding:8px 28px 20px;font-size:15px">${paragraphs}${button}</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280">${escape(contact)}</td></tr>
</table></td></tr></table></body></html>`
  }

  /** Booked online: held for N hours, here's how to pay. */
  static async received(booking: Booking, token: string, owedNow: number) {
    try {
      const c = await this.context(booking)
      const url = this.link(booking, token)!
      const b = c.business
      const momo = b.momoNumber ? `MoMo ${dial(b.momoNumber)} (${b.momoName ?? c.name})` : null
      const bank = b.bankAccountNumber ? `${b.bankName} ${b.bankAccountNumber}` : null
      const payTo = momo ?? bank ?? 'us'
      await this.send(booking, 'booking_received', {
        subject: `Booking ${booking.reference} - pay to confirm`,
        sms: `${c.name}: Hi ${c.first}, ${c.car} is held for you until ${c.hold} (booking ${booking.reference}). Pay ${formatMoney(owedNow)} to ${payTo}, reference ${booking.reference}, then tell us here: ${url}`,
        lines: [
          `Hi ${c.first},`,
          `Thanks for booking the ${c.car}, ${c.pickup} to ${c.returns}. We're holding it for you until ${c.hold}.`,
          `To confirm, pay ${formatMoney(owedNow)}${momo ? ` by ${momo}` : ''}${momo && bank ? ' or' : ''}${bank ? ` by bank transfer to ${bank} (${b.bankAccountName ?? c.name})` : ''}. Use ${booking.reference} as the reference.`,
          'Then enter the transaction ID on your booking page so we can check it.',
        ],
        button: { label: 'Open my booking', url },
      })
    } catch (error) {
      logger.error(
        { bookingId: booking.id, err: (error as Error).message },
        'Booking message failed'
      )
    }
  }

  /** Staff verified a payment: confirmed (or part paid). */
  static async paymentVerified(booking: Booking, amount: number) {
    if (!booking.publicTokenEncrypted) return
    try {
      const c = await this.context(booking)
      const url = this.link(booking)!
      const confirmed = booking.status === 'confirmed'
      const balance = Math.max(0, booking.balanceAmount)
      await this.send(booking, confirmed ? 'booking_confirmed' : 'payment_received', {
        subject: confirmed
          ? `Booking ${booking.reference} is confirmed`
          : `Payment received - ${booking.reference}`,
        sms: confirmed
          ? `${c.name}: Booking ${booking.reference} is confirmed! ${c.car}, pickup ${c.pickup}. Bring your ID and driving licence.${balance ? ` Balance ${formatMoney(balance)} due at pickup.` : ''} ${url}`
          : `${c.name}: We received ${formatMoney(amount)} for booking ${booking.reference}. ${url}`,
        lines: confirmed
          ? [
              `Hi ${c.first},`,
              `We received ${formatMoney(amount)} - your booking ${booking.reference} is confirmed.`,
              `${c.car}, ${c.pickup} to ${c.returns}.`,
              `Please bring your Ghana Card (or passport) and driving licence to the pickup.${balance ? ` The balance of ${formatMoney(balance)} and the security deposit are paid at pickup.` : ''}`,
            ]
          : [
              `Hi ${c.first},`,
              `We received ${formatMoney(amount)} for booking ${booking.reference}. Thank you.`,
            ],
        button: { label: 'View my booking', url },
      })
    } catch (error) {
      logger.error(
        { bookingId: booking.id, err: (error as Error).message },
        'Booking message failed'
      )
    }
  }

  /** Staff couldn't find the payment in the statement. */
  static async paymentNotFound(booking: Booking, transactionRef: string | null) {
    if (!booking.publicTokenEncrypted) return
    try {
      const c = await this.context(booking)
      const url = this.link(booking)!
      const phone = dial(c.business.phone)
      await this.send(booking, 'payment_not_found', {
        subject: `We couldn't find your payment - ${booking.reference}`,
        sms: `${c.name}: We couldn't find your payment${transactionRef ? ` (ref ${transactionRef})` : ''} for booking ${booking.reference}. Please check the transaction ID and send it again: ${url}${phone ? ` or call ${phone}` : ''}`,
        lines: [
          `Hi ${c.first},`,
          `We couldn't find your payment${transactionRef ? ` with transaction ID ${transactionRef}` : ''} for booking ${booking.reference}.`,
          `Please check the transaction ID and send it again from your booking page${phone ? `, or call us on ${phone}` : ''}.`,
        ],
        button: { label: 'Open my booking', url },
      })
    } catch (error) {
      logger.error(
        { bookingId: booking.id, err: (error as Error).message },
        'Booking message failed'
      )
    }
  }

  /** The hold ran out without a payment: the car is released. */
  static async expired(booking: Booking) {
    if (!booking.publicTokenEncrypted) return
    try {
      const c = await this.context(booking)
      const site = this.websiteUrl()
      await this.send(booking, 'booking_expired', {
        subject: `Booking ${booking.reference} has expired`,
        sms: `${c.name}: Booking ${booking.reference} was released - we didn't receive the payment in time. You're welcome to book again: ${site}`,
        lines: [
          `Hi ${c.first},`,
          `We didn't receive the payment for booking ${booking.reference} in time, so the ${c.car} has been released.`,
          'You are welcome to book again.',
        ],
        button: { label: 'Book again', url: site },
      })
    } catch (error) {
      logger.error(
        { bookingId: booking.id, err: (error as Error).message },
        'Booking message failed'
      )
    }
  }

  /** "Find my booking": the link again, to the phone and email on record. */
  static async resendLink(booking: Booking) {
    const url = this.link(booking)
    if (!url) return
    const c = await this.context(booking)
    await this.send(booking, 'booking_link', {
      subject: `Your booking ${booking.reference}`,
      sms: `${c.name}: Your booking ${booking.reference}: ${url}`,
      lines: [`Hi ${c.first},`, `Here is the link to your booking ${booking.reference}.`],
      button: { label: 'Open my booking', url },
    })
  }
}
