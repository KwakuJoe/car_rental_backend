import encryption from '@adonisjs/core/services/encryption'
import logger from '@adonisjs/core/services/logger'
import type Booking from '#models/booking'
import Car from '#models/car'
import Customer from '#models/customer'
import DeliveryZone from '#models/delivery_zone'
import {
  dial,
  loadBrand,
  renderContent,
  websiteUrl,
  type EmailContent,
} from '#mails/branded_message'
import MessageService from '#services/messages/message_service'
import { formatMoney } from '#helpers/money'

const GREEN = '#16a34a'
const AMBER = '#d97706'

/**
 * What online customers are told, by SMS and email, at each step of a
 * website booking. Only for bookings made on the website (they have a
 * private link); staff bookings get messages with Phase 6.
 */
export default class BookingMessages {
  static websiteUrl() {
    return websiteUrl()
  }

  /** The private link, from the encrypted copy (null for staff bookings). */
  static link(booking: Booking, token?: string) {
    const secret =
      token ??
      (booking.publicTokenEncrypted
        ? encryption.decrypt<string>(booking.publicTokenEncrypted)
        : null)
    return secret ? `${websiteUrl()}/booking/${secret}` : null
  }

  private static async context(booking: Booking) {
    const [{ business, brand }, customer, car, zone] = await Promise.all([
      loadBrand(),
      Customer.findOrFail(booking.customerId),
      Car.findOrFail(booking.carId),
      booking.deliveryZoneId ? DeliveryZone.find(booking.deliveryZoneId) : null,
    ])
    const tz = business.timezone || 'Africa/Accra'
    const pickup = booking.pickupAt.setZone(tz)
    return {
      business,
      brand,
      customer,
      name: brand.name,
      first: customer.fullName.split(/\s+/)[0],
      car: car.publicTitle || `${car.make} ${car.model}`,
      pickup: pickup.toFormat('ccc d LLL, HH:mm'),
      returns: booking.returnAt.setZone(tz).toFormat('ccc d LLL, HH:mm'),
      hold: booking.holdExpiresAt?.setZone(tz).toFormat('ccc d LLL, HH:mm') ?? null,
      where: zone ? `Delivered - ${zone.name}` : 'Our office',
    }
  }

  /** The trip as detail rows (every customer email shows them). */
  private static trip(booking: Booking, c: Awaited<ReturnType<typeof BookingMessages.context>>) {
    return {
      title: 'Your booking',
      rows: [
        { label: 'Reference', value: booking.reference },
        { label: 'Car', value: c.car },
        { label: 'Pick-up', value: c.pickup },
        { label: 'Return', value: c.returns },
        { label: 'Where', value: c.where },
      ],
    }
  }

  /** SMS to the customer's phone and, when they gave one, the branded email. */
  private static async send(booking: Booking, kind: string, sms: string, email: EmailContent) {
    const c = await this.context(booking)
    await MessageService.queue({
      channel: 'sms',
      to: c.customer.phone,
      kind,
      body: sms,
      bookingId: booking.id,
    })
    if (c.customer.email) {
      const { html, text } = renderContent(
        c.brand,
        email,
        `You're receiving this because you booked a car with ${c.name}.`
      )
      await MessageService.queue({
        channel: 'email',
        to: c.customer.email,
        kind,
        subject: email.subject,
        body: text,
        html,
        bookingId: booking.id,
      })
    }
  }

  private static failed(booking: Booking, error: unknown) {
    logger.error({ bookingId: booking.id, err: (error as Error).message }, 'Booking message failed')
  }

