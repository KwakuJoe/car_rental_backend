import { BusinessSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { belongsTo, hasMany, hasOne } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import Branch from '#models/branch'
import File from '#models/file'
import { withUlid } from '#models/mixins/with_ulid'

export default class Business extends compose(BusinessSchema, withUlid) {
  @hasMany(() => Branch)
  declare branches: HasMany<typeof Branch>

  @hasOne(() => Branch, {
    onQuery: (query) => query.where('is_main', true),
  })
  declare mainBranch: HasOne<typeof Branch>

  /** Printed on documents; a public image file. */
  @belongsTo(() => File, { foreignKey: 'logoFileId' })
  declare logo: BelongsTo<typeof File>

  /** The website home page's big photo; a public image file. */
  @belongsTo(() => File, { foreignKey: 'coverFileId' })
  declare cover: BelongsTo<typeof File>

  /**
   * The install's single business row. Every install has exactly one,
   * created by `business:create`.
   */
  static current() {
    return this.query().firstOrFail()
  }

  /** The business row with its logo and cover photo, for screens and documents that show them. */
  static currentWithLogo() {
    return this.query().preload('logo').preload('cover').firstOrFail()
  }
}
