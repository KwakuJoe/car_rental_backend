import { BaseSchema } from '@adonisjs/lucid/schema'
import { ulid } from 'ulid'

/**
 * Damage, accidents and traffic fines (M8.2).
 *  - car_damages (the marks from check-out / check-in) get a resolution:
 *    repaired (optionally by a job card) or accepted as fair wear.
 *  - incidents (INC-): accident, theft, breakdown, police stop, other -
 *    matched to the booking that had the car; insurance claim; a charge to
 *    the customer goes on that booking.
 *  - traffic_fines: matched to the booking by when; charged to the
 *    customer, paid by the business (an expense) or cancelled.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('car_damages', (table) => {
      table.string('resolution', 20).nullable() // repaired | accepted_wear
      table.string('resolution_note', 300).nullable()
      table.string('repaired_job_card_id', 26).nullable().references('id').inTable('job_cards')
    })

    this.schema.createTable('incidents', (table) => {
      table.string('id', 26).primary()
      table.string('number', 30).notNullable().unique()
      table.string('branch_id', 26).notNullable().references('id').inTable('branches')
      table.string('car_id', 26).notNullable().references('id').inTable('cars')
      table.string('booking_id', 26).nullable().references('id').inTable('bookings')
      table.string('type', 20).notNullable() // accident | theft | breakdown | police_stop | other
      table.string('status', 20).notNullable().defaultTo('open') // open | closed
      table.timestamp('occurred_at', { useTz: true }).notNullable()
      table.string('location', 200).nullable()
      table.text('description').notNullable()
      table.string('driver_name', 120).nullable()
      table.string('police_report_no', 60).nullable()
      // { name, phone, vehicleReg, insurer, policyNo }
      table.jsonb('third_party').nullable()
      table.string('claim_no', 60).nullable()
      table.string('claim_status', 20).notNullable().defaultTo('not_filed') // not_filed | filed | approved | rejected | paid
      table.integer('claim_amount').nullable()
      table.integer('repair_estimate_amount').nullable()
      table.string('charge_id', 26).nullable().references('id').inTable('booking_charges')
      table.jsonb('photo_file_ids').notNullable().defaultTo('[]')
      table.text('notes').nullable()
      table.timestamp('closed_at', { useTz: true }).nullable()
      table.string('created_by', 26).nullable().references('id').inTable('users')
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
      table.index(['car_id'])
      table.index(['booking_id'])
      table.index(['occurred_at'])
    })

    this.schema.createTable('traffic_fines', (table) => {
      table.string('id', 26).primary()
      table.string('branch_id', 26).notNullable().references('id').inTable('branches')
      table.string('car_id', 26).notNullable().references('id').inTable('cars')
      table.string('booking_id', 26).nullable().references('id').inTable('bookings')
      table.string('offence', 200).notNullable()
      table.string('reference', 60).nullable() // ticket / notice number
      table.string('location', 200).nullable()
      table.timestamp('issued_at', { useTz: true }).notNullable()
      table.integer('amount').notNullable()
      table.integer('admin_fee_amount').notNullable().defaultTo(0)
      table.string('status', 30).notNullable().defaultTo('unpaid') // unpaid | charged_to_customer | paid_by_business | cancelled
      table.string('charge_id', 26).nullable().references('id').inTable('booking_charges')
      table.string('expense_id', 26).nullable().references('id').inTable('expenses')
      table.string('file_id', 26).nullable().references('id').inTable('files')
      table.text('notes').nullable()
      table.string('cancel_reason', 300).nullable()
      table.string('created_by', 26).nullable().references('id').inTable('users')
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
      table.index(['car_id'])
      table.index(['booking_id'])
      table.index(['status'])
    })

    this.schema.alterTable('job_cards', (table) => {
      // The damage marks this job repairs (marked repaired when it's completed)
      table.jsonb('damage_ids').notNullable().defaultTo('[]')
      table.string('incident_id', 26).nullable().references('id').inTable('incidents')
    })

    this.defer(async (db) => {
      const exists = await db.from('expense_categories').where('slug', 'fines').first()
      if (!exists) {
        const now = new Date()
        await db.table('expense_categories').insert({
          id: ulid(),
          name: 'Fines & penalties',
          slug: 'fines',
          sort_order: 12,
          active: true,
          created_at: now,
          updated_at: now,
        })
      }
    })
  }

  async down() {
    this.schema.alterTable('job_cards', (table) => {
      table.dropColumn('incident_id')
      table.dropColumn('damage_ids')
    })
    this.schema.dropTable('traffic_fines')
    this.schema.dropTable('incidents')
    this.schema.alterTable('car_damages', (table) => {
      table.dropColumn('repaired_job_card_id')
      table.dropColumn('resolution_note')
      table.dropColumn('resolution')
    })
  }
}
