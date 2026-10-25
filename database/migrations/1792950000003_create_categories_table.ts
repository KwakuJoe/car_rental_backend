import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'categories'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 26).primary()
      table.string('name', 100).notNullable()
      table.string('slug', 100).notNullable().unique()
      table.text('description').nullable()
      table.text('image').nullable()
      table.integer('seats').notNullable().defaultTo(5)
      table.integer('default_deposit_amount').notNullable().defaultTo(0) // Integer pesewas
      table.boolean('self_drive_allowed').notNullable().defaultTo(true)
      table.integer('min_driver_age_override').nullable()
      table.integer('sort_order').notNullable().defaultTo(0)
      table.boolean('active').notNullable().defaultTo(true)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['sort_order'])
      table.index(['active'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
