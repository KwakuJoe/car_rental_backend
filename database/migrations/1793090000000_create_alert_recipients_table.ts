import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Who on the team gets SMS / email alerts (new online booking, payment to
 * check, ...) - staff or not (e.g. the owner's personal number). `alerts`
 * maps each alert to its channels: { "online_booking": ["sms", "email"] }.
 * The dashboard bell is separate and unchanged.
 */
export default class extends BaseSchema {
  protected tableName = 'alert_recipients'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 26).primary()
      table.string('name', 120).notNullable()
      table.string('phone', 20).nullable()
      table.string('email', 254).nullable()
      table.jsonb('alerts').notNullable().defaultTo('{}')
      table.boolean('active').notNullable().defaultTo(true)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
