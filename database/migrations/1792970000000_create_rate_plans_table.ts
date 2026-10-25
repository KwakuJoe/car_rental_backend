import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'rate_plans'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 26).primary()
      table
        .string('category_id', 26)
        .notNullable()
        .references('id')
        .inTable('categories')
        .onDelete('CASCADE')
      // Set = this plan overrides the category plan for one car
      table.string('car_id', 26).nullable().references('id').inTable('cars').onDelete('CASCADE')
      table.string('drive_type', 20).notNullable() // self_drive | chauffeur

      // Integer pesewas. Weekly = price for 7 days, monthly = price for 30 days;
      // null = the daily price applies at that length too.
      table.integer('daily_amount').notNullable()
      table.integer('weekly_amount').nullable()
      table.integer('monthly_amount').nullable()

      // default = business setting (rental.mileage_policy), unlimited, or limited
      table.string('mileage_mode', 20).notNullable().defaultTo('default')
      table.integer('included_km_per_day').nullable()
      table.integer('excess_km_amount').nullable()

      // Chauffeur only
      table.integer('out_of_town_daily_amount').nullable()
      table.integer('driver_overnight_amount').nullable()
      table.integer('driver_hours_per_day').nullable()
      table.integer('driver_overtime_hour_amount').nullable()
      table.boolean('fuel_included').notNullable().defaultTo(false)

      // Null = open-ended (from forever / until changed)
      table.date('effective_from').nullable()
      table.date('effective_to').nullable()
      table.boolean('active').notNullable().defaultTo(true)
      table.text('notes').nullable()
      table
        .string('created_by', 26)
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()

      table.index(['category_id', 'drive_type', 'active'])
      table.index(['car_id'])
    })

    // At most one active plan per category/car/drive type for any date - so the
    // price for a day is never ambiguous. car_id null (category plan) is its own slot.
    this.schema.raw(`
      ALTER TABLE rate_plans
      ADD CONSTRAINT rate_plans_no_overlap
      EXCLUDE USING gist (
        category_id WITH =,
        (COALESCE(car_id, '')) WITH =,
        drive_type WITH =,
        daterange(effective_from, effective_to, '[]') WITH &&
      )
      WHERE (active = true);
    `)
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
