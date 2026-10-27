import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Online bookings (Phase 7 MVP). The customer gets a private link to their
 * booking (status, how to pay, "I've paid"); only the SHA-256 of its secret
 * is stored, like a password. payment_plan: what they chose to pay online -
 * the deposit (reservation fee) or the full amount.
 */
export default class extends BaseSchema {
  protected tableName = 'bookings'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('public_token_hash', 64).nullable().unique()
      table.string('payment_plan', 10).nullable() // deposit | full
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('public_token_hash')
      table.dropColumn('payment_plan')
    })
  }
}
