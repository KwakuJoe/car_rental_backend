import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import DocumentComplianceService from '#services/document_compliance_service'

/** Daily at 06:00 Accra time: vehicle documents reaching 30/14/7/1 days or their expiry day. */
export default class CheckDocumentExpiriesJob extends Job<Record<string, never>> {
  static options: JobOptions = { queue: 'default', maxRetries: 1 }

  async execute() {
    await DocumentComplianceService.checkAndAlertExpiringDocuments()
  }
}
