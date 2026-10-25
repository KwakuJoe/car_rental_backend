import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // btree_gist: lets a GiST exclusion constraint mix "=" on a plain column
    // (car_id) with "&&" on a time range - this is what makes double-booking
    // a car impossible at the database level (see car_allocations, Phase 3).
    // pg_trgm: fuzzy/partial-match indexes for customer search.
    this.schema.raw('CREATE EXTENSION IF NOT EXISTS btree_gist')
    this.schema.raw('CREATE EXTENSION IF NOT EXISTS pg_trgm')
  }

  async down() {
    this.schema.raw('DROP EXTENSION IF EXISTS pg_trgm')
    this.schema.raw('DROP EXTENSION IF EXISTS btree_gist')
  }
}
