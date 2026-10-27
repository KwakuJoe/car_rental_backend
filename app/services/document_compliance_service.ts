import { DateTime } from 'luxon'
import VehicleDocument from '#models/vehicle_document'
import NotificationService from '#services/notification_service'
import StaffAlerts from '#services/messages/staff_alerts'
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
   * Daily expiry check (run by the scheduler - see setup_command.txt).
   *
   * - Only each car's CURRENT document per type counts (the one with the latest
   *   expiry). A renewed policy's old, expired record never alerts again.
   * - Alerts fire on exact milestones only - 30, 14, 7 and 1 day(s) before and on
   *   the expiry day - not every day while something is expired.
   * - Each (document, milestone) pair alerts once, however often the job runs,
   *   via the notification's dedupe_key.
   */
  static async checkAndAlertExpiringDocuments(milestones = [30, 14, 7, 1, 0]): Promise<{
    checked: number
    alertsCreated: number
  }> {
    const today = DateTime.now().startOf('day')

    // Latest document per (car, type): expiry descending, then newest record.
    const documents = await VehicleDocument.query()
      .whereNotNull('expires_on')
      .whereIn(
        'id',
        VehicleDocument.query()
          .select('id')
          .distinctOn('car_id', 'type')
          .whereNotNull('expires_on')
          .orderBy('car_id')
          .orderBy('type')
          .orderBy('expires_on', 'desc')
          .orderBy('created_at', 'desc')
      )
      .preload('car')

    let alertsCreated = 0

    for (const doc of documents) {
      if (!doc.car || doc.car.status === 'retired' || doc.car.archivedAt) continue

      const expiry =
        typeof doc.expiresOn === 'string'
          ? DateTime.fromISO(doc.expiresOn).startOf('day')
          : doc.expiresOn!.startOf('day')
      const daysLeft = Math.round(expiry.diff(today, 'days').days)
      if (!milestones.includes(daysLeft)) continue

      const dedupeKey = `document:${doc.id}:expires-in-${daysLeft}`
      const alreadySent = await Notification.query().where('dedupe_key', dedupeKey).first()
      if (alreadySent) continue

      const typeLabel = doc.type.replace(/_/g, ' ')
      const vehicle = `${doc.car.make} ${doc.car.model} (${doc.car.registrationNo})`
      const expiresToday = daysLeft === 0

      await NotificationService.sendToPermission('fleet.manage', {
        type: 'document_expiring',
        title: expiresToday
          ? `Document expires today: ${doc.car.registrationNo}`
          : `Document expiring soon: ${doc.car.registrationNo}`,
        body: expiresToday
          ? `The ${typeLabel} for ${vehicle} expires today (${expiry.toISODate()}). Renew it before the car goes out.`
          : `The ${typeLabel} for ${vehicle} expires on ${expiry.toISODate()} - ${daysLeft} day${daysLeft === 1 ? '' : 's'} left.`,
        link: `/dashboard/cars/${doc.carId}?tab=documents`,
        dedupeKey,
      })

      await StaffAlerts.send('documents_expiring', {
        sms: expiresToday
          ? `The ${typeLabel} for ${vehicle} expires TODAY. Renew it before the car goes out.`
          : `The ${typeLabel} for ${vehicle} expires on ${expiry.toFormat('d LLL yyyy')} (${daysLeft} day${daysLeft === 1 ? '' : 's'} left).`,
        email: {
          subject: expiresToday
            ? `Expires today: ${typeLabel} - ${doc.car.registrationNo}`
            : `${typeLabel} expiring in ${daysLeft} day${daysLeft === 1 ? '' : 's'} - ${doc.car.registrationNo}`,
          preheader: `${vehicle}: ${typeLabel} expires ${expiry.toFormat('d LLL yyyy')}.`,
          eyebrow: {
            text: expiresToday ? 'Expires today' : 'Expiring soon',
            color: expiresToday ? '#fb242f' : '#f59e0b',
          },
          heading: `Renew the ${typeLabel}`,
          paragraphs: [
            expiresToday
              ? `The ${typeLabel} for ${vehicle} expires today. Renew it before the car goes out again.`
              : `The ${typeLabel} for ${vehicle} expires on ${expiry.toFormat('d LLL yyyy')} - ${daysLeft} day${daysLeft === 1 ? '' : 's'} left.`,
          ],
          details: {
            rows: [
              { label: 'Car', value: vehicle },
              { label: 'Document', value: typeLabel },
              { label: 'Expires', value: expiry.toFormat('ccc d LLL yyyy') },
            ],
          },
          path: `/dashboard/cars/${doc.carId}?tab=documents`,
          buttonLabel: 'Open the car’s documents',
        },
      })

      alertsCreated++
    }

    return { checked: documents.length, alertsCreated }
  }
}
