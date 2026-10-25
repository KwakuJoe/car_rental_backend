import { RatePlanSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Category from '#models/category'
import Car from '#models/car'
import User from '#models/user'
import { withUlid } from '#models/mixins/with_ulid'

export const DRIVE_TYPES = ['self_drive', 'chauffeur'] as const
export type DriveType = (typeof DRIVE_TYPES)[number]

/** default = use the business setting (rental.mileage_policy / rental.daily_km_allowance) */
export const MILEAGE_MODES = ['default', 'unlimited', 'limited'] as const
export type MileageMode = (typeof MILEAGE_MODES)[number]

export default class RatePlan extends compose(RatePlanSchema, withUlid) {
  @belongsTo(() => Category)
  declare category: BelongsTo<typeof Category>

  @belongsTo(() => Car)
  declare car: BelongsTo<typeof Car>

  @belongsTo(() => User, { foreignKey: 'createdBy' })
  declare creator: BelongsTo<typeof User>
}
