import { Job, exponentialBackoff } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import MessageService from '#services/messages/message_service'

type Payload = { messageId: string }

/**
 * Sends one stored SMS / email (outbound_messages). A failed attempt is
 * retried after 1, 4, 16 and 60 minutes - five tries in all - then the
 * message is marked failed. Safe if it ever runs twice: the message is
 * claimed before sending (MessageService.deliver).
 */
export default class SendMessageJob extends Job<Payload> {
  static options: JobOptions = {
    queue: 'default',
    maxRetries: 4,
    retry: {
      backoff: exponentialBackoff({ baseDelay: '1m', maxDelay: '1h', multiplier: 4 }),
    },
  }

  async execute() {
    // Throws when the provider refuses it, so the queue retries
    await MessageService.deliver(this.payload.messageId, { throwOnFailure: true })
  }

  async failed() {
    await MessageService.giveUp(this.payload.messageId)
  }
}
