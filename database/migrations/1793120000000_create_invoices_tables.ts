import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Invoices and credit notes (M5.6). An invoice is a snapshot of a booking's
 * charges at the time it's issued (INV- numbers, gap-free per year) and is
 * never edited: a mistake or a later change is put right with a credit note
 * (CN-) that cancels it, then a new invoice. What has been paid is read from
 * the booking, so the invoice itself only records issued | credited.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('invoices', (table) => {
      table.string('id', 26).primary()
      table.string('number', 30).notNullable().unique()
      table.string('branch_id', 26).notNullable().references('id').inTable('branches')
      table.string('booking_id', 26).notNullable().references('id').inTable('bookings')
      table.string('customer_id', 26).notNullable().references('id').inTable('customers')
      // { name, company, tin, address, phone, email } as printed
      table.jsonb('bill_to').notNullable()
      // [{ description, quantity, unitAmount, amount }] - amounts before tax
      table.jsonb('lines').notNullable()
      // [{ name, rateBp, amount }]
      table.jsonb('taxes').notNullable()
      table.integer('subtotal_amount').notNullable()
      table.integer('tax_amount').notNullable()
      table.integer('total_amount').notNullable()
      table.timestamp('issued_at', { useTz: true }).notNullable()
      table.date('due_on').notNullable()
      table.text('notes').nullable()
      table.string('status', 20).notNullable().defaultTo('issued') // issued | credited
      table.string('issued_by', 26).nullable().references('id').inTable('users')
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
      table.index(['booking_id'])
      table.index(['issued_at'])
    })

    this.schema.createTable('credit_notes', (table) => {
      table.string('id', 26).primary()
      table.string('number', 30).notNullable().unique()
      table.string('invoice_id', 26).notNullable().unique().references('id').inTable('invoices')
      table.integer('subtotal_amount').notNullable()
      table.integer('tax_amount').notNullable()
      table.integer('total_amount').notNullable()
      table.string('reason', 300).notNullable()
      table.timestamp('issued_at', { useTz: true }).notNullable()
      table.string('issued_by', 26).nullable().references('id').inTable('users')
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
    })
  }

  async down() {
    this.schema.dropTable('credit_notes')
    this.schema.dropTable('invoices')
  }
}
