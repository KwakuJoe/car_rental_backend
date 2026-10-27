import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * The business logo: shown on printed documents (agreement, return report,
 * later invoices and receipts) and in the app. A public image file.
 */
export default class extends BaseSchema {
  protected tableName = 'businesses'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .string('logo_file_id', 26)
        .nullable()
        .references('id')
        .inTable('files')
        .onDelete('SET NULL')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('logo_file_id')
    })
  }
}
