import type { HttpContext } from '@adonisjs/core/http'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import Car from '#models/car'
import CarAllocation from '#models/car_allocation'
import type User from '#models/user'
import AuditService from '#services/audit_service'

export default class AvailabilityService {
  /**
   * Blocks a vehicle from availability for maintenance, owner use, or inspection.
   * Leverages the Postgres GiST exclusion constraint so concurrent attempts to allocate
   * or block this vehicle on overlapping dates fail definitively.
   */
  static async createBlock(
    ctx: HttpContext,
    carId: string,
    payload: {
      startsAt: string | DateTime
      endsAt: string | DateTime
      reason?: string | null
      bufferMinutes?: number
    },
    user: User,
    client?: TransactionClientContract
  ) {
    const trx = client ?? (await db.transaction())
    const shouldCommit = !client

    const startsAt =
      typeof payload.startsAt === 'string'
        ? DateTime.fromISO(payload.startsAt)
        : payload.startsAt

    const endsAt =
      typeof payload.endsAt === 'string'
        ? DateTime.fromISO(payload.endsAt)
        : payload.endsAt

    if (endsAt <= startsAt) {
      throw new Error('End date and time must be after the start date and time')
    }

    const bufferMinutes = payload.bufferMinutes ?? 0
    const endsAtWithBuffer = endsAt.plus({ minutes: bufferMinutes })

    const car = await Car.findOrFail(carId, { client: trx })

    try {
      const allocation = await CarAllocation.create(
        {
          carId: car.id,
          source: 'block',
          reason: payload.reason ? payload.reason.trim() : null,
          startsAt,
          endsAt,
          endsAtWithBuffer,
          bufferMinutes,
          active: true,
          createdBy: user.id,
        },
        { client: trx }
      )

      await AuditService.record(
        ctx,
        {
          action: 'car.blocked',
          subject: {
            type: 'car',
            id: car.id,
            label: `${car.make} ${car.model} (${car.registrationNo})`,
          },
          metadata: {
            allocationId: allocation.id,
            startsAt: startsAt.toISO(),
            endsAt: endsAt.toISO(),
            reason: payload.reason,
          },
        },
        trx
      )

      if (shouldCommit) {
        await trx.commit()
      }

      await allocation.load('creator')
      return allocation
    } catch (error: any) {
      if (shouldCommit) {
        await trx.rollback()
      }

      // Postgres code 23P01: exclusion_violation
      if (error.code === '23P01' || error.message?.includes('car_allocations_no_overlap')) {
        const conflictError: any = new Error(
          'Vehicle is already allocated or blocked during the requested dates'
        )
        conflictError.status = 409
        conflictError.code = 'E_CAR_UNAVAILABLE'
        throw conflictError
      }

      throw error
    }
  }

  /**
   * Releases an active availability block.
   */
  static async releaseBlock(
    ctx: HttpContext,
    carId: string,
    blockId: string,
    client?: TransactionClientContract
  ) {
    const trx = client ?? (await db.transaction())
    const shouldCommit = !client

    const allocation = await CarAllocation.query({ client: trx })
      .where('id', blockId)
      .where('car_id', carId)
      .where('source', 'block')
      .firstOrFail()

    const car = await Car.findOrFail(carId, { client: trx })

    allocation.active = false
    await allocation.save()

    await AuditService.record(
      ctx,
      {
        action: 'car.unblocked',
        subject: {
          type: 'car',
          id: car.id,
          label: `${car.make} ${car.model} (${car.registrationNo})`,
        },
        metadata: {
          allocationId: allocation.id,
          releasedAt: DateTime.now().toISO(),
        },
      },
      trx
    )

    if (shouldCommit) {
      await trx.commit()
    }

    return allocation
  }

  /**
   * Check whether a specific car is available for a date range without conflicts.
   */
  static async isCarAvailable(
    carId: string,
    startsAt: string | DateTime,
    endsAt: string | DateTime
  ): Promise<boolean> {
    const from = typeof startsAt === 'string' ? DateTime.fromISO(startsAt) : startsAt
    const to = typeof endsAt === 'string' ? DateTime.fromISO(endsAt) : endsAt

    const overlap = await CarAllocation.query()
      .where('car_id', carId)
      .where('active', true)
      .whereRaw(
        'tstzrange(starts_at, ends_at_with_buffer) && tstzrange(?, ?)',
        [from.toSQL({ includeOffset: true })!, to.toSQL({ includeOffset: true })!]
      )
      .first()

    return !overlap
  }

  /**
   * Search for available cars across categories and branches.
   */
  static async getAvailableCars(
    startsAt: string | DateTime,
    endsAt: string | DateTime,
    filters?: { categoryId?: string; branchId?: string }
  ) {
    const from = typeof startsAt === 'string' ? DateTime.fromISO(startsAt) : startsAt
    const to = typeof endsAt === 'string' ? DateTime.fromISO(endsAt) : endsAt

    const query = Car.query()
      .where('status', 'active')
      .whereNull('archived_at')
      .whereNotExists((subQuery) => {
        subQuery
          .from('car_allocations')
          .whereColumn('car_allocations.car_id', 'cars.id')
          .where('car_allocations.active', true)
          .whereRaw(
            'tstzrange(car_allocations.starts_at, car_allocations.ends_at_with_buffer) && tstzrange(?, ?)',
            [from.toSQL({ includeOffset: true })!, to.toSQL({ includeOffset: true })!]
          )
      })

    if (filters?.categoryId) {
      query.where('category_id', filters.categoryId)
    }
    if (filters?.branchId) {
      query.where('branch_id', filters.branchId)
    }

    return query
      .preload('category')
      .preload('branch')
      .preload('photos', (pq) => pq.preload('file').orderBy('sort_order', 'asc'))
  }
}
