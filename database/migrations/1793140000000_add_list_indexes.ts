import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Indexes for how the app reads (performance review 2026-10-28): lists
 * sorted by newest, Reports' "bookings made", payments searched by customer,
 * signing a staff member out everywhere, expenses and invoices by their
 * links.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('bookings', (table) => {
      table.index(['created_at'])
    })
    this.schema.alterTable('payments', (table) => {
      table.index(['created_at'])
      table.index(['customer_id'])
    })
    this.schema.alterTable('customers', (table) => {
      table.index(['created_at'])
    })
    this.schema.alterTable('auth_access_tokens', (table) => {
      table.index(['tokenable_id'])
      table.index(['expires_at'])
    })
    this.schema.alterTable('expenses', (table) => {
      table.index(['category_id'])
    })
    this.schema.alterTable('invoices', (table) => {
      table.index(['customer_id'])
    })
  }

  async down() {
    this.schema.alterTable('bookings', (table) => {
      table.dropIndex(['created_at'])
    })
    this.schema.alterTable('payments', (table) => {
      table.dropIndex(['created_at'])
      table.dropIndex(['customer_id'])
    })
    this.schema.alterTable('customers', (table) => {
      table.dropIndex(['created_at'])
    })
    this.schema.alterTable('auth_access_tokens', (table) => {
      table.dropIndex(['tokenable_id'])
      table.dropIndex(['expires_at'])
    })
    this.schema.alterTable('expenses', (table) => {
      table.dropIndex(['category_id'])
    })
    this.schema.alterTable('invoices', (table) => {
      table.dropIndex(['customer_id'])
    })
  }
}
