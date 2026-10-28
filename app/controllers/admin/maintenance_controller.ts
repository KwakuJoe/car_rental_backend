import type { HttpContext } from '@adonisjs/core/http'
import type { Infer } from '@vinejs/vine/types'
import { DateTime } from 'luxon'
import Car from '#models/car'
import JobCard, { OPEN_JOB_STATUSES } from '#models/job_card'
import MaintenanceSchedule from '#models/maintenance_schedule'
import AuditService from '#services/audit_service'
import { BookingError } from '#services/bookings/booking_service'
import MaintenanceService, { type JobCardInput } from '#services/maintenance/maintenance_service'
import { currentBusiness } from '#services/memo'
import {
  cancelJobCardValidator,
  completeJobCardValidator,
  createScheduleValidator,
  listJobCardsValidator,
  listSchedulesValidator,
  openJobCardValidator,
  updateJobCardValidator,
  updateScheduleValidator,
} from '#validators/maintenance'

const fail = (response: HttpContext['response'], error: BookingError) =>
  response.status(error.status).send({
    message: error.message,
    code: error.code,
    errors: [{ field: error.field, rule: 'maintenance', message: error.message }],
  })

async function attempt<T>(response: HttpContext['response'], action: () => Promise<T>) {
  try {
    return { ok: true as const, value: await action() }
  } catch (error) {
    if (error instanceof BookingError) return { ok: false as const, reply: fail(response, error) }
    throw error
  }
}

async function zone() {
  const business = await currentBusiness()
  return business?.timezone || 'Africa/Accra'
}

const carJson = (car: Car | null | undefined) =>
  car
    ? {
        id: car.id,
        name: car.publicTitle || `${car.make} ${car.model}`,
        registrationNo: car.registrationNo,
        odometerKm: car.currentOdometerKm,
      }
    : null

const scheduleJson = (schedule: MaintenanceSchedule, today: string) => ({
  id: schedule.id,
  carId: schedule.carId,
  car: carJson(schedule.car),
  task: schedule.task,
  intervalMonths: schedule.intervalMonths,
  remindDaysBefore: schedule.remindDaysBefore,
  lastDoneOn: schedule.lastDoneOn?.toISODate() ?? null,
  nextDueOn: schedule.nextDueOn.toISODate(),
  active: schedule.active,
  notes: schedule.notes,
  ...MaintenanceService.state(schedule, today),
})

const jobCardJson = (card: JobCard) => ({
  id: card.id,
  number: card.number,
  carId: card.carId,
  car: carJson(card.car),
  type: card.type,
  status: card.status,
  title: card.title,
  problem: card.problem,
  doneBy: card.doneBy,
  garageName: card.garageName,
  mechanicName: card.mechanicName,
  odometerKm: card.odometerKm,
  openedAt: card.openedAt.toISO(),
  expectedBackAt: card.expectedBackAt?.toISO() ?? null,
  completedAt: card.completedAt?.toISO() ?? null,
  offRoad: !!card.allocation?.active,
  // Still off the road past the time it was expected back
  lateBack:
    !!card.allocation?.active &&
    !!card.expectedBackAt &&
    card.expectedBackAt < DateTime.now() &&
    !card.completedAt,
  lines: card.lines,
  totalAmount: card.totalAmount,
  scheduleIds: card.scheduleIds,
  expenseId: card.expenseId,
  expenseStatus: card.expense?.status ?? null,
  notes: card.notes,
  cancelReason: card.cancelReason,
  createdBy: card.creator ? card.creator.fullName || card.creator.email : null,
  completedBy: card.completer ? card.completer.fullName || card.completer.email : null,
  createdAt: card.createdAt.toISO(),
})

const jobCards = () =>
  JobCard.query()
    .preload('car')
    .preload('allocation')
    .preload('expense')
    .preload('creator')
    .preload('completer')

/** "YYYY-MM-DDTHH:mm" (or a date) in the business time zone */
function when(value: string, tz: string, field: string) {
  const parsed = DateTime.fromISO(value, { zone: tz })
  if (!parsed.isValid) throw new BookingError(field, 'Enter a valid date and time.')
  return parsed
}

