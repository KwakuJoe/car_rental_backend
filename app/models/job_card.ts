import { JobCardSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Car from '#models/car'
import CarAllocation from '#models/car_allocation'
import Expense from '#models/expense'
import User from '#models/user'
import { withUlid } from '#models/mixins/with_ulid'

export const JOB_CARD_TYPES = ['service', 'repair', 'accident', 'inspection', 'other'] as const
export type JobCardType = (typeof JOB_CARD_TYPES)[number]
export const JOB_CARD_STATUSES = [
  'open',
  'in_progress',
  'waiting_parts',
  'completed',
  'cancelled',
] as const
export type JobCardStatus = (typeof JOB_CARD_STATUSES)[number]
/** Still being worked on */
export const OPEN_JOB_STATUSES: JobCardStatus[] = ['open', 'in_progress', 'waiting_parts']
export const JOB_DONE_BY = ['garage', 'in_house'] as const
export type JobDoneBy = (typeof JOB_DONE_BY)[number]

/** Amounts in pesewas */
export type JobCardLine = {
  kind: 'part' | 'labour'
  description: string
  quantity: number
  unitAmount: number
  amount: number
}

const json = (value: unknown) => JSON.stringify(value ?? [])

/** A service or repair (JC-), at an outside garage or by the company's own mechanic. */
export default class JobCard extends compose(JobCardSchema, withUlid) {
  declare type: JobCardType
  declare status: JobCardStatus
  declare doneBy: JobDoneBy

  @column({ prepare: json })
  declare lines: JobCardLine[]

  @column({ prepare: json })
  declare scheduleIds: string[]

  @column({ prepare: json })
  declare damageIds: string[]

  @belongsTo(() => Car)
  declare car: BelongsTo<typeof Car>

  @belongsTo(() => CarAllocation, { foreignKey: 'allocationId' })
  declare allocation: BelongsTo<typeof CarAllocation>

  @belongsTo(() => Expense)
  declare expense: BelongsTo<typeof Expense>

  @belongsTo(() => User, { foreignKey: 'createdBy' })
  declare creator: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'completedBy' })
  declare completer: BelongsTo<typeof User>
}
