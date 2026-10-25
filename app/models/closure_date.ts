import { ClosureDateSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Branch from '#models/branch'
import { withUlid } from '#models/mixins/with_ulid'

export default class ClosureDate extends compose(ClosureDateSchema, withUlid) {
  @belongsTo(() => Branch)
  declare branch: BelongsTo<typeof Branch>
}