function jobInput(
  payload: Infer<typeof openJobCardValidator> | Infer<typeof updateJobCardValidator>,
  tz: string
): JobCardInput {
  if (payload.doneBy === 'garage' && !payload.garageName) {
    throw new BookingError('garageName', 'Which garage?')
  }
  return {
    type: payload.type,
    title: payload.title,
    problem: payload.problem ?? null,
    doneBy: payload.doneBy,
    garageName: payload.garageName ?? null,
    mechanicName: payload.mechanicName ?? null,
    odometerKm: payload.odometerKm ?? null,
    openedAt: when(payload.openedAt, tz, 'openedAt'),
    expectedBackAt: payload.expectedBackAt
      ? when(payload.expectedBackAt, tz, 'expectedBackAt')
      : null,
    lines: payload.lines ?? [],
    scheduleIds: [...new Set(payload.scheduleIds ?? [])],
    notes: payload.notes ?? null,
  }
}

/**
 * Maintenance (M8.1): service schedules by time and job cards.
 * maintenance.view to see them; maintenance.manage to change them.
 */
export default class MaintenanceController {
  // ── Schedules ──────────────────────────────────────────────────────

  async schedules({ request, response }: HttpContext) {
    const payload = await request.validateUsing(listSchedulesValidator)
    const tz = await zone()
    const today = DateTime.now().setZone(tz).toISODate()!
    const query = MaintenanceSchedule.query()
      .where('active', true)
      .whereHas('car', (car) => car.whereNull('archived_at').whereNot('status', 'retired'))
      .preload('car')
      .orderBy('next_due_on', 'asc')
    if (payload.carId) query.where('car_id', payload.carId)
    if (payload.search) {
      const term = `%${payload.search}%`
      query.where((q) =>
        q
          .whereILike('task', term)
          .orWhereHas('car', (car) =>
            car
              .whereILike('registration_no', term)
              .orWhereILike('make', term)
              .orWhereILike('model', term)
          )
      )
    }
    const schedules = await query
    const rows = schedules.map((schedule) => scheduleJson(schedule, today))
    const overdue = rows.filter((row) => row.state === 'overdue')
    const dueSoon = rows.filter((row) => row.state === 'due_soon')
    const inGarage = await JobCard.query()
      .whereIn('status', OPEN_JOB_STATUSES)
      .whereHas('allocation', (allocation) =>
        allocation
          .where('active', true)
          .where('starts_at', '<=', DateTime.now().toSQL()!)
          .where('ends_at', '>', DateTime.now().toSQL()!)
      )
      .count('* as total')
    return response.ok({
      message: 'Service schedules',
      data:
        payload.state === 'overdue'
          ? overdue
          : payload.state === 'due'
            ? [...overdue, ...dueSoon]
            : rows,
      meta: {
        overdue: overdue.length,
        dueSoon: dueSoon.length,
        inGarage: Number(inGarage[0]?.$extras.total ?? 0),
      },
    })
  }

