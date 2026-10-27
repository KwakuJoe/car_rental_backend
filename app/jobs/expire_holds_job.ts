import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import BookingService from '#services/bookings/booking_service'

/** Every 5 minutes: unpaid holds past their time expire (car freed); staff hear about holds ending within 2 hours. */
export default class ExpireHoldsJob extends Job<Record<string, never>> {
  static options: JobOptions = { queue: 'default', maxRetries: 0 }

  async execute() {
    await BookingService.expireHolds()
    await BookingService.warnExpiringHolds()
  }
}
