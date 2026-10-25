import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'businesses'

  async up() {
    // Exactly one row per install - created by `business:create`, which
    // refuses to run again once a row exists.
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 26).primary()
      table.string('name').notNullable()
      table.string('trading_name').nullable()
      table.string('email', 254).notNullable()
      table.string('phone', 20).nullable()
      table.string('whatsapp_phone', 20).nullable()
      table.string('address').nullable()
      // GhanaPost GPS digital address, e.g. GA-123-4567
      table.string('digital_address', 20).nullable()
      table.string('city').nullable()
      table.string('region').nullable()
      // GRA Taxpayer Identification Number
      table.string('tin', 20).nullable()
      table.boolean('vat_registered').notNullable().defaultTo(false)
      table.string('vat_number', 30).nullable()
      table.string('currency', 3).notNullable().defaultTo('GHS')
      table.string('timezone').notNullable().defaultTo('Africa/Accra')
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
