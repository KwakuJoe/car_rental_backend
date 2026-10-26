import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Phase 3 slice 4: booking modifications (M3.8) and chauffeur drivers (M3.9).
 * Drivers get the same protection as cars: an exclusion constraint on
 * driver_allocations makes double-booking a driver impossible.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('booking_modifications', (table) => {
      table.string('id', 26).primary()
      table
        .string('booking_id', 26)
        .notNullable()
        .references('id')
        .inTable('bookings')
        .onDelete('CASCADE')
      // extend | change_dates | swap_car | early_return
      table.string('type', 20).notNullable()
      table.jsonb('before').notNullable()
      table.jsonb('after').notNullable()
      // Positive = the customer owes more; negative = owed back (refunds: Phase 5)
      table.integer('price_difference_amount').notNullable().defaultTo(0)
      // The quote for the change (extension days, or the re-priced booking)
      table.jsonb('quote').nullable()
      table.text('reason').nullable()
      table
        .string('created_by', 26)
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
      table.index(['booking_id'])
    })

    this.schema.createTable('drivers', (table) => {
      table.string('id', 26).primary()
      // A staff account with the Driver role, or null for a freelance driver
      table.string('user_id', 26).nullable().references('id').inTable('users').onDelete('SET NULL')
      table.string('full_name', 150).notNullable()
      table.string('phone', 20).notNullable() // E.164
      table.string('licence_no', 60).notNullable()
      table.string('licence_class', 20).nullable()
      table.date('licence_expires_on').notNullable()
      table.string('status', 20).notNullable().defaultTo('active') // active | on_leave | inactive
      // What a day of this driver costs the business (pesewas) - for profit reports
      table.integer('daily_rate_amount').notNullable().defaultTo(0)
      table.text('notes').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
      table.index(['status'])
    })

    this.schema.createTable('driver_allocations', (table) => {
      table.string('id', 26).primary()
      table
        .string('driver_id', 26)
        .notNullable()
        .references('id')
        .inTable('drivers')
        .onDelete('CASCADE')
      table
        .string('booking_id', 26)
        .notNullable()
        .references('id')
        .inTable('bookings')
        .onDelete('CASCADE')
      table.timestamp('starts_at', { useTz: true }).notNullable()
      table.timestamp('ends_at', { useTz: true }).notNullable()
      table.boolean('active').notNullable().defaultTo(true)
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
      table.index(['booking_id'])
    })
    this.schema.raw(`
      ALTER TABLE driver_allocations
      ADD CONSTRAINT driver_allocations_no_overlap
      EXCLUDE USING gist (driver_id WITH =, tstzrange(starts_at, ends_at) WITH &&)
      WHERE (active = true);
    `)

    this.schema.alterTable('bookings', (table) => {
      table
        .string('driver_id', 26)
        .nullable()
        .references('id')
        .inTable('drivers')
        .onDelete('SET NULL')
    })
  }

  async down() {
    this.schema.alterTable('bookings', (table) => {
      table.dropColumn('driver_id')
    })
    this.schema.dropTable('driver_allocations')
    this.schema.dropTable('drivers')
    this.schema.dropTable('booking_modifications')
  }
}
