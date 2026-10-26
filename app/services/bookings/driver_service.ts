import type { HttpContext } from '@adonisjs/core/http'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import db from '@adonisjs/lucid/services/db'
import type { DateTime } from 'luxon'
import type Booking from '#models/booking'
import Driver from '#models/driver'
import DriverAllocation from '#models/driver_allocation'
import AuditService from '#services/audit_service'
import { BookingError } from '#services/bookings/booking_service'

const isOverlap = (error: any) =>
  error?.code === '23P01' || error?.message?.includes('driver_allocations_no_overlap')

/**
 * Chauffeur drivers on bookings (M3.9). A driver's time is held through
 * driver_allocations, whose exclusion constraint makes double-booking a
 * driver impossible - exactly like cars.
 */
export default class DriverService {
  /** Assign (or with null, remove) the booking's driver. */
  static async assign(ctx: HttpContext, booking: Booking, driverId: string | null) {
    if (booking.driveType !== 'chauffeur') {
      throw new BookingError('driverId', 'Only with-driver bookings get a driver.')
    }
    if (!['pending', 'confirmed', 'on_rent'].includes(booking.status)) {
      throw new BookingError(
        'driverId',
        `A ${booking.status.replaceAll('_', ' ')} booking can't change its driver.`
      )
    }
    let driver: Driver | null = null
    if (driverId) {
      driver = await Driver.find(driverId)
      if (!driver) throw new BookingError('driverId', 'Choose a driver.')
      if (driver.status !== 'active') {
        throw new BookingError(
          'driverId',
          `${driver.fullName} is ${driver.status.replace('_', ' ')}.`
        )
      }
      if (driver.licenceExpiresOn < booking.returnAt.startOf('day')) {
        throw new BookingError(
          'driverId',
          `${driver.fullName}'s licence expires on ${driver.licenceExpiresOn.toFormat('d LLL yyyy')}, before the return.`
        )
      }
    }

    const previous = booking.driverId
    try {
      await db.transaction(async (trx) => {
        await this.release(booking, trx)
        if (driver) {
          await DriverAllocation.create(
            {
              driverId: driver.id,
              bookingId: booking.id,
              startsAt: booking.pickupAt,
              endsAt: booking.returnAt,
              active: true,
            },
            { client: trx }
          )
        }
        booking.useTransaction(trx)
        booking.driverId = driver?.id ?? null
        await booking.save()
        await AuditService.record(
          ctx,
          {
            action: driver ? 'booking.driver_assigned' : 'booking.driver_removed',
            subject: { type: 'booking', id: booking.id, label: booking.reference },
            before: { driverId: previous },
            after: { driverId: driver?.id ?? null },
            metadata: driver ? { driver: driver.fullName } : undefined,
          },
          trx
        )
      })
    } catch (error) {
      if (isOverlap(error)) {
        throw new BookingError(
          'driverId',
          `${driver!.fullName} is already driving another booking at that time.`,
          409,
          'E_DRIVER_UNAVAILABLE'
        )
      }
      throw error
    }
    return booking
  }

  static async release(booking: Booking, trx: TransactionClientContract) {
    await DriverAllocation.query({ client: trx })
      .where('booking_id', booking.id)
      .where('active', true)
      .update({ active: false, updated_at: new Date() })
  }

  /**
   * Follow the booking's new times (extend, change dates, early return). Runs
   * inside the modification's transaction: a clash rolls the whole change back.
   */
  static async move(
    booking: Booking,
    startsAt: DateTime,
    endsAt: DateTime,
    trx: TransactionClientContract
  ) {
    try {
      await DriverAllocation.query({ client: trx })
        .where('booking_id', booking.id)
        .where('active', true)
        .update({ starts_at: startsAt.toSQL(), ends_at: endsAt.toSQL(), updated_at: new Date() })
    } catch (error) {
      if (isOverlap(error)) {
        throw new BookingError(
          'returnAt',
          'The driver is booked elsewhere for the new times - change the driver first.',
          409,
          'E_DRIVER_UNAVAILABLE'
        )
      }
      throw error
    }
  }

  /** Active drivers with a valid licence and no clash in [from, to). */
  static async available(from: DateTime, to: DateTime, excludeBookingId?: string) {
    return Driver.query()
      .where('status', 'active')
      .where('licence_expires_on', '>=', to.toISODate()!)
      .whereNotExists((sub) => {
        sub
          .from('driver_allocations')
          .whereColumn('driver_allocations.driver_id', 'drivers.id')
          .where('driver_allocations.active', true)
          .if(excludeBookingId, (q) =>
            q.whereNot('driver_allocations.booking_id', excludeBookingId!)
          )
          .whereRaw(
            'tstzrange(driver_allocations.starts_at, driver_allocations.ends_at) && tstzrange(?, ?)',
            [from.toSQL({ includeOffset: true })!, to.toSQL({ includeOffset: true })!]
          )
      })
      .orderBy('full_name', 'asc')
  }
}
