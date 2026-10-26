import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Phase 3 slice 2: document numbering (M1.7) and staff bookings (M3.4/M3.5).
 * A booking holds its car through a car_allocations row (the exclusion
 * constraint makes double-booking impossible) and freezes its price as the
 * full quote in price_snapshot.
 */
export default class extends BaseSchema {
  async up() {
    // WYK-2026-00123: the prefix is the business's, editable later
    this.schema.alterTable('businesses', (table) => {
      table.string('document_prefix', 6).notNullable().defaultTo('WYK')
    })

    // One counter per document type and year, row-locked when taken (gap-free)
    this.schema.createTable('document_sequences', (table) => {
      table.string('id', 26).primary()
      table.string('type', 30).notNullable() // booking | invoice | receipt ...
      table.integer('year').notNullable()
      table.integer('next_value').notNullable().defaultTo(1)
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
      table.unique(['type', 'year'])
    })

    this.schema.createTable('bookings', (table) => {
      table.string('id', 26).primary()
      table.string('reference', 30).notNullable().unique()
      table
        .string('branch_id', 26)
        .notNullable()
        .references('id')
        .inTable('branches')
        .onDelete('RESTRICT')
      table
        .string('customer_id', 26)
        .notNullable()
        .references('id')
        .inTable('customers')
        .onDelete('RESTRICT')
      table.string('car_id', 26).notNullable().references('id').inTable('cars').onDelete('RESTRICT')
      table
        .string('category_id', 26)
        .notNullable()
        .references('id')
        .inTable('categories')
        .onDelete('RESTRICT')
      // walk_in | phone | whatsapp | website | corporate
      table.string('source', 20).notNullable()
      table.string('drive_type', 20).notNullable() // self_drive | chauffeur
      // draft | pending | confirmed | on_rent | returned | closed | cancelled | no_show | expired
      table.string('status', 20).notNullable()
      table.timestamp('pickup_at', { useTz: true }).notNullable()
      table.timestamp('return_at', { useTz: true }).notNullable()
      table
        .string('delivery_zone_id', 26)
        .nullable()
        .references('id')
        .inTable('delivery_zones')
        .onDelete('SET NULL')
      table.text('delivery_address').nullable()
      table
        .string('collection_zone_id', 26)
        .nullable()
        .references('id')
        .inTable('delivery_zones')
        .onDelete('SET NULL')
      table.text('collection_address').nullable()
      table.boolean('out_of_town').notNullable().defaultTo(false)
      table.integer('driver_nights_away').notNullable().defaultTo(0)
      table.text('destination').nullable() // where they're going / purpose
      table
        .string('protection_plan_id', 26)
        .nullable()
        .references('id')
        .inTable('protection_plans')
        .onDelete('SET NULL')
      // pending only: the car is held until then, then the booking expires
      table.timestamp('hold_expires_at', { useTz: true }).nullable()
      // The full quote at booking time - later price changes never alter it
      table.jsonb('price_snapshot').notNullable()
      table.integer('subtotal_amount').notNullable()
      table.integer('discount_amount').notNullable().defaultTo(0)
      table.text('discount_reason').nullable()
      table.integer('tax_amount').notNullable()
      table.integer('total_amount').notNullable()
      table.integer('deposit_amount').notNullable()
      table.integer('reservation_fee_amount').nullable()
      // Kept in sync by payments (Phase 5)
      table.integer('paid_amount').notNullable().defaultTo(0)
      table.integer('balance_amount').notNullable()
      // A manager let it through (big discount, blacklist block)
      table.text('override_reason').nullable()
      table
        .string('override_by', 26)
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.timestamp('confirmed_at', { useTz: true }).nullable()
      table
        .string('confirmed_by', 26)
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.timestamp('cancelled_at', { useTz: true }).nullable()
      table
        .string('cancelled_by', 26)
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.text('cancel_reason').nullable()
      table.integer('cancellation_fee_amount').nullable()
      table.timestamp('no_show_at', { useTz: true }).nullable()
      table.text('notes').nullable()
      table
        .string('created_by', 26)
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()

      table.index(['status'])
      table.index(['pickup_at'])
      table.index(['return_at'])
      table.index(['customer_id'])
      table.index(['car_id'])
    })

    this.schema.createTable('booking_extras', (table) => {
      table.string('id', 26).primary()
      table
        .string('booking_id', 26)
        .notNullable()
        .references('id')
        .inTable('bookings')
        .onDelete('CASCADE')
      table
        .string('extra_id', 26)
        .nullable()
        .references('id')
        .inTable('extras')
        .onDelete('SET NULL')
      table.string('name', 120).notNullable() // as it was when booked
      table.integer('quantity').notNullable()
      table.integer('unit_amount').notNullable()
      table.integer('total_amount').notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
      table.index(['booking_id'])
    })

    this.schema.alterTable('car_allocations', (table) => {
      table.foreign('booking_id').references('id').inTable('bookings').onDelete('SET NULL')
      table.index(['booking_id'])
    })
  }

  async down() {
    this.schema.alterTable('car_allocations', (table) => {
      table.dropForeign(['booking_id'])
      table.dropIndex(['booking_id'])
    })
    this.schema.dropTable('booking_extras')
    this.schema.dropTable('bookings')
    this.schema.dropTable('document_sequences')
    this.schema.alterTable('businesses', (table) => {
      table.dropColumn('document_prefix')
    })
  }
}
