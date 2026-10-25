import { CarSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Branch from '#models/branch'
import Category from '#models/category'
import CarPhoto from '#models/car_photo'
import CarAllocation from '#models/car_allocation'
import OdometerLog from '#models/odometer_log'
import { withUlid } from '#models/mixins/with_ulid'

const json = {
  prepare: (value: unknown) =>
    value === null || value === undefined ? null : JSON.stringify(value),
}

export const CAR_STATUSES = ['active', 'in_maintenance', 'out_of_service', 'retired'] as const
export type CarStatus = (typeof CAR_STATUSES)[number]

export const TRANSMISSIONS = ['auto', 'manual'] as const
export type Transmission = (typeof TRANSMISSIONS)[number]

export const FUEL_TYPES = ['petrol', 'diesel', 'hybrid', 'electric'] as const
export type FuelType = (typeof FUEL_TYPES)[number]

export const OWNERSHIP_TYPES = ['company', 'partner'] as const
export type OwnershipType = (typeof OWNERSHIP_TYPES)[number]

export default class Car extends compose(CarSchema, withUlid) {
  @column(json)
  declare features: string[]

  @column({
    consume: (value: unknown) => (value === null || value === undefined ? null : Number(value)),
  })
  declare purchaseAmount: number | null

  @belongsTo(() => Branch)
  declare branch: BelongsTo<typeof Branch>

  @belongsTo(() => Category)
  declare category: BelongsTo<typeof Category>

  @hasMany(() => CarPhoto)
  declare photos: HasMany<typeof CarPhoto>

  @hasMany(() => OdometerLog)
  declare odometerLogs: HasMany<typeof OdometerLog>

  @hasMany(() => CarAllocation)
  declare allocations: HasMany<typeof CarAllocation>
}
