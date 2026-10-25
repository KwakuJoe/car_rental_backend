import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'closure_dates'

  async up() {
    // Days the branch is closed outright (public holidays etc.) - no
    // pickups or returns can be scheduled on these dates.
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 26).primary()
      table
        .string('branch_id', 26)
        .notNullable()
        .references('id')
        .inTable('branches')
        .onDelete('CASCADE')
      table.date('date').notNullable()
      table.string('reason').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.unique(['branch_id', 'date'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
