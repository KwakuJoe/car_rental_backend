import { MaintenanceScheduleSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Car from '#models/car'
import { withUlid } from '#models/mixins/with_ulid'

/** A recurring service for one car, by time: every interval_months, reminded remind_days_before. */
export default class MaintenanceSchedule extends compose(MaintenanceScheduleSchema, withUlid) {
  @belongsTo(() => Car)
  declare car: BelongsTo<typeof Car>
}
