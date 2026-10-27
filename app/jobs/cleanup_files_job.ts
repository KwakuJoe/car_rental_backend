import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import FileService from '#services/file_service'

/** Nightly at 02:00 Accra time: ID / vehicle-document scans uploaded but never saved onto a record (> 24h). */
export default class CleanupFilesJob extends Job<Record<string, never>> {
  static options: JobOptions = { queue: 'default', maxRetries: 1 }

  async execute() {
    await FileService.deleteUnattached({ olderThanHours: 24 })
  }
}
