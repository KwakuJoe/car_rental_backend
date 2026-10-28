import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'
import Car from '#models/car'
import CarAllocation from '#models/car_allocation'
import CarDamage from '#models/car_damage'
import Expense, { type ExpensePaidVia } from '#models/expense'
import ExpenseCategory from '#models/expense_category'
import JobCard, {
  OPEN_JOB_STATUSES,
  type JobCardLine,
  type JobCardStatus,
  type JobCardType,
  type JobDoneBy,
} from '#models/job_card'
import Incident from '#models/incident'
import MaintenanceSchedule from '#models/maintenance_schedule'
import OdometerLog from '#models/odometer_log'
import type User from '#models/user'
import { BookingError } from '#services/bookings/booking_service'
import IncidentService from '#services/incidents/incident_service'
import NumberingService from '#services/numbering_service'
import { userCan } from '#helpers/permissions'

export type ScheduleState = { state: 'overdue' | 'due_soon' | 'ok'; daysLeft: number }

export type JobCardInput = {
  type: JobCardType
  title: string
  problem: string | null
  doneBy: JobDoneBy
  garageName: string | null
  mechanicName: string | null
  odometerKm: number | null
  openedAt: DateTime
  /** Off the road until then (bookings can't take the car); null = stays available */
  expectedBackAt: DateTime | null
  lines: Omit<JobCardLine, 'amount'>[]
  scheduleIds: string[]
  /** Damage marks on the car this repairs (marked repaired when completed) */
  damageIds: string[]
  /** The accident / incident this repairs */
  incidentId: string | null
  notes: string | null
}

const total = (lines: JobCardLine[]) => lines.reduce((sum, line) => sum + line.amount, 0)

const priced = (lines: Omit<JobCardLine, 'amount'>[]): JobCardLine[] =>
  lines.map((line) => ({
    ...line,
    amount: Math.round(line.quantity * line.unitAmount),
  }))

/** Postgres exclusion violation: another allocation holds the car */
const isClash = (error: unknown) =>
  (error as { code?: string })?.code === '23P01' ||
  String((error as Error)?.message).includes('car_allocations_no_overlap')

/**
 * Maintenance (M8.1), by time. Schedules: every N months per car; the next
 * due date moves on when a job card that covers it is completed. Job cards:
 * a service or repair at a garage or by the company's own mechanic; with an
 * expected-back time the car is off the road (a 'maintenance' allocation,
 * so no booking can take it) until it's completed or cancelled. Completing
 * records the cost as a car expense (approved straight away for someone who
 * approves expenses) and logs the odometer.
 */
export default class MaintenanceService {
  /** Next due date: N months after the date it was done (or first due) */
  static nextDue(from: DateTime, months: number) {
    return from.plus({ months }).startOf('day')
  }

  static state(schedule: MaintenanceSchedule, today: string): ScheduleState {
    const due = schedule.nextDueOn.toISODate()!
    const daysLeft = Math.round(DateTime.fromISO(due).diff(DateTime.fromISO(today), 'days').days)
    return {
      state: daysLeft < 0 ? 'overdue' : daysLeft <= schedule.remindDaysBefore ? 'due_soon' : 'ok',
      daysLeft,
    }
  }

  /** Takes the car off the road from openedAt to expectedBackAt (409 naming what's in the way). */
  private static async block(
    trx: TransactionClientContract,
    card: { carId: string; number: string; title: string },
    from: DateTime,
    to: DateTime,
    user: User
  ) {
    if (to <= from) throw new BookingError('expectedBackAt', 'It must be back after it went in.')
    await this.assertFree(trx, card.carId, from, to)
    try {
      return await CarAllocation.create(
        {
          carId: card.carId,
          source: 'maintenance',
          reason: `${card.number}: ${card.title}`,
          startsAt: from,
          endsAt: to,
          endsAtWithBuffer: to,
          bufferMinutes: 0,
          active: true,
          createdBy: user.id,
        },
        { client: trx }
      )
    } catch (error) {
      if (isClash(error)) throw this.clash()
      throw error
    }
  }

  /** A clear 409 when a booking or block already has the car then */
  private static async assertFree(
    trx: TransactionClientContract,
    carId: string,
    from: DateTime,
    to: DateTime,
    exceptAllocationId?: string | null
  ) {
    const query = CarAllocation.query({ client: trx })
      .where('car_id', carId)
      .where('active', true)
      .whereRaw('tstzrange(starts_at, ends_at_with_buffer) && tstzrange(?, ?)', [
        from.toSQL({ includeOffset: true })!,
        to.toSQL({ includeOffset: true })!,
      ])
      .preload('booking')
    if (exceptAllocationId) query.whereNot('id', exceptAllocationId)
    const clash = await query.first()
    if (!clash) return
    throw new BookingError(
      'expectedBackAt',
      clash.booking
        ? `Booking ${clash.booking.reference} has the car then. Swap its car or change the dates first.`
        : 'The car is already blocked for some of that time.',
      409
    )
  }

