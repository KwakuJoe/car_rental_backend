import { OutboundMessageSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { withUlid } from '#models/mixins/with_ulid'

export type MessageChannel = 'sms' | 'email'
export type MessageStatus = 'pending' | 'sent' | 'failed' | 'skipped'

/** An SMS or email to a customer - stored first, sent after (see MessageService). */
export default class OutboundMessage extends compose(OutboundMessageSchema, withUlid) {
  declare channel: MessageChannel
  declare status: MessageStatus
}
