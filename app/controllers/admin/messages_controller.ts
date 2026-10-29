import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import Booking from '#models/booking'
import OutboundMessage from '#models/outbound_message'
import AuditService from '#services/audit_service'
import MessageService from '#services/messages/message_service'
import { listMessagesValidator } from '#validators/message'

/** What staff see of a message (the email's HTML stays out - subject and text are enough) */
const toJson = (message: OutboundMessage, references: Map<string, string>) => ({
  id: message.id,
  channel: message.channel,
  to: message.to,
  kind: message.kind,
  subject: message.subject,
  body: message.body.length > 600 ? `${message.body.slice(0, 600)}…` : message.body,
  status: message.status,
  attempts: message.attempts,
  error: message.lastError,
  attachment: message.attachment?.type ?? null,
  booking: message.bookingId
    ? { id: message.bookingId, reference: references.get(message.bookingId) ?? null }
    : null,
  sentAt: message.sentAt?.toISO() ?? null,
  createdAt: message.createdAt.toISO(),
})

/**
 * The message log (Settings → Notifications): every SMS and email the
 * system sent or tried to - with why one didn't go, and "send again".
 * Also says when email or SMS isn't set up, or messages are stuck waiting
 * (the worker isn't running).
 */
export default class MessagesController {
  async index({ request, response }: HttpContext) {
    const payload = await request.validateUsing(listMessagesValidator)
    const query = OutboundMessage.query()
    if (payload.status) query.where('status', payload.status)
    if (payload.channel) query.where('channel', payload.channel)
    if (payload.search) {
      const term = `%${payload.search}%`
      query.where((q) =>
        q
          .whereILike('to', term)
          .orWhereILike('subject', term)
          .orWhereIn('booking_id', Booking.query().select('id').whereILike('reference', term))
      )
    }
    const page = await query
      .orderBy('created_at', 'desc')
      .paginate(payload.page ?? 1, payload.limit ?? 30)
    const bookingIds = [
      ...new Set(
        page
          .all()
          .map((row) => row.bookingId)
          .filter(Boolean)
      ),
    ] as string[]
    const bookings = bookingIds.length
      ? await Booking.query().whereIn('id', bookingIds).select('id', 'reference')
      : []
    const references = new Map(bookings.map((booking) => [booking.id, booking.reference]))

    // Health: stuck in the queue for 5+ minutes = the worker isn't running
    const since = DateTime.now().minus({ days: 7 }).toSQL()!
    const [counts, stuck] = await Promise.all([
      OutboundMessage.query()
        .where('created_at', '>=', since)
        .select('status')
        .count('* as total')
        .groupBy('status')
        .pojo<{ status: string; total: string }>(),
      OutboundMessage.query()
        .whereIn('status', ['pending', 'sending'])
        .where('created_at', '<', DateTime.now().minus({ minutes: 5 }).toSQL()!)
        .count('* as total'),
    ])
    return response.ok({
      message: 'Messages',
      data: page.all().map((row) => toJson(row, references)),
      meta: {
        ...page.getMeta(),
        lastWeek: Object.fromEntries(counts.map((row) => [row.status, Number(row.total)])),
        waitingTooLong: Number(stuck[0]?.$extras.total ?? 0),
        providers: MessageService.providers(),
      },
    })
  }

  /** One message in full: the whole text, the email as sent (HTML), the raw error, its history. */
  async show({ params, response }: HttpContext) {
    const message = await OutboundMessage.findOrFail(params.id)
    const booking = message.bookingId
      ? await Booking.query().where('id', message.bookingId).select('id', 'reference').first()
      : null
    const references = new Map(booking ? [[booking.id, booking.reference]] : [])
    return response.ok({
      message: 'Message',
      data: {
        ...toJson(message, references),
        body: message.body,
        html: message.html,
        updatedAt: message.updatedAt.toISO(),
        nextAttemptAt: message.nextAttemptAt?.toISO() ?? null,
      },
    })
  }

  async retry(ctx: HttpContext) {
    const message = await MessageService.retry(ctx.params.id)
    await AuditService.record(ctx, {
      action: 'message.retried',
      subject: { type: 'outbound_message', id: message.id, label: message.subject ?? message.kind },
      metadata: { channel: message.channel },
    })
    return ctx.response.ok({
      message: 'Queued to send again',
      data: { id: message.id, status: message.status },
    })
  }
}
