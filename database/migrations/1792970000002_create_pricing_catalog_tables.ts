import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Pricing step 3 (M2.7 - M2.9): extras, protection plans, delivery zones and
 * the standard fee schedule. Money in pesewas. Rows are deactivated, never
 * deleted - bookings will reference them.
 */
export default class extends BaseSchema {
  async up() {
    const common = (table: any) => {
      table.integer('sort_order').notNullable().defaultTo(0)
      table.boolean('active').notNullable().defaultTo(true)
      table
        .string('created_by', 26)
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
    }

    this.schema.createTable('extras', (table) => {
      table.string('id', 26).primary()
      table.string('name', 100).notNullable()
      table.text('description').nullable()
      table.string('charge_type', 20).notNullable() // per_day | per_rental
      table.integer('amount').notNullable()
      table.integer('max_quantity').notNullable().defaultTo(1) // per booking
      table.integer('stock').nullable() // null = unlimited (e.g. 4 child seats)
      table.boolean('taxable').notNullable().defaultTo(true)
      table.boolean('available_online').notNullable().defaultTo(true)
      common(table)
    })

    this.schema.createTable('protection_plans', (table) => {
      table.string('id', 26).primary()
      table.string('name', 100).notNullable()
      table.text('description').nullable() // what's covered - shown to customers
      table.integer('per_day_amount').notNullable().defaultTo(0)
      // Most the customer pays for damage under this plan
      table.integer('excess_amount').notNullable()
      table.integer('deposit_amount_override').nullable() // null = category deposit
      table.boolean('is_default').notNullable().defaultTo(false)
      table.boolean('taxable').notNullable().defaultTo(true)
      table.boolean('available_online').notNullable().defaultTo(true)
      common(table)
    })
    // Only one default plan
    this.schema.raw(
      'CREATE UNIQUE INDEX protection_plans_one_default ON protection_plans (is_default) WHERE is_default'
    )

    this.schema.createTable('delivery_zones', (table) => {
      table.string('id', 26).primary()
      table.string('name', 100).notNullable()
      table.text('description').nullable()
      table.integer('delivery_amount').notNullable().defaultTo(0)
      table.integer('collection_amount').notNullable().defaultTo(0)
      table.integer('after_hours_amount').notNullable().defaultTo(0)
      table.boolean('available_online').notNullable().defaultTo(true)
      common(table)
    })

    this.schema.createTable('fees', (table) => {
      table.string('id', 26).primary()
      // Standard fees have fixed codes the check-in screen looks up (late_return_hour, ...)
      table.string('code', 60).notNullable().unique()
      table.string('name', 100).notNullable()
      table.text('description').nullable()
      // flat | per_hour | per_day | per_litre | per_km | percent (amount in basis points)
      table.string('unit', 20).notNullable()
      table.integer('amount').notNullable()
      table.boolean('taxable').notNullable().defaultTo(true)
      table.boolean('is_system').notNullable().defaultTo(false)
      common(table)
    })
  }

  async down() {
    this.schema.dropTable('fees')
    this.schema.dropTable('delivery_zones')
    this.schema.dropTable('protection_plans')
    this.schema.dropTable('extras')
  }
}
