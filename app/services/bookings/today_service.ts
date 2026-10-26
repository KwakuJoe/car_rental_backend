import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import Booking from '#models/booking'
import Business from '#models/business'
import Car from '#models/car'
import CarAllocation from '#models/car_allocation'
import DocumentComplianceService from '#services/document_compliance_service'
import SettingsService from '#services/settings/settings_service'
import { bookingToJson } from '#transformers/booking_transformer'

/** Holds running out within this many hours show under "Confirm or lose the car". */
const HOLD_WARNING_HOURS = 6
/** Car documents expiring within this many days show under "Cars needing attention". */
const DOCUMENT_WARNING_DAYS = 14

/** Bookings with what the board shows: customer, car, category and cover photo */
const bookings = () =>
  Booking.query()
    .preload('customer')
    .preload('car', (car) =>
      car
        .preload('category')
        .preload('photos', (photos) => photos.preload('file').orderBy('sort_order', 'asc'))
    )

/**
 * The Today board (M3.10): what the desk has to do now - pickups and returns
 * due today, overdue rentals, late pickups (possible no-shows), holds about to
 * run out, unready customers, cars that can't legally go out - plus the fleet
 * right now and a 7-day outlook. One request, so the board loads at once.
 */
export default class TodayService {
  static async board(now = DateTime.now()) {
    const business = await Business.query().first()
    const zone = business?.timezone || 'Africa/Accra'
    const local = now.setZone(zone)
    const dayStart = local.startOf('day')
    const dayEnd = local.endOf('day')
    const [grace, requireVerified, noShowAfter] = await Promise.all([
      SettingsService.get('booking.return_grace_minutes'),
      SettingsService.get('booking.require_verified_customer_for_checkout'),
      SettingsService.get('cancellation.no_show_after_hours'),
    ])

    // ── Cars that can't (or soon can't) legally go out ──────────────
    const cars = await Car.query()
      .whereNull('archived_at')
      .whereNot('status', 'retired')
      .preload('documents')
      .preload('photos', (photos) => photos.preload('file').orderBy('sort_order', 'asc'))
    const carIssues = new Map<string, { level: 'critical' | 'warning'; issues: string[] }>()
    for (const car of cars) {
      const compliance = DocumentComplianceService.computeCarCompliance(car.documents)
      const soon =
        compliance.earliestExpiryDays !== null &&
        compliance.earliestExpiryDays <= DOCUMENT_WARNING_DAYS
      if (compliance.status === 'expired' || compliance.status === 'missing') {
        carIssues.set(car.id, { level: 'critical', issues: compliance.issues })
      } else if (soon) {
        carIssues.set(car.id, { level: 'warning', issues: compliance.issues })
      }
    }

    const readiness = (booking: Booking) => {
      const customer = booking.customer
      const needed = booking.driveType === 'self_drive' ? 'verified' : 'id_verified'
      const ok =
        !requireVerified ||
        customer.verificationStatus === 'verified' ||
        customer.verificationStatus === needed
      const issues: string[] = []
      if (!ok) {
        issues.push(
          booking.driveType === 'self_drive'
            ? 'ID and driving licence not verified'
            : 'ID not verified'
        )
      }
      if (customer.blacklistSeverity) issues.push('On the blacklist')
      if (booking.driveType === 'chauffeur' && !booking.driverId) issues.push('No driver assigned')
      const car = carIssues.get(booking.carId)
      if (car?.level === 'critical') issues.push('Car documents expired or missing')
      return { ready: issues.length === 0, issues }
    }
    const item = (booking: Booking) => ({
      ...bookingToJson(booking, { graceMinutes: grace }),
      readiness: readiness(booking),
    })

    // ── Today's pickups and returns ─────────────────────────────────
    const pickups = await bookings()
      .whereIn('status', ['pending', 'confirmed'])
      .whereBetween('pickup_at', [dayStart.toSQL()!, dayEnd.toSQL()!])
      .orderBy('pickup_at', 'asc')
    const returns = await bookings()
      .where('status', 'on_rent')
      .whereBetween('return_at', [dayStart.toSQL()!, dayEnd.toSQL()!])
      .orderBy('return_at', 'asc')
    const overdue = await bookings()
      .where('status', 'on_rent')
      .where('return_at', '<', local.minus({ minutes: grace }).toSQL()!)
      .orderBy('return_at', 'asc')
    // Pickup time passed before today and nobody came: chase or mark as a no-show
    const latePickups = await bookings()
      .whereIn('status', ['pending', 'confirmed'])
      .where('pickup_at', '<', dayStart.toSQL()!)
      .orderBy('pickup_at', 'asc')
    const holds = await bookings()
      .where('status', 'pending')
      .whereNotNull('hold_expires_at')
      .where('hold_expires_at', '<=', local.plus({ hours: HOLD_WARNING_HOURS }).toSQL()!)
      .orderBy('hold_expires_at', 'asc')

    // ── Fleet right now ──────────────────────────────────────────────
    const nowSql = local.toSQL()!
    const current = await CarAllocation.query()
      .where('active', true)
      .where('starts_at', '<=', nowSql)
      .where('ends_at', '>', nowSql)
      .preload('booking')
    const onRent = new Set<string>()
    const booked = new Set<string>()
    const blocked = new Set<string>()
    for (const allocation of current) {
      const status = allocation.booking?.status
      if (allocation.source === 'block' || allocation.source === 'maintenance') {
        blocked.add(allocation.carId)
      } else if (status === 'on_rent') onRent.add(allocation.carId)
      else booked.add(allocation.carId)
    }
    const fleet = { available: 0, onRent: 0, booked: 0, blocked: 0, offRoad: 0, total: cars.length }
    for (const car of cars) {
      if (car.status !== 'active') fleet.offRoad++
      else if (onRent.has(car.id)) fleet.onRent++
      else if (booked.has(car.id)) fleet.booked++
      else if (blocked.has(car.id)) fleet.blocked++
      else fleet.available++
    }

    // ── Next 7 days: pickups and returns per day ─────────────────────
    const weekEnd = dayStart.plus({ days: 7 })
    const count = async (column: 'pickup_at' | 'return_at', statuses: string[]) => {
      const rows = await db
        .from('bookings')
        .select(db.raw(`to_char(${column} AT TIME ZONE ?, 'YYYY-MM-DD') as day`, [zone]))
        .count('* as total')
        .whereIn('status', statuses)
        .where(column, '>=', dayStart.toSQL()!)
        .where(column, '<', weekEnd.toSQL()!)
        .groupBy('day')
      return new Map(rows.map((row: any) => [row.day as string, Number(row.total)]))
    }
    const pickupsByDay = await count('pickup_at', ['pending', 'confirmed'])
    const returnsByDay = await count('return_at', ['pending', 'confirmed', 'on_rent'])
    const week = Array.from({ length: 7 }, (_, index) => {
      const day = dayStart.plus({ days: index }).toISODate()!
      return { date: day, pickups: pickupsByDay.get(day) ?? 0, returns: returnsByDay.get(day) ?? 0 }
    })

    const attentionCars = cars
      .filter((car) => carIssues.has(car.id) || car.status !== 'active')
      .map((car) => {
        const photos = car.photos ?? []
        const cover = photos.find((photo) => photo.isCover) ?? photos[0]
        const issue = carIssues.get(car.id)
        return {
          id: car.id,
          name: `${car.make} ${car.model} ${car.year}`,
          registrationNo: car.registrationNo,
          status: car.status,
          coverUrl: cover?.file?.url ?? null,
          level: issue?.level ?? 'warning',
          issues: [
            ...(car.status !== 'active'
              ? [`Off the road (${car.status.replaceAll('_', ' ')})`]
              : []),
            ...(issue?.issues ?? []),
          ],
        }
      })
      .sort((a, b) => (a.level === b.level ? 0 : a.level === 'critical' ? -1 : 1))

    return {
      date: dayStart.toISODate(),
      generatedAt: local.toISO(),
      noShowAfterHours: noShowAfter,
      counts: {
        pickups: pickups.length,
        returns: returns.length,
        overdue: overdue.length,
        latePickups: latePickups.length,
        holds: holds.length,
        notReady: pickups.filter((booking) => !readiness(booking).ready).length,
        carsNeedingAttention: attentionCars.length,
      },
      pickups: pickups.map(item),
      returns: returns.map(item),
      overdue: overdue.map(item),
      latePickups: latePickups.map(item),
      holds: holds.map(item),
      cars: attentionCars,
      fleet,
      week,
    }
  }
}
