import { BranchSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { belongsTo, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import Business from '#models/business'
import User from '#models/user'
import OpeningHour from '#models/opening_hour'
import ClosureDate from '#models/closure_date'
import { withUlid } from '#models/mixins/with_ulid'

export default class Branch extends compose(BranchSchema, withUlid) {
  @belongsTo(() => Business)
  declare business: BelongsTo<typeof Business>

  @manyToMany(() => User, {
    pivotTable: 'branch_users',
    pivotTimestamps: true,
  })
  declare users: ManyToMany<typeof User>

  @hasMany(() => OpeningHour)
  declare openingHours: HasMany<typeof OpeningHour>

  @hasMany(() => ClosureDate)
  declare closureDates: HasMany<typeof ClosureDate>
}
