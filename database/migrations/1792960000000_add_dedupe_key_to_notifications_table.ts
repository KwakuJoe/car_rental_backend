import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'notifications'

  async up() {
    // Identifies the event a notification is about (e.g. "document:<id>:expires-in-14")
    // so scheduled jobs can send each alert once, however often they run.
    this.schema.alterTable(this.tableName, (table) => {
      table.string('dedupe_key', 150).nullable()
      table.index(['dedupe_key'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropIndex(['dedupe_key'])
      table.dropColumn('dedupe_key')
    })
  }
}
