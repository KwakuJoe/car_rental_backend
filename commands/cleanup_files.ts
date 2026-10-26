import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * Nightly: delete identity and vehicle-document scans that were uploaded but
 * never saved onto a document (dialog closed, tab closed, connection lost).
 * Personal data we have no reason to keep (Act 843). Run from cron - see
 * prompt-reference/setup_command.txt, "SCHEDULED JOBS". Safe to re-run.
 */
export default class CleanupFiles extends BaseCommand {
  static commandName = 'files:cleanup'
  static description =
    'Delete private document uploads never attached to a record (older than 24 hours)'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    // Lazy imports - see check_document_expiries.ts
    const { default: FileService } = await import('#services/file_service')

    const deleted = await FileService.deleteUnattached({ olderThanHours: 24 })
    this.logger.success(`Done. Deleted ${deleted} unattached document upload(s).`)
  }
}
