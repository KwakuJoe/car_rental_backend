import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.boolean('is_active').notNullable().defaultTo(true)
      table.string('phone').nullable()
      table.timestamp('last_login_at').nullable()
      table.jsonb('permissions_override').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('is_active')
      table.dropColumn('phone')
      table.dropColumn('last_login_at')
      table.dropColumn('permissions_override')
    })
  }
}
