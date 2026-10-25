import { OdometerLogSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Car from '#models/car'
import User from '#models/user'
import { withUlid } from '#models/mixins/with_ulid'

export default class OdometerLog extends compose(OdometerLogSchema, withUlid) {
  @belongsTo(() => Car)
  declare car: BelongsTo<typeof Car>

  @belongsTo(() => User, { foreignKey: 'recordedBy' })
  declare recorder: BelongsTo<typeof User>
}
