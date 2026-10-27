import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * Customer reminders that are due (pickup, return, unpaid hold). The queue
 * runs this every 15 minutes (SendRemindersJob); this command is for running
 * it by hand. Safe to re-run: each reminder goes once per booking.
 */
export default class SendReminders extends BaseCommand {
  static commandName = 'messages:reminders'
  static description = 'Send customer reminders that are due (pickup, return, unpaid hold)'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    // Lazy imports - see check_document_expiries.ts
    const { default: Reminders } = await import('#services/messages/reminders')
    const sent = await Reminders.run()
    this.logger.success(
      `Done. Reminders: ${sent.pickup} pickup, ${sent.return} return, ${sent.hold} unpaid hold.`
    )
  }
}
