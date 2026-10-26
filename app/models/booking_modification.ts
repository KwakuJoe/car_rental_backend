import { BookingModificationSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import { withUlid } from '#models/mixins/with_ulid'

export const MODIFICATION_TYPES = ['extend', 'change_dates', 'swap_car', 'early_return'] as const
export type ModificationType = (typeof MODIFICATION_TYPES)[number]

const json = {
  prepare: (value: unknown) =>
    value === null || value === undefined ? null : JSON.stringify(value),
}

export default class BookingModification extends compose(BookingModificationSchema, withUlid) {
  declare type: ModificationType

  @column(json)
  declare before: Record<string, unknown>

  @column(json)
  declare after: Record<string, unknown>

  @column(json)
  declare quote: Record<string, unknown> | null

  @belongsTo(() => User, { foreignKey: 'createdBy' })
  declare creator: BelongsTo<typeof User>
}
