import { DriverSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import { withUlid } from '#models/mixins/with_ulid'

export const DRIVER_STATUSES = ['active', 'on_leave', 'inactive'] as const
export type DriverStatus = (typeof DRIVER_STATUSES)[number]

export default class Driver extends compose(DriverSchema, withUlid) {
  declare status: DriverStatus

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
