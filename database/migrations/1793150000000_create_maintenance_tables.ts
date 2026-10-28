import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Maintenance (M8.1), by time: each car's service schedule (every N
 * months, reminded N days ahead) and job cards (JC-) for services, repairs,
 * accidents and inspections - at an outside garage or by the company's own
 * mechanic. A job card can take the car off the road (a maintenance
 * allocation, so it can't be booked); completing it records the cost as a
 * car expense and moves the covered schedules' next due date on.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('maintenance_schedules', (table) => {
      table.string('id', 26).primary()
      table.string('car_id', 26).notNullable().references('id').inTable('cars')
      table.string('task', 120).notNullable()
      table.integer('interval_months').notNullable()
      table.integer('remind_days_before').notNullable().defaultTo(14)
      table.date('last_done_on').nullable()
      table.date('next_due_on').notNullable()
      table.boolean('active').notNullable().defaultTo(true)
      table.text('notes').nullable()
      table.string('created_by', 26).nullable().references('id').inTable('users')
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
      table.index(['car_id'])
      table.index(['next_due_on'])
    })

    this.schema.createTable('job_cards', (table) => {
      table.string('id', 26).primary()
      table.string('number', 30).notNullable().unique()
      table.string('branch_id', 26).notNullable().references('id').inTable('branches')
      table.string('car_id', 26).notNullable().references('id').inTable('cars')
      table.string('type', 20).notNullable() // service | repair | accident | inspection | other
      table.string('status', 20).notNullable().defaultTo('open') // open | in_progress | waiting_parts | completed | cancelled
      table.string('title', 200).notNullable()
      table.text('problem').nullable()
      table.string('done_by', 20).notNullable() // garage | in_house
      table.string('garage_name', 120).nullable()
      table.string('mechanic_name', 120).nullable()
      table.integer('odometer_km').nullable()
      table.timestamp('opened_at', { useTz: true }).notNullable()
      table.timestamp('expected_back_at', { useTz: true }).nullable()
      table.timestamp('completed_at', { useTz: true }).nullable()
      // [{ kind: part | labour, description, quantity, unitAmount, amount }]
      table.jsonb('lines').notNullable().defaultTo('[]')
      table.integer('total_amount').notNullable().defaultTo(0)
      // The service schedules this job covers (moved on when it's completed)
      table.jsonb('schedule_ids').notNullable().defaultTo('[]')
      table.string('allocation_id', 26).nullable().references('id').inTable('car_allocations')
      table.string('expense_id', 26).nullable().references('id').inTable('expenses')
      table.text('notes').nullable()
      table.string('cancel_reason', 300).nullable()
      table.string('created_by', 26).nullable().references('id').inTable('users')
      table.string('completed_by', 26).nullable().references('id').inTable('users')
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
      table.index(['car_id'])
      table.index(['status'])
      table.index(['opened_at'])
    })
  }

  async down() {
    this.schema.dropTable('job_cards')
    this.schema.dropTable('maintenance_schedules')
  }
}
