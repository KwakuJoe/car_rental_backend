import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'branch_users'

  async up() {
    // Composite primary key instead of a ULID `id` - see
    // create_role_permissions_table for why (manyToMany sync() bypasses
    // the withUlid hook).
    this.schema.createTable(this.tableName, (table) => {
      table
        .string('branch_id', 26)
        .notNullable()
        .references('id')
        .inTable('branches')
        .onDelete('CASCADE')

      table
        .string('user_id', 26)
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')

      table.primary(['branch_id', 'user_id'])
      table.index(['user_id'])

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
