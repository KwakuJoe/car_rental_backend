import type { HttpContext } from '@adonisjs/core/http'
import { createHash } from 'node:crypto'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import type Booking from '#models/booking'
import Car from '#models/car'
import CarAllocation from '#models/car_allocation'
import CarDamage from '#models/car_damage'
import ChecklistItem from '#models/checklist_item'
import Customer from '#models/customer'
import DriverAllocation from '#models/driver_allocation'
import File from '#models/file'
import Inspection, { REQUIRED_ANGLES, type ChecklistResult } from '#models/inspection'
import InspectionPhoto from '#models/inspection_photo'
import OdometerLog from '#models/odometer_log'
import TermsVersion from '#models/terms_version'
import type User from '#models/user'
import VehicleDocument from '#models/vehicle_document'
import AuditService from '#services/audit_service'
import { BookingError } from '#services/bookings/booking_service'
import DocumentComplianceService from '#services/document_compliance_service'
import SettingsService from '#services/settings/settings_service'
import { formatMoney as money } from '#helpers/money'
import { userCan } from '#helpers/permissions'

export type Requirement = { code: string; label: string; ok: boolean; message: string | null }

export type CheckOutDraft = {
  odometerKm?: number | null
  fuelLevel?: number | null
  checklist?: ChecklistResult[]
  exterior?: string | null
  interior?: string | null
  notes?: string | null
  /**
   * One angle at a time - set (fileId) or remove (null). Never the whole list:
   * two photos saved at once would each drop the other.
   */
  photo?: { angle: string; fileId: string | null }
  /** A manager lets the car go before the balance/deposit is paid (with a reason) */
  paymentConfirmed?: boolean
  paymentOverrideReason?: string | null
}

/**
 * Check-out (M4.1/M4.2): a draft inspection the desk fills in at its own
 * pace, then - only when every requirement passes - the customer signs
 * against the current terms and the booking goes on rent. One inspection
 * per booking and type; a completed one can't change.
 */
export default class CheckOutService {
  /** The booking's check-out draft, created on first open with the checklist ready. */
  static async draft(booking: Booking, user: User) {
    const existing = await Inspection.query()
      .where('booking_id', booking.id)
      .where('type', 'check_out')
      .first()
    if (existing) return existing
    const items = await ChecklistItem.query().where('active', true).orderBy('sort_order', 'asc')
    const created = await Inspection.create({
      bookingId: booking.id,
      carId: booking.carId,
      type: 'check_out',
      status: 'draft',
      checklist: items.map((item) => ({
        itemId: item.id,
        name: item.name,
        result: 'ok',
        note: null,
      })),
      inspectedBy: user.id,
    })
    // New rows don't know DB defaults (nulls, payment_confirmed false) until reloaded
    await created.refresh()
    return created
  }

  static async save(inspection: Inspection, draft: CheckOutDraft, user: User) {
    if (inspection.status === 'completed') {
      throw new BookingError('status', 'This handover is complete and can’t be changed.')
    }
    await db.transaction(async (trx) => {
      inspection.useTransaction(trx)
      inspection.merge({
        odometerKm: draft.odometerKm === undefined ? inspection.odometerKm : draft.odometerKm,
        fuelLevel: draft.fuelLevel === undefined ? inspection.fuelLevel : draft.fuelLevel,
        checklist: draft.checklist ?? inspection.checklist,
        exterior: draft.exterior === undefined ? inspection.exterior : draft.exterior,
        interior: draft.interior === undefined ? inspection.interior : draft.interior,
        notes: draft.notes === undefined ? inspection.notes : draft.notes,
        inspectedBy: user.id,
      })
      if (draft.paymentConfirmed === true && !inspection.paymentConfirmed) {
        if (!(await userCan(user, 'bookings.override'))) {
          throw new BookingError(
            'paymentConfirmed',
            'Only a manager can let a car go before it’s paid.'
          )
        }
        const reason = draft.paymentOverrideReason?.trim() ?? ''
        if (reason.length < 3) {
          throw new BookingError('paymentOverrideReason', 'Say why the car can go unpaid.')
        }
        inspection.paymentConfirmed = true
        inspection.paymentConfirmedBy = user.id
        inspection.paymentOverrideReason = reason
      } else if (draft.paymentConfirmed === false) {
        inspection.paymentConfirmed = false
        inspection.paymentConfirmedBy = null
        inspection.paymentOverrideReason = null
      }
      await inspection.save()
      if (draft.photo) {
        await InspectionPhoto.query({ client: trx })
          .where('inspection_id', inspection.id)
          .where('angle', draft.photo.angle)
          .delete()
        if (draft.photo.fileId) {
          await InspectionPhoto.create(
            { inspectionId: inspection.id, angle: draft.photo.angle, fileId: draft.photo.fileId },
            { client: trx }
          )
        }
      }
    })
    return inspection
  }