  async storeSchedule(ctx: HttpContext) {
    const { auth, request, response } = ctx
    const payload = await request.validateUsing(createScheduleValidator)
    const tz = await zone()
    const cars = payload.categoryId
      ? await Car.query()
          .where('category_id', payload.categoryId)
          .whereNull('archived_at')
          .whereNot('status', 'retired')
      : await Car.query().whereIn('id', payload.carIds ?? [])
    if (cars.length === 0) {
      return response.unprocessableEntity({
        message: 'Choose at least one car.',
        errors: [{ field: 'carIds', message: 'Choose at least one car.' }],
      })
    }
    const today = DateTime.now().setZone(tz).startOf('day')
    const last = payload.lastDoneOn ? DateTime.fromISO(payload.lastDoneOn.toISODate()!) : null
    const nextDueOn = payload.nextDueOn
      ? DateTime.fromISO(payload.nextDueOn.toISODate()!)
      : MaintenanceService.nextDue(last ?? today, payload.intervalMonths)
    const created = await MaintenanceSchedule.createMany(
      cars.map((car) => ({
        carId: car.id,
        task: payload.task,
        intervalMonths: payload.intervalMonths,
        remindDaysBefore: payload.remindDaysBefore ?? 14,
        lastDoneOn: last,
        nextDueOn,
        active: true,
        notes: payload.notes ?? null,
        createdBy: auth.getUserOrFail().id,
      }))
    )
    await AuditService.record(ctx, {
      action: 'maintenance.schedule_created',
      subject: { type: 'maintenance_schedule', id: created[0].id, label: payload.task },
      after: {
        cars: cars.length,
        intervalMonths: payload.intervalMonths,
        nextDueOn: nextDueOn.toISODate(),
      },
    })
    return response.created({
      message:
        cars.length === 1 ? 'Service scheduled' : `Service scheduled for ${cars.length} cars`,
      data: { count: created.length },
    })
  }

  async updateSchedule(ctx: HttpContext) {
    const { params, request, response } = ctx
    const payload = await request.validateUsing(updateScheduleValidator)
    const schedule = await MaintenanceSchedule.findOrFail(params.id)
    const before = {
      task: schedule.task,
      intervalMonths: schedule.intervalMonths,
      nextDueOn: schedule.nextDueOn.toISODate(),
      active: schedule.active,
    }
    const last = payload.lastDoneOn ? DateTime.fromISO(payload.lastDoneOn.toISODate()!) : null
    schedule.merge({
      task: payload.task,
      intervalMonths: payload.intervalMonths,
      remindDaysBefore: payload.remindDaysBefore ?? schedule.remindDaysBefore,
      lastDoneOn: last,
      nextDueOn: payload.nextDueOn
        ? DateTime.fromISO(payload.nextDueOn.toISODate()!)
        : last
          ? MaintenanceService.nextDue(last, payload.intervalMonths)
          : schedule.nextDueOn,
      notes: payload.notes ?? null,
      active: payload.active ?? schedule.active,
    })
    await schedule.save()
    await AuditService.record(ctx, {
      action: 'maintenance.schedule_updated',
      subject: { type: 'maintenance_schedule', id: schedule.id, label: schedule.task },
      before,
      after: {
        task: schedule.task,
        intervalMonths: schedule.intervalMonths,
        nextDueOn: schedule.nextDueOn.toISODate(),
        active: schedule.active,
      },
    })
    await schedule.load('car')
    const today = DateTime.now()
      .setZone(await zone())
      .toISODate()!
    return response.ok({ message: 'Schedule updated', data: scheduleJson(schedule, today) })
  }

  /** Stops it (kept for history) */
  async destroySchedule(ctx: HttpContext) {
    const schedule = await MaintenanceSchedule.findOrFail(ctx.params.id)
    schedule.active = false
    await schedule.save()
    await AuditService.record(ctx, {
      action: 'maintenance.schedule_stopped',
      subject: { type: 'maintenance_schedule', id: schedule.id, label: schedule.task },
    })
    return ctx.response.ok({ message: 'Schedule stopped' })
  }

  // ── Job cards ──────────────────────────────────────────────────────

  async jobCards({ request, response }: HttpContext) {
    const payload = await request.validateUsing(listJobCardsValidator)
    const query = jobCards()
    const status = payload.status ?? 'open'
    if (status === 'open') query.whereIn('status', OPEN_JOB_STATUSES)
    else if (status !== 'all') query.where('status', status)
    if (payload.carId) query.where('car_id', payload.carId)
    if (payload.search) {
      const term = `%${payload.search}%`
      query.where((q) =>
        q
          .whereILike('number', term)
          .orWhereILike('title', term)
          .orWhereILike('garage_name', term)
          .orWhereHas('car', (car) => car.whereILike('registration_no', term))
      )
    }
    const page = await query
      .orderBy('opened_at', 'desc')
      .paginate(payload.page ?? 1, payload.limit ?? 20)
    return response.ok({
      message: 'Job cards',
      data: page.all().map(jobCardJson),
      meta: page.getMeta(),
    })
  }

