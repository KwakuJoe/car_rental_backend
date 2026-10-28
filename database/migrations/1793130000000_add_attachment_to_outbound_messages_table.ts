import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * A document emailed with the message, e.g. { type: 'invoice', id }. Only a
 * reference is stored: the PDF is built when the email is sent.
 */
export default class extends BaseSchema {
  protected tableName = 'outbound_messages'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.jsonb('attachment').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('attachment')
    })
  }
}
