import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'files'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 26).primary()
      table.string('disk', 30).notNullable().defaultTo('cloudinary')
      table.string('path', 255).notNullable() // Cloudinary public_id or file path
      table.text('url').notNullable() // Cloudinary secure delivery URL
      table.string('original_name', 255).notNullable()
      table.string('mime', 100).notNullable()
      table.bigInteger('size').notNullable() // Bytes
      table
        .string('uploaded_by', 26)
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.string('attachable_type', 50).nullable()
      table.string('attachable_id', 26).nullable()
      table.string('purpose', 50).notNullable() // car_photo | category_image | business_logo | vehicle_document | ...
      table.boolean('is_private').notNullable().defaultTo(false)
      table.jsonb('metadata').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['attachable_type', 'attachable_id'])
      table.index(['purpose'])
      table.index(['uploaded_by'])
      table.index(['created_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
