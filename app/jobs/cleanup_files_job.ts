import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import db from '@adonisjs/lucid/services/db'
import logger from '@adonisjs/core/services/logger'
import FileService from '#services/file_service'
import { IDLE_MINUTES } from '#services/staff_tokens_provider'

/**
 * Nightly at 02:00 Accra time:
 *  - ID / vehicle-document scans, payment proofs and receipts uploaded but
 *    never saved onto a record (> 24h)
 *  - sign-ins that have run out (past their 12 hours, or idle too long)
 *  - rate-limit counters that have expired
 */
export default class CleanupFilesJob extends Job<Record<string, never>> {
  static options: JobOptions = { queue: 'default', maxRetries: 1 }

  async execute() {
    await FileService.deleteUnattached({ olderThanHours: 24 })
    const idleSince = new Date(Date.now() - IDLE_MINUTES * 60_000)
    const tokens = await db
      .from('auth_access_tokens')
      .where('expires_at', '<', new Date())
      .orWhere((query) =>
        query
          .where((q) => q.where('last_used_at', '<', idleSince).orWhereNull('last_used_at'))
          .where('created_at', '<', idleSince)
      )
      .delete()
    const limits = await db.from('rate_limits').where('expire', '<', Date.now()).delete()
    logger.info({ tokens, limits }, 'Nightly clean-up done')
  }
}
