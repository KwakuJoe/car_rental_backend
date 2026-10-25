import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'branches'

  async up() {
    // Single location for now, but every car, booking, payment and staff
    // assignment points at a branch from day one, so adding branches later
    // is a new feature instead of a rewrite.
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 26).primary()
      table
        .string('business_id', 26)
        .notNullable()
        .references('id')
        .inTable('businesses')
        .onDelete('CASCADE')
      table.string('name').notNullable()
      // Short code used in document numbers later (e.g. ACC)
      table.string('code', 10).notNullable().unique()
      table.boolean('is_main').notNullable().defaultTo(false)
      table.boolean('is_active').notNullable().defaultTo(true)
      table.string('email', 254).nullable()
      table.string('phone', 20).nullable()
      table.string('address').nullable()
      table.string('digital_address', 20).nullable()
      table.string('city').nullable()
      table.string('region').nullable()
      table.decimal('latitude', 10, 7).nullable()
      table.decimal('longitude', 10, 7).nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

    // At most one main branch per business, enforced by the database.
    this.schema.raw(
      'CREATE UNIQUE INDEX branches_one_main_per_business ON branches (business_id) WHERE is_main'
    )
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
