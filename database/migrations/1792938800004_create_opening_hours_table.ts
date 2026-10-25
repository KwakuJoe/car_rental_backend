import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'opening_hours'

  async up() {
    // One row per weekday per branch. Pickups/returns outside these hours
    // either get rejected or carry the after-hours fee (Phase 3).
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 26).primary()
      table
        .string('branch_id', 26)
        .notNullable()
        .references('id')
        .inTable('branches')
        .onDelete('CASCADE')
      // 0 = Sunday ... 6 = Saturday (same as JS Date#getDay / Luxon weekday % 7)
      table.smallint('weekday').notNullable()
      table.time('opens_at').nullable()
      table.time('closes_at').nullable()
      table.boolean('is_closed').notNullable().defaultTo(false)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.unique(['branch_id', 'weekday'])
    })

    this.schema.raw(
      'ALTER TABLE opening_hours ADD CONSTRAINT opening_hours_weekday_range CHECK (weekday BETWEEN 0 AND 6)'
    )
    this.schema.raw(
      'ALTER TABLE opening_hours ADD CONSTRAINT opening_hours_times_when_open CHECK (is_closed OR (opens_at IS NOT NULL AND closes_at IS NOT NULL AND opens_at < closes_at))'
    )
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
