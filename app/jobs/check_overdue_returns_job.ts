import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import BookingService from '#services/bookings/booking_service'

/** Every 15 minutes: alert staff about cars past their return time (once per booking). */
export default class CheckOverdueReturnsJob extends Job<Record<string, never>> {
  static options: JobOptions = { queue: 'default', maxRetries: 0 }

  async execute() {
    await BookingService.alertOverdueReturns()
  }
}
