import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Phase 3 slice 1: customers (M3.1), their identity documents and the
 * blacklist (M3.3). ID numbers and document images are personal data
 * (Act 843): masked/hidden unless customers.view_documents.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('customers', (table) => {
      table.string('id', 26).primary()
      table
        .string('branch_id', 26)
        .notNullable()
        .references('id')
        .inTable('branches')
        .onDelete('RESTRICT')
      table.string('type', 20).notNullable().defaultTo('individual') // individual | corporate_driver
      table.string('full_name', 150).notNullable()
      table.string('phone', 20).notNullable() // E.164, e.g. +233241234567
      table.string('whatsapp_phone', 20).nullable()
      table.string('email', 254).nullable()
      table.date('date_of_birth').nullable()
      table.string('gender', 20).nullable()
      table.string('nationality', 2).nullable() // ISO country code, e.g. GH
      table.text('residential_address').nullable()
      table.string('digital_address', 20).nullable() // Ghana Post GPS, e.g. GA-123-4567
      table.string('occupation', 100).nullable()
      table.string('employer', 150).nullable()
      table.string('emergency_contact_name', 150).nullable()
      table.string('emergency_contact_phone', 20).nullable()
      // walk_in | phone | whatsapp | website | referral | social_media | corporate | other
      table.string('source', 20).nullable()
      table.text('notes').nullable()
      // unverified | id_verified (ID only - fine for chauffeur) | verified (ID + licence)
      table.string('verification_status', 20).notNullable().defaultTo('unverified')
      // Denormalised from blacklist_entries: null | warn | block
      table.string('blacklist_severity', 10).nullable()
      table.boolean('marketing_opt_in').notNullable().defaultTo(false)
      table.timestamp('archived_at', { useTz: true }).nullable()
      table
        .string('created_by', 26)
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()

      table.index(['full_name'])
      table.index(['verification_status'])
    })
    // Phone unique among active (not archived) customers
    this.schema.raw(
      'CREATE UNIQUE INDEX customers_phone_active ON customers (phone) WHERE archived_at IS NULL'
    )

    this.schema.createTable('customer_identities', (table) => {
      table.string('id', 26).primary()
      table
        .string('customer_id', 26)
        .notNullable()
        .references('id')
        .inTable('customers')
        .onDelete('CASCADE')
      // ghana_card | passport | voter_id | drivers_licence | international_driving_permit
      table.string('type', 40).notNullable()
      table.string('number', 60).notNullable() // stored as entered (normalised upper case)
      table.string('issuing_country', 2).nullable()
      table.date('issued_on').nullable()
      table.date('expires_on').nullable()
      table.string('licence_class', 20).nullable() // B, C, ... (licences only)
      table
        .string('front_file_id', 26)
        .nullable()
        .references('id')
        .inTable('files')
        .onDelete('SET NULL')
      table
        .string('back_file_id', 26)
        .nullable()
        .references('id')
        .inTable('files')
        .onDelete('SET NULL')
      table.string('status', 20).notNullable().defaultTo('pending') // pending | verified | rejected
      table
        .string('verified_by', 26)
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.timestamp('verified_at', { useTz: true }).nullable()
      table.text('rejection_reason').nullable()
      table
        .string('created_by', 26)
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()

      table.index(['customer_id'])
      table.index(['type', 'number']) // duplicate and blacklist matching
    })

    this.schema.createTable('blacklist_entries', (table) => {
      table.string('id', 26).primary()
      table
        .string('customer_id', 26)
        .nullable()
        .references('id')
        .inTable('customers')
        .onDelete('SET NULL')
      // Any of these match a customer - so a new profile with the same ID is still caught
      table.string('phone', 20).nullable()
      table.string('ghana_card_no', 60).nullable()
      table.string('licence_no', 60).nullable()
      table.string('passport_no', 60).nullable()
      // unpaid_balance | damage | fraud | violence | late_returns | other
      table.string('reason', 30).notNullable()
      table.text('details').nullable()
      table.string('severity', 10).notNullable() // warn | block
      table.string('added_by', 26).nullable().references('id').inTable('users').onDelete('SET NULL')
      table
        .string('lifted_by', 26)
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.timestamp('lifted_at', { useTz: true }).nullable()
      table.text('lift_reason').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()

      table.index(['phone'])
      table.index(['ghana_card_no'])
      table.index(['licence_no'])
      table.index(['passport_no'])
    })
  }

  async down() {
    this.schema.dropTable('blacklist_entries')
    this.schema.dropTable('customer_identities')
    this.schema.dropTable('customers')
  }
}
