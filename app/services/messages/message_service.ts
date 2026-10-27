import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import mail from '@adonisjs/mail/services/main'
import { DateTime } from 'luxon'
import OutboundMessage, { type MessageChannel } from '#models/outbound_message'
import env from '#start/env'

const MAX_ATTEMPTS = 5
/** Wait before retry n (minutes): 1, 5, 15, 60 */
const BACKOFF = [1, 5, 15, 60]

export type NewMessage = {
  channel: MessageChannel
  to: string
  kind: string
  body: string
  subject?: string | null
  html?: string | null
  bookingId?: string | null
}

const smsConfigured = () => !!env.get('MNOTIFY_API_KEY')
const emailConfigured = () => !!env.get('SMTP_HOST')

/** mNotify - POST https://api.mnotify.com/api/sms/quick?key=... ({ status: 'success' } when taken) */
async function sendSms(to: string, message: string) {
  const key = env.get('MNOTIFY_API_KEY')!.release()
  const response = await fetch(
    `https://api.mnotify.com/api/sms/quick?key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: [to],
        sender: env.get('MNOTIFY_SENDER_ID'),
        message,
        is_schedule: false,
      }),
      signal: AbortSignal.timeout(15_000),
    }
  )
  const body = (await response.json().catch(() => ({}))) as { status?: string }
  if (!response.ok || body.status !== 'success') {
    throw new Error(`mNotify refused it: ${JSON.stringify(body).slice(0, 300)}`)
  }
}

/**
 * SMS and email to customers. queue() stores the message and tries it
 * straight away without holding up the caller; whatever fails is retried by
 * `node ace messages:send` (cron, every minute) with growing gaps, up to 5
 * tries. Nothing is ever sent from tests, and a channel with no provider
 * set up is recorded as skipped - so dev and test runs can't text anyone.
 */
export default class MessageService {
  static async queue(message: NewMessage) {
    const record = await OutboundMessage.create({
      channel: message.channel,
      to: message.to,
      kind: message.kind,
      body: message.body,
      subject: message.subject ?? null,
      html: message.html ?? null,
      bookingId: message.bookingId ?? null,
      status: 'pending',
      attempts: 0,
      nextAttemptAt: DateTime.now(),
    })
    // In the background: the request answers now, the retry job catches failures
    void this.deliver(record.id).catch((error) =>
      logger.error({ messageId: record.id, err: error?.message }, 'Message delivery crashed')
    )
    return record
  }

  /** One try at one message. Safe to call twice: only pending messages go out. */
  static async deliver(id: string) {
    const message = await OutboundMessage.find(id)
    if (!message || message.status !== 'pending') return message
    const configured = message.channel === 'sms' ? smsConfigured() : emailConfigured()
    if (app.inTest || !configured) {
      message.merge({
        status: 'skipped',
        lastError: app.inTest ? 'Not sent from tests' : `No ${message.channel} provider set up`,
      })
      await message.save()
      return message
    }
    message.attempts += 1
    try {
      if (message.channel === 'sms') {
        await sendSms(message.to, message.body)
      } else {
        await mail.send((email) => {
          email
            .to(message.to)
            .subject(message.subject ?? '')
            .text(message.body)
          if (message.html) email.html(message.html)
        })
      }
      message.merge({
        status: 'sent',
        sentAt: DateTime.now(),
        lastError: null,
        nextAttemptAt: null,
      })
      logger.info(
        { messageId: message.id, channel: message.channel, kind: message.kind },
        'Message sent'
      )
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      const giveUp = message.attempts >= MAX_ATTEMPTS
      message.merge({
        status: giveUp ? 'failed' : 'pending',
        lastError: reason.slice(0, 1000),
        nextAttemptAt: giveUp
          ? null
          : DateTime.now().plus({ minutes: BACKOFF[message.attempts - 1] ?? 60 }),
      })
      logger.warn(
        { messageId: message.id, channel: message.channel, attempt: message.attempts, reason },
        giveUp ? 'Message failed - giving up' : 'Message failed - will retry'
      )
    }
    await message.save()
    return message
  }

  /** The retry job: everything pending and due. Returns how many were tried. */
  static async deliverDue() {
    const due = await OutboundMessage.query()
      .where('status', 'pending')
      .where('next_attempt_at', '<=', DateTime.now().toSQL()!)
      .orderBy('created_at', 'asc')
      .limit(100)
    for (const message of due) await this.deliver(message.id)
    return due.length
  }
}