  /** Everything that must be true before the car goes out - shown live on the screen. */
  static async requirements(booking: Booking, inspection: Inspection): Promise<Requirement[]> {
    const [customer, car] = await Promise.all([
      Customer.findOrFail(booking.customerId),
      Car.findOrFail(booking.carId),
    ])
    const [requireVerified, requirePhotos] = await Promise.all([
      SettingsService.get('booking.require_verified_customer_for_checkout'),
      SettingsService.get('handover.require_photos'),
    ])
    const documents = await VehicleDocument.query().where('car_id', car.id)
    const compliance = DocumentComplianceService.computeCarCompliance(documents)
    const photos = await InspectionPhoto.query().where('inspection_id', inspection.id)
    const needed = booking.driveType === 'self_drive' ? 'verified' : 'id_verified'
    const verified =
      customer.verificationStatus === 'verified' || customer.verificationStatus === needed
    const missingAngles = REQUIRED_ANGLES.filter(
      (angle) => !photos.some((photo) => photo.angle === angle)
    )
    // Money from the payments recorded on the booking (Phase 5)
    const balanceDue = Math.max(0, booking.balanceAmount)
    const depositDue = Math.max(0, booking.depositAmount - booking.depositHeldAmount)
    const paidUp = balanceDue === 0 && depositDue === 0
    const owing = [
      ...(balanceDue ? [`${money(balanceDue)} balance`] : []),
      ...(depositDue ? [`${money(depositDue)} deposit`] : []),
    ]

    const rule = (code: string, label: string, ok: boolean, message: string) => ({
      code,
      label,
      ok,
      message: ok ? null : message,
    })
    const list: Requirement[] = [
      rule(
        'confirmed',
        'Booking confirmed',
        booking.status === 'confirmed',
        booking.status === 'pending'
          ? 'Confirm the booking first.'
          : `The booking is ${booking.status.replaceAll('_', ' ')}.`
      ),
      rule(
        'not_blocked',
        'Customer not blacklisted',
        customer.blacklistSeverity !== 'block' || !!booking.overrideBy,
        `${customer.fullName} is blacklisted - a manager must override on the booking.`
      ),
      rule(
        'verified',
        booking.driveType === 'self_drive' ? 'ID and driving licence verified' : 'ID verified',
        !requireVerified || verified,
        booking.driveType === 'self_drive'
          ? 'Verify the customer’s ID and driving licence (customer page → ID & licence).'
          : 'Verify the customer’s ID (customer page → ID & licence).'
      ),
      ...(booking.driveType === 'chauffeur'
        ? [
            rule(
              'driver',
              'Driver assigned',
              !!booking.driverId,
              'Assign a driver (Change → Driver).'
            ),
          ]
        : []),
      rule(
        'car_active',
        'Car in service',
        car.status === 'active' && !car.archivedAt,
        `The car is ${car.status.replaceAll('_', ' ')}.`
      ),
      rule(
        'car_documents',
        'Roadworthy and insurance valid today',
        compliance.status !== 'expired' && compliance.status !== 'missing',
        compliance.issues[0] ?? 'Car documents are expired or missing.'
      ),
      rule(
        'odometer',
        'Odometer reading',
        inspection.odometerKm !== null && inspection.odometerKm >= car.currentOdometerKm,
        inspection.odometerKm === null
          ? 'Enter the odometer reading.'
          : `The reading can’t be below the last one (${car.currentOdometerKm.toLocaleString()} km).`
      ),
      rule('fuel', 'Fuel level', inspection.fuelLevel !== null, 'Record the fuel level.'),
      ...(requirePhotos
        ? [
            rule(
              'photos',
              'Photos taken',
              missingAngles.length === 0,
              `Still to photograph: ${missingAngles.join(', ').replaceAll('_', ' ')}.`
            ),
          ]
        : []),
      rule(
        'payment',
        'Balance and deposit paid',
        paidUp || inspection.paymentConfirmed,
        `Still to collect: ${owing.join(' and ')} (Payments on the booking).`
      ),
    ]
    return list
  }

