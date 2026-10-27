import { DateTime } from 'luxon'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import Booking from '#models/booking'
import Business from '#models/business'
import BookingMessages from '#services/messages/booking_messages'
import SettingsService from '#services/settings/settings_service'

/** Not already sent: the reminder's kind for this booking isn't in the outbox yet */
const notSent = (kind: string) => (query: ModelQueryBuilderContract<typeof Booking>) =>
  query.whereNotExists((sub) =>
    sub
      .from('outbound_messages')
      .whereColumn('outbound_messages.booking_id', 'bookings.id')
      .where('outbound_messages.kind', kind)
  )

/**
 * Customer reminders (Settings → Business rules → Customer reminders): before
 * pickup, before the return, and before an unpaid online hold ends. Each goes
 * once per booking, never at night (when quiet hours are on), and not when
 * it would be pointless (a booking made an hour before pickup gets no
 * "pickup tomorrow" message). The queue runs this every 15 minutes.
 */
export default class Reminders {
  static async run(now: DateTime = DateTime.now()) {
    const [pickupHours, returnHours, holdHours, quiet, business] = await Promise.all([
      SettingsService.get('reminders.pickup_hours_before'),
      SettingsService.get('reminders.return_hours_before'),
      SettingsService.get('reminders.hold_hours_before'),
      SettingsService.get('reminders.quiet_hours'),
      Business.query().first(),
    ])
    const local = now.setZone(business?.timezone || 'Africa/Accra')
    const sent = { pickup: 0, return: 0, hold: 0 }
    if (quiet && (local.hour < 7 || local.hour >= 21)) return sent
    const at = (date: DateTime) => date.toSQL()!

    if (pickupHours > 0) {
      const due = await Booking.query()
        .where('status', 'confirmed')
        .where('pickup_at', '>', at(now))
        .where('pickup_at', '<=', at(now.plus({ hours: pickupHours })))
        // Booked well before the reminder window - otherwise they know already
        .whereRaw('created_at < pickup_at - make_interval(hours => ?)', [pickupHours])
        .where(notSent('pickup_reminder'))
      for (const booking of due) {
        await BookingMessages.pickupReminder(booking)
        sent.pickup++
      }
    }

    if (returnHours > 0) {
      const due = await Booking.query()
        .where('status', 'on_rent')
        .where('return_at', '>', at(now))
        .where('return_at', '<=', at(now.plus({ hours: returnHours })))
        .whereRaw('pickup_at < return_at - make_interval(hours => ?)', [returnHours])
        .where(notSent('return_reminder'))
      for (const booking of due) {
        await BookingMessages.returnReminder(booking)
        sent.return++
      }
    }

    if (holdHours > 0) {
      const due = await Booking.query()
        .where('status', 'pending')
        .whereNotNull('public_token_encrypted')
        .where('hold_expires_at', '>', at(now))
        .where('hold_expires_at', '<=', at(now.plus({ hours: holdHours })))
        .whereRaw('created_at < hold_expires_at - make_interval(hours => ?)', [holdHours])
        // Nothing paid or sent yet
        .whereNotExists((query) =>
          query.from('payments').whereColumn('payments.booking_id', 'bookings.id')
        )
        .where(notSent('hold_reminder'))
      for (const booking of due) {
        await BookingMessages.holdReminder(booking)
        sent.hold++
      }
    }
    return sent
  }
}
