import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Taxes (M2.10) attach to the TYPE OF CHARGE (rental, extras, protection,
 * delivery, fees) - never to individual cars. Only applied while the
 * pricing.vat_registered setting is on. Old rows are kept (end date or
 * inactive) so past invoices stay reproducible.
 */
export default class extends BaseSchema {
  protected tableName = 'taxes'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 26).primary()
      table.string('name', 100).notNullable() // e.g. VAT, NHIL, GETFund levy
      table.text('description').nullable()
      table.integer('rate_bp').notNullable() // basis points: 1500 = 15%
      // on_net: on the charge; on_net_plus_levies: on the charge + the on_net taxes
      table.string('calculation', 30).notNullable().defaultTo('on_net')
      // rental | extras | protection | delivery | fees
      table.jsonb('applies_to').notNullable()
      table.date('effective_from').nullable()
      table.date('effective_to').nullable()
      table.integer('sort_order').notNullable().defaultTo(0) // order on receipts
      table.boolean('active').notNullable().defaultTo(true)
      table
        .string('created_by', 26)
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
