import { BaseSchema } from '@adonisjs/lucid/schema'
import { ulid } from 'ulid'

/** The categories a new install starts with (renamed or switched off later) */
const DEFAULT_CATEGORIES = [
  ['Fuel', 'fuel'],
  ['Repairs & parts', 'repairs'],
  ['Servicing', 'servicing'],
  ['Tyres', 'tyres'],
  ['Insurance', 'insurance'],
  ['Roadworthy & licensing', 'licensing'],
  ['Car wash', 'car_wash'],
  ['Salaries', 'salaries'],
  ['Driver allowances', 'driver_allowances'],
  ['Rent', 'rent'],
  ['Utilities', 'utilities'],
  ['Marketing', 'marketing'],
  ['Other', 'other'],
] as const

/**
 * Expenses (M5.8): money the business spends, optionally against a car (it
 * feeds profit per car in Reports). Submitted, then approved or rejected by
 * someone with expenses.approve; approved ones count in the reports.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('expense_categories', (table) => {
      table.string('id', 26).primary()
      table.string('name', 80).notNullable()
      table.string('slug', 80).notNullable().unique()
      table.integer('sort_order').notNullable().defaultTo(0)
      table.boolean('active').notNullable().defaultTo(true)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

    this.schema.createTable('expenses', (table) => {
      table.string('id', 26).primary()
      table.string('branch_id', 26).notNullable().references('id').inTable('branches')
      table.string('category_id', 26).notNullable().references('id').inTable('expense_categories')
      // Optional: the car it was for (fuel, repairs, insurance...) - profit per car
      table.string('car_id', 26).nullable().references('id').inTable('cars').onDelete('SET NULL')
      table.string('description', 200).notNullable()
      table.string('vendor', 120).nullable()
      table.integer('amount').notNullable() // pesewas
      table.string('paid_via', 20).notNullable() // cash | momo | bank_transfer | card
      table.timestamp('paid_at').notNullable()
      table.string('reference', 80).nullable() // receipt / invoice / transaction number
      table
        .string('receipt_file_id', 26)
        .nullable()
        .references('id')
        .inTable('files')
        .onDelete('SET NULL')
      // submitted | approved | rejected
      table.string('status', 12).notNullable().defaultTo('submitted')
      table.text('notes').nullable()
      table.string('reject_reason', 300).nullable()
      table
        .string('submitted_by', 26)
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table
        .string('approved_by', 26)
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.timestamp('approved_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['paid_at'])
      table.index(['car_id'])
      table.index(['status'])
    })

    this.defer(async (db) => {
      const now = new Date()
      await db.table('expense_categories').multiInsert(
        DEFAULT_CATEGORIES.map(([name, slug], index) => ({
          id: ulid(),
          name,
          slug,
          sort_order: index,
          active: true,
          created_at: now,
        }))
      )
    })
  }

  async down() {
    this.schema.dropTable('expenses')
    this.schema.dropTable('expense_categories')
  }
}
