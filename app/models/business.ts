import { BusinessSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { hasMany, hasOne } from '@adonisjs/lucid/orm'
import type { HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import Branch from '#models/branch'
import { withUlid } from '#models/mixins/with_ulid'

export default class Business extends compose(BusinessSchema, withUlid) {
  @hasMany(() => Branch)
  declare branches: HasMany<typeof Branch>

  @hasOne(() => Branch, {
    onQuery: (query) => query.where('is_main', true),
  })
  declare mainBranch: HasOne<typeof Branch>

  /**
   * The install's single business row. Every install has exactly one,
   * created by `business:create`.
   */
  static current() {
    return this.query().firstOrFail()
  }
}
