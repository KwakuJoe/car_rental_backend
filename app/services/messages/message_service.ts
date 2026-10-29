import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import mail from '@adonisjs/mail/services/main'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import Business from '#models/business'
import OutboundMessage, {
  type MessageAttachment,
  type MessageChannel,
} from '#models/outbound_message'
import { LOGO_CID } from '#mails/email_layout'
import env from '#start/env'

/** Tries before giving up (the job retries 4 times after the first) */
const MAX_ATTEMPTS = 5
/** A send claimed this long ago and never finished (the process died): try it again */
const STUCK_AFTER_MINUTES = 10

export type NewMessage = {
  channel: MessageChannel
  to: string
  kind: string
  body: string
  subject?: string | null
  html?: string | null
  bookingId?: string | null
  /** Email only: a document attached as a PDF */
  attachment?: MessageAttachment | null
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

/** The business logo's bytes for inline embedding, kept 10 minutes (it rarely changes). */
let logoCache: { at: number; data: { content: Buffer; type: string } | null } | null = null
async function businessLogo() {
  if (logoCache && Date.now() - logoCache.at < 10 * 60_000) return logoCache.data
  let data: { content: Buffer; type: string } | null = null
  try {
    const business = await Business.query().preload('logo').first()
    const url = business?.logo?.url
    if (url) {
      const response = await fetch(url, { signal: AbortSignal.timeout(10_000) })
      if (response.ok) {
        data = {
          content: Buffer.from(await response.arrayBuffer()),
          type: response.headers.get('content-type') ?? 'image/png',
        }
      }
    }
  } catch (error) {
    logger.warn({ err: (error as Error).message }, 'Could not load the logo for emails')
  }
  logoCache = { at: Date.now(), data }
  return data
}

/** The PDF for an attachment, built now (imported here: the PDF services import models that import this) */
async function attachmentFile(attachment: MessageAttachment) {
  const { default: InvoicePdfService } = await import('#services/invoices/invoice_pdf_service')
  const { default: Invoice } = await import('#models/invoice')
  const { default: CreditNote } = await import('#models/credit_note')
  if (attachment.type === 'invoice') {
    const invoice = await Invoice.findOrFail(attachment.id)
    return {
      content: await InvoicePdfService.invoice(invoice.id),
      filename: `${invoice.number}.pdf`,
    }
  }
  const note = await CreditNote.findOrFail(attachment.id)
  return { content: await InvoicePdfService.creditNote(note.id), filename: `${note.number}.pdf` }
}

/**
 * SMS and email to customers and staff. queue() stores the message, then a
 * background job (SendMessageJob, run by `node ace queue:work`) sends it -
 * the request that caused it never waits for a provider. Failed sends are
 * retried by the queue with growing gaps (5 tries). Nothing is ever sent
 * from tests, and a channel with no provider set up is recorded as skipped -
 * so dev and test runs can't text anyone. outbound_messages stays the record
 * of every message (sent, failed, why).
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
      attachment: message.attachment ?? null,
      status: 'pending',
      attempts: 0,
      nextAttemptAt: null,
    })
    try {
      // Imported here: the job imports this service
      const { default: SendMessageJob } = await import('#jobs/send_message_job')
      await SendMessageJob.dispatch({ messageId: record.id })
      // No recipient details in the logs - the message log in the dashboard has them
      logger.info(
        { messageId: record.id, channel: record.channel, kind: record.kind },
        'Message queued - the worker (node ace queue:work) sends it'
      )
    } catch (error) {
      // The message is stored: `node ace messages:send` sends whatever is left pending
      logger.error(
        { messageId: record.id, err: (error as Error).message },
        'Could not queue the message - it stays pending'
      )
    }
    return record
  }

  /**
   * One try at one message. Safe to call from several places at once (the
   * queue worker, `messages:send`, a second server): the first to switch it
   * from pending to sending in one atomic update owns it; the others see
   * it's taken and leave it alone - so nothing goes out twice.
   * throwOnFailure (the job): a provider error is thrown so the queue
   * retries; otherwise it's recorded and the message left pending.
   */
  static async deliver(id: string, options: { throwOnFailure?: boolean } = {}) {
    const claimed = await db
      .from('outbound_messages')
      .where('id', id)
      .where('status', 'pending')
      .update({ status: 'sending', updated_at: DateTime.now().toSQL() })
    if (Number(claimed) !== 1) return OutboundMessage.find(id)

    const message = await OutboundMessage.findOrFail(id)
    const configured = message.channel === 'sms' ? smsConfigured() : emailConfigured()
    if (app.inTest || !configured) {
      const reason = app.inTest
        ? 'Not sent from tests'
        : message.channel === 'sms'
          ? 'SMS isn’t set up on the server (MNOTIFY_API_KEY is empty)'
          : 'Email isn’t set up on the server (SMTP_HOST is empty)'
      message.merge({ status: 'skipped', lastError: reason })
      await message.save()
      if (!app.inTest) {
        logger.warn(
          { messageId: message.id, channel: message.channel, kind: message.kind },
          `Message skipped - ${reason}`
        )
      }
      return message
    }
    message.attempts += 1
    try {
      if (message.channel === 'sms') {
        await sendSms(message.to, message.body)
      } else {
        // The branded layout points at the logo as cid:business-logo - attach it
        const logo = message.html?.includes(`cid:${LOGO_CID}`) ? await businessLogo() : null
        const file = message.attachment ? await attachmentFile(message.attachment) : null
        await mail.send((email) => {
          email
            .to(message.to)
            .subject(message.subject ?? '')
            .text(message.body)
          if (message.html) {
            // No logo to attach: drop the image rather than show a broken one
            email.html(logo ? message.html : message.html.replace(/<img src="cid:[^>]*>/g, ''))
          }
          if (logo) {
            email.embedData(logo.content, LOGO_CID, {
              filename: `logo.${logo.type.split('/')[1] ?? 'png'}`,
              contentType: logo.type,
            })
          }
          if (file) {
            email.attachData(file.content, {
              filename: file.filename,
              contentType: 'application/pdf',
            })
          }
        })
      }
      message.merge({ status: 'sent', sentAt: DateTime.now(), lastError: null })
      await message.save()
      logger.info(
        { messageId: message.id, channel: message.channel, kind: message.kind },
        'Message sent'
      )
      return message
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      const out = message.attempts >= MAX_ATTEMPTS
      // Back to pending (the next try can claim it) - or failed after the last one
      message.merge({ status: out ? 'failed' : 'pending', lastError: reason.slice(0, 1000) })
      await message.save()
      logger.warn(
        { messageId: message.id, channel: message.channel, attempt: message.attempts, reason },
        out ? 'Message failed - giving up' : 'Message failed - will retry'
      )
      if (options.throwOnFailure && !out) throw error
      return message
    }
  }

  /** What the server can send with, for the message log's warnings */
  static providers() {
    return { email: emailConfigured(), sms: smsConfigured() }
  }

  /** Send a failed or skipped message again (e.g. after setting up email or topping up SMS credit). */
  static async retry(id: string) {
    const message = await OutboundMessage.findOrFail(id)
    if (!['failed', 'skipped'].includes(message.status)) return message
    message.merge({ status: 'pending', attempts: 0, lastError: null, nextAttemptAt: null })
    await message.save()
    const { default: SendMessageJob } = await import('#jobs/send_message_job')
    await SendMessageJob.dispatch({ messageId: message.id })
    logger.info(
      { messageId: message.id, channel: message.channel, kind: message.kind },
      'Message queued again'
    )
    return message
  }

  /** The queue gave up on it (or it crashed): record it as failed unless it went out. */
  static async giveUp(id: string) {
    await db
      .from('outbound_messages')
      .where('id', id)
      .whereIn('status', ['pending', 'sending'])
      .update({ status: 'failed', updated_at: DateTime.now().toSQL() })
  }

  /**
   * By hand (`node ace messages:send`): sends whatever is left pending - e.g.
   * messages stored while the queue was unreachable - and puts back sends
   * that were claimed but never finished (the process died mid-send).
   * Returns how many were tried.
   */
  static async deliverDue() {
    await db
      .from('outbound_messages')
      .where('status', 'sending')
      .where('updated_at', '<', DateTime.now().minus({ minutes: STUCK_AFTER_MINUTES }).toSQL()!)
      .update({ status: 'pending' })
    const due = await OutboundMessage.query()
      .where('status', 'pending')
      .orderBy('created_at', 'asc')
      .limit(100)
    for (const message of due) await this.deliver(message.id)
    return due.length
  }
}
