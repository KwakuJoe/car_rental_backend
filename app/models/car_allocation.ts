import { CarAllocationSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Booking from '#models/booking'
import Car from '#models/car'
import User from '#models/user'
import { withUlid } from '#models/mixins/with_ulid'

export default class CarAllocation extends compose(CarAllocationSchema, withUlid) {
  @belongsTo(() => Car)
  declare car: BelongsTo<typeof Car>

  @belongsTo(() => Booking)
  declare booking: BelongsTo<typeof Booking>

  @belongsTo(() => User, {
    foreignKey: 'createdBy',
  })
  declare creator: BelongsTo<typeof User>
}
