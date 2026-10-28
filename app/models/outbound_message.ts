import { OutboundMessageSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { column } from '@adonisjs/lucid/orm'
import { withUlid } from '#models/mixins/with_ulid'

export type MessageChannel = 'sms' | 'email'
/** sending: claimed by one process right now (see MessageService.deliver) */
export type MessageStatus = 'pending' | 'sending' | 'sent' | 'failed' | 'skipped'
/** A PDF emailed with the message - built when it's sent */
export type MessageAttachment = { type: 'invoice' | 'credit_note'; id: string }

/** An SMS or email to a customer or staff - stored first, sent after (see MessageService). */
export default class OutboundMessage extends compose(OutboundMessageSchema, withUlid) {
  declare channel: MessageChannel
  declare status: MessageStatus

  @column({
    prepare: (value: unknown) =>
      value === null || value === undefined ? null : JSON.stringify(value),
  })
  declare attachment: MessageAttachment | null
}
