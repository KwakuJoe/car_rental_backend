import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * By hand: send SMS / emails left pending (e.g. stored while the queue was
 * unreachable). Normally the queue worker sends and retries them. Safe to
 * re-run - each message is claimed before it's sent.
 */
export default class SendMessages extends BaseCommand {
  static commandName = 'messages:send'
  static description = 'Send SMS and emails left pending (the queue worker normally does this)'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    // Lazy imports - see check_document_expiries.ts
    const { default: MessageService } = await import('#services/messages/message_service')
    const tried = await MessageService.deliverDue()
    this.logger.success(`Done. ${tried} message(s) tried.`)
  }
}
