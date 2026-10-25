import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'car_allocations'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 26).primary()
      table.string('car_id', 26).notNullable().references('id').inTable('cars').onDelete('CASCADE')
      table.string('booking_id', 26).nullable() // Will reference bookings(id) once M3.5 is added
      table.string('source', 30).notNullable() // 'booking' | 'hold' | 'block' | 'maintenance'
      table.text('reason').nullable()
      table.timestamp('starts_at', { useTz: true }).notNullable()
      table.timestamp('ends_at', { useTz: true }).notNullable()
      table.timestamp('ends_at_with_buffer', { useTz: true }).notNullable()
      table.integer('buffer_minutes').notNullable().defaultTo(0)
      table.boolean('active').notNullable().defaultTo(true)
      table
        .string('created_by', 26)
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()

      table.index(['car_id', 'active'])
      table.index(['starts_at', 'ends_at'])
    })

    // Postgres GiST exclusion constraint: ensures overlapping allocations on the same car
    // are physically impossible at the database level while active is true.
    this.schema.raw(`
      ALTER TABLE car_allocations
      ADD CONSTRAINT car_allocations_no_overlap
      EXCLUDE USING gist (
        car_id WITH =,
        tstzrange(starts_at, ends_at_with_buffer) WITH &&
      )
      WHERE (active = true);
    `)
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
