import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * SMS and email to customers (Phase 6 minimal, for the website): every
 * message is stored first, then sent - a slow or failing provider never
 * holds up a booking, and `messages:send` (every minute) retries.
 *
 * Also an encrypted copy of each online booking's private link secret, so
 * later messages ("confirmed", "find my booking") can include the link.
 * The SHA-256 stays the lookup key; the copy needs APP_KEY to read.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('outbound_messages', (table) => {
      table.string('id', 26).primary()
      table.string('channel', 10).notNullable() // sms | email
      table.string('to', 254).notNullable()
      table.string('subject', 200).nullable()
      table.text('body').notNullable() // the SMS, or the email's plain text
      table.text('html').nullable()
      // booking_received | payment_received | booking_confirmed | payment_not_found
      // | booking_expired | booking_link
      table.string('kind', 40).notNullable()
      table
        .string('booking_id', 26)
        .nullable()
        .references('id')
        .inTable('bookings')
        .onDelete('SET NULL')
      // pending | sent | failed (gave up) | skipped (no provider set up, or tests)
      table.string('status', 10).notNullable().defaultTo('pending')
      table.integer('attempts').notNullable().defaultTo(0)
      table.text('last_error').nullable()
      table.timestamp('next_attempt_at').nullable()
      table.timestamp('sent_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['status', 'next_attempt_at'])
      table.index(['booking_id'])
    })

    this.schema.alterTable('bookings', (table) => {
      table.text('public_token_encrypted').nullable()
    })
  }

  async down() {
    this.schema.alterTable('bookings', (table) => {
      table.dropColumn('public_token_encrypted')
    })
    this.schema.dropTable('outbound_messages')
  }
}
