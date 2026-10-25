import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'role_permissions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      // No surrogate `id` - Lucid's manyToMany sync()/attach() write pivot
      // rows directly via the query builder, bypassing the models'
      // `withUlid` beforeCreate hook, so a not-null `id` column would never
      // get populated. A composite primary key is both correct for a pure
      // join table and sidesteps that entirely.
      table
        .string('role_id', 26)
        .notNullable()
        .references('id')
        .inTable('roles')
        .onDelete('CASCADE')

      table
        .string('permission_id', 26)
        .notNullable()
        .references('id')
        .inTable('permissions')
        .onDelete('CASCADE')

      table.primary(['role_id', 'permission_id'])

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
