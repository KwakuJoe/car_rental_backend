import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * Vehicle-document expiry alerts. The queue runs this daily at 06:00 Accra
 * time (CheckDocumentExpiriesJob); this command is for running it by hand.
 * Safe to re-run: each document + milestone alerts once.
 */
export default class CheckDocumentExpiries extends BaseCommand {
  static commandName = 'check:document-expiries'
  static description =
    'Check vehicle documents for upcoming expiration and dispatch in-app notifications to staff'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    // Imported lazily, like every command here: ace imports all command files
    // up front (e.g. for `node ace list`), and a top-level import that reaches
    // the User model defines it before the hash provider has booted - which
    // breaks password hashing for every command in the run (business:create,
    // password:reset). Importing inside run() happens after boot.
    const { default: DocumentComplianceService } =
      await import('#services/document_compliance_service')

    this.logger.info('Checking vehicle documents for upcoming expiration milestones...')
    const result = await DocumentComplianceService.checkAndAlertExpiringDocuments()
    this.logger.success(
      `Done. Evaluated ${result.checked} current documents. Created ${result.alertsCreated} alert notifications.`
    )
  }
}
