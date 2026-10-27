import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Phase 5 slice 1: money in and out of a booking (M5.1/M5.4/M5.5), recorded
 * by staff - cash, MoMo to the business's number, bank transfer. The
 * booking's paid / balance / deposit-held figures are worked out from these
 * rows (PaymentService.recalculate). Rows are never deleted: wrong ones are
 * voided with a reason.
 *
 * type      rental          rent towards the booking total (in)
 *           deposit         security deposit taken (in, a liability)
 *           refund          rent paid back (out)
 *           deposit_refund  deposit paid back (out)
 *           deposit_applied deposit kept against the balance (no money moves)
 * status    pending_verification  MoMo/bank not yet checked against the statement
 *           completed             counts towards the booking
 *           rejected              the money never arrived
 *           void                  recorded by mistake
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('payments', (table) => {
      table.string('id', 26).primary()
      // RCT-2026-00001 (money in) / RFD-2026-00001 (money out), given once completed
      table.string('number', 30).nullable().unique()
      table
        .string('booking_id', 26)
        .notNullable()
        .references('id')
        .inTable('bookings')
        .onDelete('RESTRICT')
      table.string('customer_id', 26).notNullable().references('id').inTable('customers')
      table.string('branch_id', 26).notNullable().references('id').inTable('branches')
      table.string('type', 20).notNullable()
      table.string('method', 20).notNullable() // cash | momo | bank_transfer | deposit
      table.integer('amount').notNullable() // pesewas, always positive
      // MoMo transaction ID / bank reference, normalised (no spaces, upper case)
      table.string('transaction_ref', 80).nullable()
      // Name on the MoMo wallet / bank account (or who received a refund)
      table.string('payer_name', 120).nullable()
      table.string('status', 24).notNullable()
      table.timestamp('paid_at').notNullable()
      table
        .string('proof_file_id', 26)
        .nullable()
        .references('id')
        .inTable('files')
        .onDelete('SET NULL')
      table.text('notes').nullable()
      table.string('recorded_by', 26).nullable().references('id').inTable('users')
      table.string('verified_by', 26).nullable().references('id').inTable('users')
      table.timestamp('verified_at').nullable()
      table.string('voided_by', 26).nullable().references('id').inTable('users')
      table.timestamp('voided_at').nullable()
      // Why it was voided or rejected
      table.string('void_reason', 300).nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['booking_id'])
      table.index(['status'])
      table.index(['paid_at'])
    })
    // A MoMo/bank transaction can be used once (fake or reused screenshots)
    this.schema.raw(`
      CREATE UNIQUE INDEX payments_transaction_ref_unique ON payments (transaction_ref)
      WHERE transaction_ref IS NOT NULL AND status IN ('pending_verification', 'completed')
    `)

    this.schema.alterTable('bookings', (table) => {
      table.integer('deposit_held_amount').notNullable().defaultTo(0)
    })
    this.schema.alterTable('inspections', (table) => {
      // A manager let the car go before the balance/deposit was paid
      table.string('payment_override_reason', 300).nullable()
    })
  }

  async down() {
    this.schema.alterTable('inspections', (table) => {
      table.dropColumn('payment_override_reason')
    })
    this.schema.alterTable('bookings', (table) => {
      table.dropColumn('deposit_held_amount')
    })
    this.schema.dropTable('payments')
  }
}
