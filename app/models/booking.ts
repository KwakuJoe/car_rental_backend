import { BookingSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import BookingExtra from '#models/booking_extra'
import Car from '#models/car'
import Category from '#models/category'
import Customer from '#models/customer'
import DeliveryZone from '#models/delivery_zone'
import ProtectionPlan from '#models/protection_plan'
import User from '#models/user'
import { withUlid } from '#models/mixins/with_ulid'
import type { Quote } from '#services/pricing/pricing_service'

export const BOOKING_STATUSES = [
  'draft',
  'pending',
  'confirmed',
  'on_rent',
  'returned',
  'closed',
  'cancelled',
  'no_show',
  'expired',
] as const
export type BookingStatus = (typeof BOOKING_STATUSES)[number]

/** Statuses that hold the car (an active allocation) */
export const HOLDING_STATUSES: BookingStatus[] = ['pending', 'confirmed', 'on_rent']

export const BOOKING_SOURCES = ['walk_in', 'phone', 'whatsapp', 'website', 'corporate'] as const
export type BookingSource = (typeof BOOKING_SOURCES)[number]

export default class Booking extends compose(BookingSchema, withUlid) {
  @column({
    prepare: (value: unknown) =>
      value === null || value === undefined ? null : JSON.stringify(value),
  })
  declare priceSnapshot: Quote

  declare status: BookingStatus

  @belongsTo(() => Customer)
  declare customer: BelongsTo<typeof Customer>

  @belongsTo(() => Car)
  declare car: BelongsTo<typeof Car>

  @belongsTo(() => Category)
  declare category: BelongsTo<typeof Category>

  @belongsTo(() => ProtectionPlan)
  declare protectionPlan: BelongsTo<typeof ProtectionPlan>

  @belongsTo(() => DeliveryZone, { foreignKey: 'deliveryZoneId' })
  declare deliveryZone: BelongsTo<typeof DeliveryZone>

  @belongsTo(() => DeliveryZone, { foreignKey: 'collectionZoneId' })
  declare collectionZone: BelongsTo<typeof DeliveryZone>

  @hasMany(() => BookingExtra)
  declare extras: HasMany<typeof BookingExtra>

  @belongsTo(() => User, { foreignKey: 'createdBy' })
  declare creator: BelongsTo<typeof User>
}
