import { InspectionPhotoSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import File from '#models/file'
import { withUlid } from '#models/mixins/with_ulid'

export default class InspectionPhoto extends compose(InspectionPhotoSchema, withUlid) {
  @belongsTo(() => File)
  declare file: BelongsTo<typeof File>
}
