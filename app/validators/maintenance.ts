import vine from '@vinejs/vine'
import { JOB_CARD_STATUSES, JOB_CARD_TYPES, JOB_DONE_BY } from '#models/job_card'
import { EXPENSE_PAID_VIA } from '#models/expense'

const date = () => vine.date({ formats: ['YYYY-MM-DD'] })
const optionalText = (max: number) => vine.string().trim().maxLength(max).nullable().optional()

export const listSchedulesValidator = vine.create({
  carId: vine.string().optional(),
  state: vine.enum(['due', 'overdue', 'all']).optional(),
  search: vine.string().trim().maxLength(100).optional(),
})

const scheduleFields = {
  task: vine.string().trim().minLength(2).maxLength(120),
  intervalMonths: vine.number().withoutDecimals().min(1).max(60),
  remindDaysBefore: vine.number().withoutDecimals().min(0).max(90).optional(),
  // When it was last done (the next due date follows), or the first due date
  lastDoneOn: date().nullable().optional(),
  nextDueOn: date().nullable().optional(),
  notes: optionalText(500),
}

/** For several cars at once (or every car in a category) */
export const createScheduleValidator = vine.create({
  carIds: vine.array(vine.string()).minLength(1).maxLength(500).optional(),
  categoryId: vine.string().optional(),
  ...scheduleFields,
})

export const updateScheduleValidator = vine.create({
  ...scheduleFields,
  active: vine.boolean().optional(),
})

export const listJobCardsValidator = vine.create({
  page: vine.number().min(1).optional(),
  limit: vine.number().min(1).max(100).optional(),
  // open = not completed or cancelled yet
  status: vine.enum(['open', 'completed', 'cancelled', 'all']).optional(),
  carId: vine.string().optional(),
  search: vine.string().trim().maxLength(100).optional(),
})

const jobCardFields = {
  type: vine.enum(JOB_CARD_TYPES),
  title: vine.string().trim().minLength(2).maxLength(200),
  problem: optionalText(2000),
  doneBy: vine.enum(JOB_DONE_BY),
  garageName: optionalText(120),
  mechanicName: optionalText(120),
  odometerKm: vine.number().withoutDecimals().min(0).max(5_000_000).nullable().optional(),
  openedAt: vine.string().trim().maxLength(40),
  // Off the road until then; null = the car stays bookable
  expectedBackAt: vine.string().trim().maxLength(40).nullable().optional(),
  lines: vine
    .array(
      vine.object({
        kind: vine.enum(['part', 'labour']),
        description: vine.string().trim().minLength(1).maxLength(200),
        quantity: vine.number().min(0.01).max(10_000),
        unitAmount: vine.number().withoutDecimals().min(0).max(100_000_000),
      })
    )
    .maxLength(100)
    .optional(),
  scheduleIds: vine.array(vine.string()).maxLength(50).optional(),
  damageIds: vine.array(vine.string()).maxLength(50).optional(),
  incidentId: vine.string().nullable().optional(),
  notes: optionalText(2000),
}

export const openJobCardValidator = vine.create({ carId: vine.string(), ...jobCardFields })

export const updateJobCardValidator = vine.create({
  ...jobCardFields,
  status: vine.enum(JOB_CARD_STATUSES),
})

export const completeJobCardValidator = vine.create({
  completedAt: vine.string().trim().maxLength(40).optional(),
  odometerKm: vine.number().withoutDecimals().min(0).max(5_000_000).nullable().optional(),
  paidVia: vine.enum(EXPENSE_PAID_VIA).nullable().optional(),
  // Record the cost as a car expense (default yes)
  recordExpense: vine.boolean().optional(),
})

export const cancelJobCardValidator = vine.create({
  reason: vine.string().trim().minLength(3).maxLength(300),
})
