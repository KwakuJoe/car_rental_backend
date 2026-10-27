import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * Unconfirmed (pending) bookings past their hold expire and free their car;
 * staff are alerted about holds ending within 2 hours unpaid. The queue runs
 * this every 5 minutes (ExpireHoldsJob); this command is for running it by
 * hand. Safe to re-run.
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
