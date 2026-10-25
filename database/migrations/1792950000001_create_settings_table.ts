import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'settings'

  async up() {
    // Overrides only - defaults live in app/services/settings/definitions.ts,
    // so a new rule needs no migration. branch_id is for per-branch overrides
    // later; business-wide values have branch_id NULL.
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 26).primary()
      table.string('key', 100).notNullable()
      table.jsonb('value').notNullable()
      table
        .string('branch_id', 26)
        .nullable()
        .references('id')
        .inTable('branches')
        .onDelete('CASCADE')
      table
        .string('updated_by', 26)
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

    this.schema.raw(
      'CREATE UNIQUE INDEX settings_key_business_wide ON settings (key) WHERE branch_id IS NULL'
    )
    this.schema.raw(
      'CREATE UNIQUE INDEX settings_key_per_branch ON settings (key, branch_id) WHERE branch_id IS NOT NULL'
    )
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
