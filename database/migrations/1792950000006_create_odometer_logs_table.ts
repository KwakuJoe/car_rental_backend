import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'odometer_logs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 26).primary()
      table.string('car_id', 26).notNullable().references('id').inTable('cars').onDelete('CASCADE')
      table.integer('previous_km').notNullable()
      table.integer('new_km').notNullable()
      table.string('source', 30).notNullable().defaultTo('manual_entry') // manual_entry | check_in | maintenance | correction
      table.string('reason', 255).nullable()
      table
        .string('recorded_by', 26)
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.timestamp('created_at').notNullable()

      table.index(['car_id', 'created_at'])
      table.index(['recorded_by'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