  private static clash() {
    return new BookingError('expectedBackAt', 'The car is already booked or blocked then.', 409)
  }

  private static async schedulesFor(trx: TransactionClientContract, carId: string, ids: string[]) {
    if (ids.length === 0) return []
    const rows = await MaintenanceSchedule.query({ client: trx })
      .where('car_id', carId)
      .whereIn('id', ids)
    if (rows.length !== new Set(ids).size) {
      throw new BookingError('scheduleIds', 'Choose services scheduled for this car.')
    }
    return rows
  }

  /** The damage and incident must be this car's */
  private static async assertLinks(
    trx: TransactionClientContract,
    carId: string,
    input: JobCardInput
  ) {
    if (input.damageIds.length) {
      const damages = await CarDamage.query({ client: trx })
        .where('car_id', carId)
        .whereIn('id', input.damageIds)
      if (damages.length !== new Set(input.damageIds).size) {
        throw new BookingError('damageIds', 'Choose damage recorded on this car.')
      }
    }
    if (input.incidentId) {
      const incident = await Incident.find(input.incidentId, { client: trx })
      if (!incident || incident.carId !== carId) {
        throw new BookingError('incidentId', 'That incident was with another car.')
      }
    }
  }

  static async open(carId: string, input: JobCardInput, user: User) {
    return db.transaction(async (trx) => {
      const car = await Car.findOrFail(carId, { client: trx })
      if (car.archivedAt) throw new BookingError('carId', 'This car is archived.')
      await this.schedulesFor(trx, car.id, input.scheduleIds)
      await this.assertLinks(trx, car.id, input)
      const lines = priced(input.lines)
      const card = new JobCard().useTransaction(trx)
      card.merge({
        number: await NumberingService.next('job_card', trx),
        branchId: car.branchId,
        carId: car.id,
        type: input.type,
        status: 'open',
        title: input.title,
        problem: input.problem,
        doneBy: input.doneBy,
        garageName: input.doneBy === 'garage' ? input.garageName : null,
        mechanicName: input.doneBy === 'in_house' ? input.mechanicName : null,
        odometerKm: input.odometerKm,
        openedAt: input.openedAt,
        expectedBackAt: input.expectedBackAt,
        lines,
        totalAmount: total(lines),
        scheduleIds: input.scheduleIds,
        damageIds: input.damageIds,
        incidentId: input.incidentId,
        notes: input.notes,
        createdBy: user.id,
      })
      if (input.expectedBackAt) {
        const allocation = await this.block(trx, card, input.openedAt, input.expectedBackAt, user)
        card.allocationId = allocation.id
      }
      await card.save()
      return card
    })
  }

  /** While it's still open: details, lines, status, the expected-back time (the block follows). */
  static async update(id: string, input: JobCardInput & { status: JobCardStatus }, user: User) {
    return db.transaction(async (trx) => {
      const card = await JobCard.query({ client: trx }).where('id', id).forUpdate().firstOrFail()
      if (!OPEN_JOB_STATUSES.includes(card.status)) {
        throw new BookingError('status', 'A completed or cancelled job card can’t be changed.', 409)
      }
      if (!OPEN_JOB_STATUSES.includes(input.status)) {
        throw new BookingError('status', 'Use Complete or Cancel for that.')
      }
      await this.schedulesFor(trx, card.carId, input.scheduleIds)
      await this.assertLinks(trx, card.carId, input)
      const lines = priced(input.lines)

      // The block follows the expected-back time
      const allocation = card.allocationId
        ? await CarAllocation.find(card.allocationId, { client: trx })
        : null
      if (input.expectedBackAt) {
        if (allocation?.active) {
          if (input.expectedBackAt <= allocation.startsAt) {
            throw new BookingError('expectedBackAt', 'It must be back after it went in.')
          }
          await this.assertFree(
            trx,
            card.carId,
            allocation.startsAt,
            input.expectedBackAt,
            allocation.id
          )
          allocation.merge({ endsAt: input.expectedBackAt, endsAtWithBuffer: input.expectedBackAt })
          try {
            await allocation.save()
          } catch (error) {
            if (isClash(error)) throw this.clash()
            throw error
          }
        } else {
          const from = DateTime.max(input.openedAt, DateTime.now())
          const created = await this.block(trx, card, from, input.expectedBackAt, user)
          card.allocationId = created.id
        }
      } else if (allocation?.active) {
        allocation.active = false
        await allocation.save()
      }

      card.merge({
        type: input.type,
        status: input.status,
        title: input.title,
        problem: input.problem,
        doneBy: input.doneBy,
        garageName: input.doneBy === 'garage' ? input.garageName : null,
        mechanicName: input.doneBy === 'in_house' ? input.mechanicName : null,
        odometerKm: input.odometerKm,
        openedAt: input.openedAt,
        expectedBackAt: input.expectedBackAt,
        lines,
        totalAmount: total(lines),
        scheduleIds: input.scheduleIds,
        damageIds: input.damageIds,
        incidentId: input.incidentId,
        notes: input.notes,
      })
      await card.save()
      return card
    })
  }

