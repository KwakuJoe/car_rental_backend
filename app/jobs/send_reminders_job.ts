import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import Reminders from '#services/messages/reminders'

/** Every 15 minutes: customer reminders that are due (pickup, return, unpaid hold). */
export default class SendRemindersJob extends Job<Record<string, never>> {
  static options: JobOptions = { queue: 'default', maxRetries: 0 }

  async execute() {
    await Reminders.run()
  }
}
