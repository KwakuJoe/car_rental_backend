import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'cars'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 26).primary()
      table
        .string('branch_id', 26)
        .notNullable()
        .references('id')
        .inTable('branches')
        .onDelete('RESTRICT')
      table
        .string('category_id', 26)
        .notNullable()
        .references('id')
        .inTable('categories')
        .onDelete('RESTRICT')
      table.string('make', 80).notNullable()
      table.string('model', 80).notNullable()
      table.integer('year').notNullable()
      table.string('colour', 50).notNullable()
      table.string('registration_no', 50).notNullable().unique()
      table.string('vin_chassis_no', 80).notNullable().unique()
      table.string('engine_no', 80).nullable()
      table.string('transmission', 20).notNullable().defaultTo('auto') // auto | manual
      table.string('fuel_type', 20).notNullable().defaultTo('petrol') // petrol | diesel | hybrid | electric
      table.integer('fuel_capacity_l').nullable()
      table.integer('seats').notNullable().defaultTo(5)
      table.integer('doors').notNullable().defaultTo(4)
      table.integer('luggage').notNullable().defaultTo(2)
      table.jsonb('features').notNullable().defaultTo('[]')
      table.integer('current_odometer_km').notNullable().defaultTo(0)
      table.date('purchase_date').nullable()
      table.bigInteger('purchase_amount').nullable() // Integer pesewas
      table.string('ownership', 20).notNullable().defaultTo('company') // company | partner
      table.string('public_title', 150).nullable()
      table.text('public_description').nullable()
      table.boolean('is_listed_online').notNullable().defaultTo(true)
      table.string('status', 30).notNullable().defaultTo('active') // active | in_maintenance | out_of_service | retired
      table.timestamp('archived_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      table.index(['branch_id'])
      table.index(['category_id'])
      table.index(['status'])
      table.index(['is_listed_online'])
      table.index(['archived_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
