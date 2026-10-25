import { CategorySchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Car from '#models/car'
import { withUlid } from '#models/mixins/with_ulid'

export default class Category extends compose(CategorySchema, withUlid) {
  @hasMany(() => Car)
  declare cars: HasMany<typeof Car>
}
