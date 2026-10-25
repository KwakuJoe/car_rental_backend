import { NotificationSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import { withUlid } from '#models/mixins/with_ulid'

export default class Notification extends compose(NotificationSchema, withUlid) {
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
