import { CarPhotoSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Car from '#models/car'
import File from '#models/file'
import { withUlid } from '#models/mixins/with_ulid'

export default class CarPhoto extends compose(CarPhotoSchema, withUlid) {
  @belongsTo(() => Car)
  declare car: BelongsTo<typeof Car>

  @belongsTo(() => File)
  declare file: BelongsTo<typeof File>
}
