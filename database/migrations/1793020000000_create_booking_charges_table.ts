import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Phase 4 slice 2: charges found at check-in (M4.3) - extra km, fuel, late
 * return, damage, missing items, cleaning. Each line accepted or waived (with
 * a reason); accepted ones are added to the booking's total (the folio in
 * Phase 5 takes over from here).
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('booking_charges', (table) => {
      table.string('id', 26).primary()
      table
        .string('booking_id', 26)
        .notNullable()
        .references('id')
        .inTable('bookings')
        .onDelete('CASCADE')
      table
        .string('inspection_id', 26)
        .nullable()
        .references('id')
        .inTable('inspections')
        .onDelete('SET NULL')
      // excess_km | fuel | refuel_service | late_hours | late_days | damage | missing_item | cleaning | smoking | other
      table.string('code', 30).notNullable()
      table.string('label', 200).notNullable()
      table.decimal('quantity', 10, 2).notNullable().defaultTo(1)
      table.integer('unit_amount').notNullable()
      table.integer('amount').notNullable()
      table.boolean('taxable').notNullable().defaultTo(true)
      table.integer('tax_amount').notNullable().defaultTo(0)
      table.string('status', 20).notNullable() // accepted | waived
      table.text('waive_reason').nullable()
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
  }

  async down() {
    this.schema.dropTable('booking_charges')
  }
}