  /**
   * Done: the car is free from now, the covered schedules move on from the
   * completion date, the odometer is logged, and the cost becomes a car
   * expense (unless there's nothing to pay or recordExpense is off).
   */
  static async complete(
    id: string,
    input: {
      completedAt: DateTime
      odometerKm: number | null
      paidVia: ExpensePaidVia | null
      recordExpense: boolean
    },
    user: User
  ) {
    return db.transaction(async (trx) => {
      const card = await JobCard.query({ client: trx }).where('id', id).forUpdate().firstOrFail()
      if (!OPEN_JOB_STATUSES.includes(card.status)) {
        throw new BookingError('status', 'This job card is already closed.', 409)
      }
      const car = await Car.query({ client: trx }).where('id', card.carId).forUpdate().firstOrFail()
      const done = input.completedAt

      if (card.allocationId) {
        const allocation = await CarAllocation.find(card.allocationId, { client: trx })
        if (allocation?.active) {
          if (done <= allocation.startsAt) allocation.active = false
          else if (done < allocation.endsAt) {
            allocation.merge({ endsAt: done, endsAtWithBuffer: done })
          }
          await allocation.save()
        }
      }

      const schedules = await this.schedulesFor(trx, card.carId, card.scheduleIds)
      for (const schedule of schedules) {
        schedule.useTransaction(trx)
        schedule.lastDoneOn = done.startOf('day')
        schedule.nextDueOn = this.nextDue(done, schedule.intervalMonths)
        await schedule.save()
      }

      // The damage it fixed is no longer open
      for (const damageId of card.damageIds) {
        await IncidentService.resolveDamage(
          damageId,
          { resolution: 'repaired', note: card.number, jobCardId: card.id },
          trx
        )
      }

      const odometer = input.odometerKm ?? card.odometerKm
      if (odometer !== null && odometer > car.currentOdometerKm) {
        await OdometerLog.create(
          {
            carId: car.id,
            previousKm: car.currentOdometerKm,
            newKm: odometer,
            source: 'maintenance',
            reason: `${card.number}: ${card.title}`,
            recordedBy: user.id,
          },
          { client: trx }
        )
        car.useTransaction(trx)
        car.currentOdometerKm = odometer
        await car.save()
      }

      if (input.recordExpense && card.totalAmount > 0) {
        if (!input.paidVia) throw new BookingError('paidVia', 'How was it paid?')
        const slug = card.type === 'service' || card.type === 'inspection' ? 'servicing' : 'repairs'
        const category =
          (await ExpenseCategory.query({ client: trx }).where('slug', slug).first()) ??
          (await ExpenseCategory.query({ client: trx }).where('slug', 'other').first())
        if (!category) throw new BookingError('paidVia', 'Add an expense category first.')
        const approver = await userCan(user, 'expenses.approve')
        const expense = await Expense.create(
          {
            branchId: card.branchId,
            categoryId: category.id,
            carId: card.carId,
            description: `${card.number}: ${card.title}`.slice(0, 200),
            vendor: card.doneBy === 'garage' ? card.garageName : card.mechanicName,
            amount: card.totalAmount,
            paidVia: input.paidVia,
            paidAt: done,
            reference: card.number,
            submittedBy: user.id,
            status: approver ? 'approved' : 'submitted',
            approvedBy: approver ? user.id : null,
            approvedAt: approver ? DateTime.now() : null,
          },
          { client: trx }
        )
        card.expenseId = expense.id
      }

      card.useTransaction(trx)
      card.merge({
        status: 'completed',
        completedAt: done,
        completedBy: user.id,
        odometerKm: odometer,
      })
      await card.save()
      return card
    })
  }

  /** Called off: the car is free again; nothing is recorded as spent. */
  static async cancel(id: string, reason: string) {
    return db.transaction(async (trx) => {
      const card = await JobCard.query({ client: trx }).where('id', id).forUpdate().firstOrFail()
      if (!OPEN_JOB_STATUSES.includes(card.status)) {
        throw new BookingError('status', 'This job card is already closed.', 409)
      }
      if (card.allocationId) {
        await CarAllocation.query({ client: trx })
          .where('id', card.allocationId)
          .update({ active: false })
      }
      card.useTransaction(trx)
      card.merge({ status: 'cancelled', cancelReason: reason })
      await card.save()
      return card
    })
  }
}
