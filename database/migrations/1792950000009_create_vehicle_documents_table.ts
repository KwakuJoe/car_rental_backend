import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'vehicle_documents'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 26).primary()
      table.string('car_id', 26).notNullable().references('id').inTable('cars').onDelete('CASCADE')
      table.string('type', 50).notNullable()
      table.string('document_number', 100).nullable()
      table.string('provider', 120).nullable()
      table.string('cover_type', 100).nullable()
      table.date('issued_on').nullable()
      table.date('expires_on').nullable()
      table.string('file_id', 26).nullable().references('id').inTable('files').onDelete('SET NULL')
      table.text('notes').nullable()
      table
        .string('created_by', 26)
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()

      table.index(['car_id', 'type'])
      table.index(['expires_on'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
