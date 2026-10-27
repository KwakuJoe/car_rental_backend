import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * Every 5 minutes: unconfirmed (pending) bookings past their hold expire and
 * free their car; staff are alerted about holds ending within 2 hours unpaid. Run from cron - see prompt-reference/setup_command.txt,
 * "SCHEDULED JOBS". Safe to re-run.
 */
export default class ExpireBookingHolds extends BaseCommand {
  static commandName = 'bookings:expire-holds'
  static description = 'Expire unconfirmed bookings whose hold has run out and free their cars'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    // Lazy imports - see check_document_expiries.ts
    const { default: BookingService } = await import('#services/bookings/booking_service')
    const expired = await BookingService.expireHolds()
    const warned = await BookingService.warnExpiringHolds()
    this.logger.success(
      `Done. ${expired} booking hold(s) expired, ${warned} "hold ending" alert(s) sent.`
    )
  }
}
