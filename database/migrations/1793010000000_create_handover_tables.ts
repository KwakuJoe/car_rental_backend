import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Phase 4 slice 1: check-out (M4.1, M4.2). An inspection per handover with
 * odometer, fuel, checklist, photos and the customer's signature against a
 * versioned terms text; damage lives on the car (car_damages) so the next
 * customer signs over what's already there.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('bookings', (table) => {
      table.timestamp('actual_pickup_at', { useTz: true }).nullable()
      table.timestamp('actual_return_at', { useTz: true }).nullable()
    })

    // Rental terms customers sign; a new version on every change, never edited
    this.schema.createTable('terms_versions', (table) => {
      table.string('id', 26).primary()
      table.integer('version').notNullable().unique()
      table.text('body').notNullable()
      table
        .string('created_by', 26)
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
    })

    // What staff check at every handover (spare tyre, jack, keys...)
    this.schema.createTable('checklist_items', (table) => {
      table.string('id', 26).primary()
      table.string('name', 80).notNullable()
      table.integer('sort_order').notNullable().defaultTo(0)
      table.boolean('active').notNullable().defaultTo(true)
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
    })

    this.schema.createTable('inspections', (table) => {
      table.string('id', 26).primary()
      table
        .string('booking_id', 26)
        .notNullable()
        .references('id')
        .inTable('bookings')
        .onDelete('CASCADE')
      table.string('car_id', 26).notNullable().references('id').inTable('cars').onDelete('RESTRICT')
      table.string('type', 20).notNullable() // check_out | check_in
      table.string('status', 20).notNullable().defaultTo('draft') // draft | completed
      table.integer('odometer_km').nullable()
      table.integer('fuel_level').nullable() // eighths: 0 (empty) .. 8 (full)
      // [{ itemId, name, result: ok | missing | damaged, note }]
      table.jsonb('checklist').notNullable().defaultTo('[]')
      table.string('exterior', 20).nullable() // clean | dirty
      table.string('interior', 20).nullable() // clean | dirty | smoking
      table.text('notes').nullable()
      // Until Phase 5 records payments: staff confirm balance + deposit collected
      table.boolean('payment_confirmed').notNullable().defaultTo(false)
      table
        .string('payment_confirmed_by', 26)
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      // The signature: who, when, from where, against which terms (M4.2)
      table
        .string('terms_version_id', 26)
        .nullable()
        .references('id')
        .inTable('terms_versions')
        .onDelete('RESTRICT')
      table.string('agreement_hash', 64).nullable() // SHA-256 of terms + booking
      table
        .string('signature_file_id', 26)
        .nullable()
        .references('id')
        .inTable('files')
        .onDelete('RESTRICT')
      table.string('signed_name', 150).nullable()
      table.timestamp('signed_at', { useTz: true }).nullable()
      table.string('signer_ip', 64).nullable()
      table.string('signer_device', 255).nullable()
      table
        .string('inspected_by', 26)
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.timestamp('completed_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
      table.unique(['booking_id', 'type'])
    })

    this.schema.createTable('inspection_photos', (table) => {
      table.string('id', 26).primary()
      table
        .string('inspection_id', 26)
        .notNullable()
        .references('id')
        .inTable('inspections')
        .onDelete('CASCADE')
      // front | rear | left | right | odometer | fuel_gauge | interior | boot | other
      table.string('angle', 20).notNullable()
      table
        .string('file_id', 26)
        .notNullable()
        .references('id')
        .inTable('files')
        .onDelete('CASCADE')
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
      table.index(['inspection_id'])
    })

    // The car's damage register (Phase 8 builds repairs on it)
    this.schema.createTable('car_damages', (table) => {
      table.string('id', 26).primary()
      table.string('car_id', 26).notNullable().references('id').inTable('cars').onDelete('CASCADE')
      // Where on the top-view diagram: a named zone and a point in it (0-100 %)
      table.string('zone', 40).notNullable()
      table.float('x').notNullable()
      table.float('y').notNullable()
      table.string('type', 20).notNullable() // scratch | dent | crack | chip | missing_part
      table.string('severity', 20).notNullable() // minor | moderate | major
      table.text('note').nullable()
      table
        .string('photo_file_id', 26)
        .nullable()
        .references('id')
        .inTable('files')
        .onDelete('SET NULL')
      // Found at which handover (null = recorded outside a handover)
      table
        .string('reported_inspection_id', 26)
        .nullable()
        .references('id')
        .inTable('inspections')
        .onDelete('SET NULL')
      table.timestamp('repaired_at', { useTz: true }).nullable()
      table
        .string('created_by', 26)
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
      table.index(['car_id'])
    })
  }

  async down() {
    this.schema.dropTable('car_damages')
    this.schema.dropTable('inspection_photos')
    this.schema.dropTable('inspections')
    this.schema.dropTable('checklist_items')
    this.schema.dropTable('terms_versions')
    this.schema.alterTable('bookings', (table) => {
      table.dropColumn('actual_pickup_at')
      table.dropColumn('actual_return_at')
    })
  }
}
