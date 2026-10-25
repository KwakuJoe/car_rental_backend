import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'car_photos'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 26).primary()
      table.string('car_id', 26).notNullable().references('id').inTable('cars').onDelete('CASCADE')
      table
        .string('file_id', 26)
        .notNullable()
        .references('id')
        .inTable('files')
        .onDelete('CASCADE')
      table.integer('sort_order').notNullable().defaultTo(0)
      table.boolean('is_cover').notNullable().defaultTo(false)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['car_id', 'sort_order'])
      table.index(['file_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
