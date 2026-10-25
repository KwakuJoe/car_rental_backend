import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'notifications'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 26).primary()
      table
        .string('user_id', 26)
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.string('type', 50).notNullable()
      table.string('title', 255).notNullable()
      table.text('body').notNullable()
      table.string('link', 255).nullable()
      table.timestamp('read_at', { useTz: true }).nullable()

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()

      table.index(['user_id', 'read_at'])
      table.index(['user_id', 'created_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
