import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('role_id', 26).nullable().references('id').inTable('roles').onDelete('SET NULL')

      table.boolean('must_reset_password').notNullable().defaultTo(false)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('role_id')
      table.dropColumn('must_reset_password')
    })
  }
}