  /** Booked online: held for N hours, here's how to pay. */
  static async received(booking: Booking, token: string, owedNow: number) {
    try {
      const c = await this.context(booking)
      const url = this.link(booking, token)!
      const b = c.business
      const momo = b.momoNumber ? `${dial(b.momoNumber)} (${b.momoName ?? c.name})` : null
      const bank = b.bankAccountNumber ? `${b.bankName ?? 'Bank'} ${b.bankAccountNumber}` : null
      await this.send(
        booking,
        'booking_received',
        `${c.name}: Hi ${c.first}, the ${c.car} is held for you until ${c.hold}. Pay ${formatMoney(owedNow)} to ${momo ? `MoMo ${momo}` : (bank ?? 'us')}, ref ${booking.reference}, then confirm here: ${url}`,
        {
          subject: `Pay to confirm - booking ${booking.reference}`,
          preheader: `Your ${c.car} is held until ${c.hold}. Pay ${formatMoney(owedNow)} to confirm.`,
          eyebrow: { text: 'Action needed' },
          heading: `Hi ${c.first}, your car is held`,
          paragraphs: [
            `Thanks for booking the ${c.car}. We're holding it for you until ${c.hold} - pay below to confirm it.`,
          ],
          amount: {
            label: 'To confirm',
            value: formatMoney(owedNow),
            note: `Use ${booking.reference} as the payment reference.`,
          },
          details: {
            title: 'How to pay',
            rows: [
              ...(momo ? [{ label: 'Mobile Money', value: momo }] : []),
              ...(bank
                ? [
                    {
                      label: 'Bank transfer',
                      value: `${bank}${b.bankAccountName ? ` (${b.bankAccountName})` : ''}`,
                    },
                  ]
                : []),
              { label: 'Reference', value: booking.reference },
            ],
          },
          button: { label: 'I’ve paid - open my booking', url },
          notes: [
            'After paying, enter the transaction ID on your booking page and we’ll confirm by SMS.',
            `${c.car} · ${c.pickup} → ${c.returns}`,
          ],
        }
      )
    } catch (error) {
      this.failed(booking, error)
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
      await this.send(
        booking,
        confirmed ? 'booking_confirmed' : 'payment_received',
        confirmed
          ? `${c.name}: Booking ${booking.reference} is confirmed! ${c.car}, pickup ${c.pickup}. Bring your ID and driving licence.${balance ? ` Balance ${formatMoney(balance)} at pickup.` : ''} ${url}`
          : `${c.name}: We received ${formatMoney(amount)} for booking ${booking.reference}. Thank you! ${url}`,
        confirmed
          ? {
              subject: `You're confirmed - booking ${booking.reference}`,
              preheader: `We received ${formatMoney(amount)}. See you on ${c.pickup}.`,
              eyebrow: { text: 'Confirmed', color: GREEN },
              heading: `You're all set, ${c.first}!`,
              paragraphs: [
                `We received ${formatMoney(amount)} - your booking is confirmed. See you on ${c.pickup}.`,
              ],
              ...(balance
                ? {
                    amount: {
                      label: 'Balance at pickup',
                      value: formatMoney(balance),
                      note: 'Plus the refundable security deposit, paid at pickup.',
                    },
                  }
                : {}),
              details: this.trip(booking, c),
              button: { label: 'View my booking', url },
              notes: [
                'Bring your Ghana Card (or passport) and your driving licence. We’ll inspect the car with you.',
              ],
            }
          : {
              subject: `Payment received - booking ${booking.reference}`,
              preheader: `We received ${formatMoney(amount)}. Thank you.`,
              eyebrow: { text: 'Payment received', color: GREEN },
              heading: `Thank you, ${c.first}`,
              paragraphs: [`We received ${formatMoney(amount)} for booking ${booking.reference}.`],
              details: this.trip(booking, c),
              button: { label: 'View my booking', url },
            }
      )
    } catch (error) {
      this.failed(booking, error)
    }
  }

  /** Staff couldn't find the payment in the statement. */
  static async paymentNotFound(booking: Booking, transactionRef: string | null) {
    if (!booking.publicTokenEncrypted) return
    try {
      const c = await this.context(booking)
      const url = this.link(booking)!
      const phone = dial(c.business.phone)
      await this.send(
        booking,
        'payment_not_found',
        `${c.name}: We couldn't find your payment${transactionRef ? ` (ref ${transactionRef})` : ''} for booking ${booking.reference}. Please check the transaction ID and send it again: ${url}${phone ? ` or call ${phone}` : ''}`,
        {
          subject: `We couldn't find your payment - ${booking.reference}`,
          preheader: 'Please check the transaction ID and send it again.',
          eyebrow: { text: 'Please check', color: AMBER },
          heading: 'We couldn’t find your payment',
          paragraphs: [
            `Hi ${c.first}, we couldn't find the payment${transactionRef ? ` with transaction ID ${transactionRef}` : ''} for booking ${booking.reference} in our statement.`,
            `Please check the transaction ID in your MoMo or bank message and send it again from your booking page${phone ? ` - or call us on ${phone}` : ''}.`,
          ],
          button: { label: 'Open my booking', url },
          notes: c.hold ? [`Your car is still held until ${c.hold}.`] : [],
        }
      )
    } catch (error) {
      this.failed(booking, error)
    }
  }

  /** The hold ran out without a payment: the car is released. */
  static async expired(booking: Booking) {
    if (!booking.publicTokenEncrypted) return
    try {
      const c = await this.context(booking)
      const site = websiteUrl()
      await this.send(
        booking,
        'booking_expired',
        `${c.name}: Booking ${booking.reference} was released - we didn't receive the payment in time. You're welcome to book again: ${site}`,
        {
          subject: `Booking ${booking.reference} has expired`,
          preheader: 'We didn’t receive the payment in time.',
          eyebrow: { text: 'Expired', color: '#6b7280' },
          heading: 'Your booking has expired',
          paragraphs: [
            `Hi ${c.first}, we didn't receive the payment for booking ${booking.reference} in time, so the ${c.car} has been released.`,
            'You’re welcome to book again - it only takes a few minutes.',
          ],
          button: { label: 'Book again', url: `${site}/cars` },
        }
      )
    } catch (error) {
      this.failed(booking, error)
    }
  }

  /** "Find my booking": the link again, to the phone and email on record. */
  static async resendLink(booking: Booking) {
    const url = this.link(booking)
    if (!url) return
    const c = await this.context(booking)
    await this.send(
      booking,
      'booking_link',
      `${c.name}: Your booking ${booking.reference}: ${url}`,
      {
        subject: `Your booking ${booking.reference}`,
        preheader: 'Here’s the link to your booking page.',
        heading: `Here's your booking, ${c.first}`,
        paragraphs: ['You asked for the link to your booking page - here it is.'],
        details: this.trip(booking, c),
        button: { label: 'Open my booking', url },
        notes: ['Didn’t ask for this? You can ignore this email - the link only ever goes to you.'],
      }
    )
  }
}
