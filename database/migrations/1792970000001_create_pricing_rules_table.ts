import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'pricing_rules'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 26).primary()
      table.string('name', 120).notNullable()
      table.string('type', 20).notNullable() // season | holiday | weekend

      // season / holiday: a date range (date_to null = one day).
      // weekend: optional - limits the weekdays rule to a period.
      table.date('date_from').nullable()
      table.date('date_to').nullable()
      // Match month-day every year (Christmas, Independence Day); ranges may wrap
      // the year end (20 Dec - 5 Jan).
      table.boolean('recurs_yearly').notNullable().defaultTo(false)
      // weekend: ISO weekdays 1 (Mon) - 7 (Sun), e.g. [5,6,7]
      table.jsonb('weekdays').nullable()

      // percent: basis points (2500 = +25%, -1000 = -10%); fixed: pesewas per day
      table.string('adjustment_type', 10).notNullable()
      table.integer('adjustment_value').notNullable()

      table.string('applies_to', 20).notNullable().defaultTo('all') // all | categories | cars
      table.jsonb('category_ids').nullable()
      table.jsonb('car_ids').nullable()

      table.integer('min_rental_days').nullable()
      table.integer('priority').notNullable().defaultTo(0) // higher wins
      table.boolean('stackable').notNullable().defaultTo(false) // adds on top of the winner
      table.boolean('block_online_booking').notNullable().defaultTo(false)
      table.boolean('active').notNullable().defaultTo(true)
      table.text('notes').nullable()
      table
        .string('created_by', 26)
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()

      table.index(['active', 'type'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
