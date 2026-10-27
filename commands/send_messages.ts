import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * Every minute: SMS and emails that couldn't be sent straight away are
 * tried again (5 tries, growing gaps). Run from cron - see
 * prompt-reference/setup_command.txt, "SCHEDULED JOBS". Safe to re-run.
 */
export default class SendMessages extends BaseCommand {
  static commandName = 'messages:send'
  static description = 'Retry customer SMS and emails that are due'

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
