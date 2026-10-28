import { TrafficFineSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Booking from '#models/booking'
import Car from '#models/car'
import File from '#models/file'
import User from '#models/user'
import { withUlid } from '#models/mixins/with_ulid'

export const FINE_STATUSES = [
  'unpaid',
  'charged_to_customer',
  'paid_by_business',
  'cancelled',
] as const
export type FineStatus = (typeof FINE_STATUSES)[number]

/** A traffic fine on a car, matched to whoever had it then. */
export default class TrafficFine extends compose(TrafficFineSchema, withUlid) {
  declare status: FineStatus

  @belongsTo(() => Car)
  declare car: BelongsTo<typeof Car>

  @belongsTo(() => Booking)
  declare booking: BelongsTo<typeof Booking>

  @belongsTo(() => File, { foreignKey: 'fileId' })
  declare file: BelongsTo<typeof File>

  @belongsTo(() => User, { foreignKey: 'createdBy' })
  declare creator: BelongsTo<typeof User>
}
