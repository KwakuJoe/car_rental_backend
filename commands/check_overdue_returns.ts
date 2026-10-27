import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * Alert staff (Settings → Notifications) about cars past their return time.
 * The queue runs this every 15 minutes (CheckOverdueReturnsJob); this command
 * is for running it by hand. Safe to re-run: each booking alerts once.
 */
export default class CheckOverdueReturns extends BaseCommand {
  static commandName = 'bookings:check-overdue'
  static description = 'Alert staff about rentals past their return time'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    // Lazy imports - see check_document_expiries.ts
    const { default: BookingService } = await import('#services/bookings/booking_service')
    const alerted = await BookingService.alertOverdueReturns()
    this.logger.success(`Done. ${alerted} overdue-return alert(s) sent.`)
  }
}
