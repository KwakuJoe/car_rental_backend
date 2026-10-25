import { DateTime } from 'luxon'
import VehicleDocument from '#models/vehicle_document'
import NotificationService from '#services/notification_service'
import Notification from '#models/notification'

export type ComplianceStatus = 'ok' | 'expiring_soon' | 'expired' | 'missing'

export type ComplianceSummary = {
  status: ComplianceStatus
  hasRoadworthy: boolean
  hasInsurance: boolean
  roadworthyExpiresOn: string | null
  insuranceExpiresOn: string | null
  issues: string[]
  earliestExpiryDays: number | null
}

export default class DocumentComplianceService {
  /**
   * Evaluates the compliance status of a vehicle given its documents.
   */
  static computeCarCompliance(documents: VehicleDocument[]): ComplianceSummary {
    const today = DateTime.now().startOf('day')

    // Find the latest document per type (ordered by expiresOn or createdAt desc)
    const docsByType = new Map<string, VehicleDocument>()
    for (const doc of documents) {
      const existing = docsByType.get(doc.type)
      if (!existing) {
        docsByType.set(doc.type, doc)
      } else {
        const existingExpiry = existing.expiresOn ?? existing.createdAt
        const currentExpiry = doc.expiresOn ?? doc.createdAt
        if (currentExpiry > existingExpiry) {
          docsByType.set(doc.type, doc)
        }
      }
    }

    const roadworthy = docsByType.get('roadworthy')
    const insurance = docsByType.get('insurance')

    const issues: string[] = []
    let hasExpired = false
    let hasExpiringSoon = false
    let earliestDays: number | null = null

    // Evaluate all documents with expiry dates
    for (const doc of docsByType.values()) {
      if (!doc.expiresOn) continue

      const expiry =
        typeof doc.expiresOn === 'string'
          ? DateTime.fromISO(doc.expiresOn).startOf('day')
          : doc.expiresOn.startOf('day')

      const diffDays = Math.ceil(expiry.diff(today, 'days').days)

      if (earliestDays === null || diffDays < earliestDays) {
        earliestDays = diffDays
      }

      const typeLabel = doc.type.replace(/_/g, ' ')
      if (diffDays < 0) {
        hasExpired = true
        issues.push(`${typeLabel} expired ${Math.abs(diffDays)} day(s) ago (${expiry.toISODate()})`)
      } else if (diffDays <= 30) {
        hasExpiringSoon = true
        issues.push(`${typeLabel} expires in ${diffDays} day(s) (${expiry.toISODate()})`)
      }
    }

    if (!roadworthy) {
      issues.push('Missing DVLA Roadworthiness Certificate')
    }
    if (!insurance) {
      issues.push('Missing Motor Insurance Policy')
    }

    let status: ComplianceStatus = 'ok'
    if (hasExpired) {
      status = 'expired'
    } else if (hasExpiringSoon) {
      status = 'expiring_soon'
    } else if (!roadworthy || !insurance) {
      status = 'missing'
    }

    return {
      status,
      hasRoadworthy: Boolean(roadworthy),
      hasInsurance: Boolean(insurance),
      roadworthyExpiresOn: roadworthy?.expiresOn
        ? ((roadworthy.expiresOn as any).toISODate?.() ?? String(roadworthy.expiresOn))
        : null,
      insuranceExpiresOn: insurance?.expiresOn
        ? ((insurance.expiresOn as any).toISODate?.() ?? String(insurance.expiresOn))
        : null,
      issues,
      earliestExpiryDays: earliestDays,
    }
  }

  /**
   * Fetch vehicles with documents expiring within the specified days (or already expired).
   */
  static async getExpiringDocuments(days = 30) {
    const threshold = DateTime.now().plus({ days }).startOf('day').toISODate()!

    const documents = await VehicleDocument.query()
      .whereNotNull('expires_on')
      .where('expires_on', '<=', threshold)
      .preload('car', (cq) => cq.preload('category').preload('branch'))
      .preload('file')
      .preload('creator')
      .orderBy('expires_on', 'asc')

    // Filter only active, non-retired cars
    return documents.filter((doc) => doc.car && doc.car.status !== 'retired' && !doc.car.archivedAt)
  }

  /**
   * Automated cron/scheduler check:
   * Inspects documents and creates alerts for staff when approaching 30, 14, 7, 1, or 0 days.
   */
  static async checkAndAlertExpiringDocuments(milestones = [30, 14, 7, 1, 0]): Promise<{
    checked: number
    alertsCreated: number
  }> {
    const today = DateTime.now().startOf('day')
    const maxMilestone = Math.max(...milestones)
    const threshold = today.plus({ days: maxMilestone }).toISODate()!

    const documents = await VehicleDocument.query()
      .whereNotNull('expires_on')
      .where('expires_on', '<=', threshold)
      .preload('car')

    let alertsCreated = 0

    for (const doc of documents) {
      if (!doc.car || doc.car.status === 'retired' || doc.car.archivedAt) continue

      const expiry =
        typeof doc.expiresOn === 'string'
          ? DateTime.fromISO(doc.expiresOn).startOf('day')
          : doc.expiresOn!.startOf('day')

      const diffDays = Math.ceil(expiry.diff(today, 'days').days)

      // Check if diff matches any milestone (or is already expired <= 0)
      const matchedMilestone = milestones.find((m) => diffDays === m || (m === 0 && diffDays < 0))
      if (matchedMilestone === undefined) continue

      // Avoid spamming duplicate notification if already sent in last 24h for this document
      const recentNotification = await Notification.query()
        .where('type', 'document_expiring')
        .where('link', `/dashboard/cars?carId=${doc.carId}&tab=documents`)
        .where('created_at', '>=', today.minus({ hours: 24 }).toSQL()!)
        .first()

      if (recentNotification) continue

      const typeLabel = doc.type.replace(/_/g, ' ')
      const isExpired = diffDays <= 0
      const title = isExpired
        ? `Expired Document: ${doc.car.registrationNo}`
        : `Document Expiring Soon: ${doc.car.registrationNo}`

      const body = isExpired
        ? `${typeLabel} for ${doc.car.make} ${doc.car.model} (${doc.car.registrationNo}) expired on ${expiry.toISODate()}. Renew immediately.`
        : `${typeLabel} for ${doc.car.make} ${doc.car.model} (${doc.car.registrationNo}) expires on ${expiry.toISODate()} (${diffDays} days remaining).`

      await NotificationService.sendToPermission('fleet.manage', {
        type: 'document_expiring',
        title,
        body,
        link: `/dashboard/cars?carId=${doc.carId}&tab=documents`,
      })

      alertsCreated++
    }

    return { checked: documents.length, alertsCreated }
  }
}
