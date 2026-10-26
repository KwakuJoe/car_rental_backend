import { DriverAllocationSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Booking from '#models/booking'
import Driver from '#models/driver'
import { withUlid } from '#models/mixins/with_ulid'

export default class DriverAllocation extends compose(DriverAllocationSchema, withUlid) {
  @belongsTo(() => Driver)
  declare driver: BelongsTo<typeof Driver>

  @belongsTo(() => Booking)
  declare booking: BelongsTo<typeof Booking>
}