  /** The customer signs and the car goes out: booking -> on_rent, odometer recorded. */
  static async complete(
    ctx: HttpContext,
    booking: Booking,
    inspection: Inspection,
    input: { signatureFileId: string; signedName: string },
    user: User
  ) {
    if (inspection.status === 'completed') {
      throw new BookingError('status', 'This car has already been checked out.')
    }
    const requirements = await this.requirements(booking, inspection)
    const failing = requirements.filter((item) => !item.ok)
    if (failing.length) {
      throw new BookingError(failing[0].code, failing[0].message!)
    }
    const signature = await File.find(input.signatureFileId)
    if (!signature || signature.purpose !== 'signature') {
      throw new BookingError('signatureFileId', 'The customer needs to sign.')
    }
    const terms = await TermsVersion.current()
    if (!terms) throw new BookingError('terms', 'Add the rental terms first (Settings).')
    const now = DateTime.now()
    // What exactly was signed: the terms text + the booking as agreed (M4.2)
    const agreementHash = createHash('sha256')
      .update(
        JSON.stringify({
          terms: terms.body,
          version: terms.version,
          reference: booking.reference,
          pickupAt: booking.pickupAt.toISO(),
          returnAt: booking.returnAt.toISO(),
          carId: booking.carId,
          total: booking.totalAmount,
          odometerKm: inspection.odometerKm,
          fuelLevel: inspection.fuelLevel,
        })
      )
      .digest('hex')

    try {
      await this.handOver(
        ctx,
        booking,
        inspection,
        signature,
        terms,
        agreementHash,
        input.signedName,
        now,
        user
      )
    } catch (error: any) {
      if (error.code === '23P01') {
        throw new BookingError(
          'status',
          'The car (or driver) is still held by the previous booking - it can only go out at the booked time.',
          409,
          'E_CAR_UNAVAILABLE'
        )
      }
      throw error
    }
    return inspection
  }

  private static async handOver(
    ctx: HttpContext,
    booking: Booking,
    inspection: Inspection,
    signature: File,
    terms: TermsVersion,
    agreementHash: string,
    signedName: string,
    now: DateTime,
    user: User
  ) {
    await db.transaction(async (trx) => {
      inspection.useTransaction(trx)
      inspection.merge({
        status: 'completed',
        termsVersionId: terms.id,
        agreementHash,
        signatureFileId: signature.id,
        signedName,
        signedAt: now,
        signerIp: ctx.request.ip(),
        signerDevice: ctx.request.header('user-agent')?.slice(0, 255) ?? null,
        completedAt: now,
        inspectedBy: user.id,
      })
      await inspection.save()
      await File.query({ client: trx })
        .where('id', signature.id)
        .update({ attachable_type: 'inspection', attachable_id: inspection.id })

      const car = await Car.findOrFail(booking.carId, { client: trx })
      if (inspection.odometerKm! > car.currentOdometerKm) {
        await OdometerLog.create(
          {
            carId: car.id,
            previousKm: car.currentOdometerKm,
            newKm: inspection.odometerKm!,
            source: 'check_out',
            reason: booking.reference,
            recordedBy: user.id,
          },
          { client: trx }
        )
        car.useTransaction(trx)
        car.currentOdometerKm = inspection.odometerKm!
        await car.save()
      }

      // Collected early: the car (and driver) are held from now, not from the booked time
      if (now < booking.pickupAt) {
        await CarAllocation.query({ client: trx })
          .where('booking_id', booking.id)
          .where('active', true)
          .update({ starts_at: now.toSQL(), updated_at: new Date() })
        await DriverAllocation.query({ client: trx })
          .where('booking_id', booking.id)
          .where('active', true)
          .update({ starts_at: now.toSQL(), updated_at: new Date() })
      }

      booking.useTransaction(trx)
      booking.merge({ status: 'on_rent', actualPickupAt: now })
      await booking.save()
      await AuditService.record(
        ctx,
        {
          action: 'booking.checked_out',
          subject: { type: 'booking', id: booking.id, label: booking.reference },
          before: { status: 'confirmed' },
          after: { status: 'on_rent' },
          metadata: {
            odometerKm: inspection.odometerKm,
            fuelLevel: inspection.fuelLevel,
            termsVersion: terms.version,
            agreementHash,
          },
        },
        trx
      )
    })
    return inspection
  }

  /** Damage marked on the diagram during the handover - goes on the car's register. */
  static async addDamage(
    inspection: Inspection,
    input: {
      zone: string
      x: number
      y: number
      type: string
      severity: string
      note?: string | null
      photoFileId?: string | null
    },
    user: User
  ) {
    if (inspection.status === 'completed') {
      throw new BookingError('status', 'This handover is complete and can’t be changed.')
    }
    return CarDamage.create({
      carId: inspection.carId,
      zone: input.zone,
      x: input.x,
      y: input.y,
      type: input.type,
      severity: input.severity,
      note: input.note ?? null,
      photoFileId: input.photoFileId ?? null,
      reportedInspectionId: inspection.id,
      createdBy: user.id,
    })
  }

  static async removeDamage(inspection: Inspection, damageId: string) {
    if (inspection.status === 'completed') {
      throw new BookingError('status', 'This handover is complete and can’t be changed.')
    }
    // Only damage marked in THIS handover - earlier damage stays on the register
    const damage = await CarDamage.query()
      .where('id', damageId)
      .where('reported_inspection_id', inspection.id)
      .firstOrFail()
    await damage.delete()
  }
}
