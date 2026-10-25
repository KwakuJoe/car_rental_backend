import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import DocumentComplianceService from '#services/document_compliance_service'

export default class CheckDocumentExpiries extends BaseCommand {
  static commandName = 'check:document-expiries'
  static description =
    'Check vehicle documents for upcoming expiration and dispatch in-app notifications to staff'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    this.logger.info('Checking vehicle documents for upcoming expiration milestones...')

    const result = await DocumentComplianceService.checkAndAlertExpiringDocuments()

    this.logger.success(
      `Done. Evaluated ${result.checked} documents with expiration dates. Created ${result.alertsCreated} alert notifications.`
    )
  }
}
