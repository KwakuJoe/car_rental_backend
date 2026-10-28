import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import MaintenanceAlerts from '#services/maintenance/maintenance_alerts'

/** Daily at 06:00 Accra time: services reaching their reminder day, due, or overdue. */
export default class CheckMaintenanceDueJob extends Job<Record<string, never>> {
  static options: JobOptions = { queue: 'default', maxRetries: 1 }

  async execute() {
    await MaintenanceAlerts.check()
  }
}
