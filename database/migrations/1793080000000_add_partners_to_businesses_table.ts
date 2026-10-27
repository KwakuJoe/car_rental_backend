import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Companies the business has worked with, shown as a scrolling logo strip
 * on the website: [{ name, logoUrl, website }] in display order.
 */
export default class extends BaseSchema {
  protected tableName = 'businesses'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.jsonb('partners').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('partners')
    })
  }
}