  async showJobCard({ params, response }: HttpContext) {
    const card = await jobCards().where('id', params.id).firstOrFail()
    return response.ok({ message: 'Job card', data: jobCardJson(card) })
  }

  async openJobCard(ctx: HttpContext) {
    const { auth, request, response } = ctx
    const payload = await request.validateUsing(openJobCardValidator)
    const tz = await zone()
    const result = await attempt(response, () =>
      MaintenanceService.open(payload.carId, jobInput(payload, tz), auth.getUserOrFail())
    )
    if (!result.ok) return result.reply
    const card = result.value
    await AuditService.record(ctx, {
      action: 'maintenance.job_opened',
      subject: { type: 'job_card', id: card.id, label: card.number },
      after: {
        carId: card.carId,
        type: card.type,
        totalAmount: card.totalAmount,
        expectedBackAt: card.expectedBackAt?.toISO() ?? null,
      },
    })
    return response.created({
      message: `Job card ${card.number} opened`,
      data: jobCardJson(await jobCards().where('id', card.id).firstOrFail()),
    })
  }

  async updateJobCard(ctx: HttpContext) {
    const { auth, params, request, response } = ctx
    const payload = await request.validateUsing(updateJobCardValidator)
    const tz = await zone()
    const result = await attempt(response, () =>
      MaintenanceService.update(
        params.id,
        { ...jobInput(payload, tz), status: payload.status },
        auth.getUserOrFail()
      )
    )
    if (!result.ok) return result.reply
    const card = result.value
    await AuditService.record(ctx, {
      action: 'maintenance.job_updated',
      subject: { type: 'job_card', id: card.id, label: card.number },
      after: {
        status: card.status,
        totalAmount: card.totalAmount,
        expectedBackAt: card.expectedBackAt?.toISO() ?? null,
      },
    })
    return response.ok({
      message: 'Job card updated',
      data: jobCardJson(await jobCards().where('id', card.id).firstOrFail()),
    })
  }

  async completeJobCard(ctx: HttpContext) {
    const { auth, params, request, response } = ctx
    const payload = await request.validateUsing(completeJobCardValidator)
    const tz = await zone()
    const result = await attempt(response, async () => {
      const completedAt = payload.completedAt
        ? when(payload.completedAt, tz, 'completedAt')
        : DateTime.now()
      if (completedAt > DateTime.now().plus({ minutes: 5 })) {
        throw new BookingError('completedAt', 'It can’t be completed in the future.')
      }
      return MaintenanceService.complete(
        params.id,
        {
          completedAt,
          odometerKm: payload.odometerKm ?? null,
          paidVia: payload.paidVia ?? null,
          recordExpense: payload.recordExpense ?? true,
        },
        auth.getUserOrFail()
      )
    })
    if (!result.ok) return result.reply
    const card = result.value
    await AuditService.record(ctx, {
      action: 'maintenance.job_completed',
      subject: { type: 'job_card', id: card.id, label: card.number },
      after: { totalAmount: card.totalAmount, expenseId: card.expenseId },
    })
    return response.ok({
      message: `${card.number} completed`,
      data: jobCardJson(await jobCards().where('id', card.id).firstOrFail()),
    })
  }

  async cancelJobCard(ctx: HttpContext) {
    const { params, request, response } = ctx
    const { reason } = await request.validateUsing(cancelJobCardValidator)
    const result = await attempt(response, () => MaintenanceService.cancel(params.id, reason))
    if (!result.ok) return result.reply
    const card = result.value
    await AuditService.record(ctx, {
      action: 'maintenance.job_cancelled',
      subject: { type: 'job_card', id: card.id, label: card.number },
      metadata: { reason },
    })
    return response.ok({
      message: `${card.number} cancelled`,
      data: jobCardJson(await jobCards().where('id', card.id).firstOrFail()),
    })
  }
}
