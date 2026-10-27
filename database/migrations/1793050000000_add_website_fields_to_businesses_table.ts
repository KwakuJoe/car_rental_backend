import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * For the public website (Phase 7 MVP): where online customers pay the
 * deposit (MoMo / bank - shown on the booking page, receipts, agreements),
 * social links for the footer, and the home page cover photo.
 */
export default class extends BaseSchema {
  protected tableName = 'businesses'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('momo_number', 20).nullable()
      table.string('momo_name', 120).nullable() // name the customer sees when sending
      table.string('momo_network', 20).nullable() // mtn | telecel | at
      table.string('bank_name', 120).nullable()
      table.string('bank_account_name', 120).nullable()
      table.string('bank_account_number', 40).nullable()
      table.string('bank_branch', 120).nullable()
      table.string('instagram_url', 255).nullable()
      table.string('facebook_url', 255).nullable()
      table.string('tiktok_url', 255).nullable()
      table.string('x_url', 255).nullable()
      table
        .string('cover_file_id', 26)
        .nullable()
        .references('id')
        .inTable('files')
        .onDelete('SET NULL')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('momo_number')
      table.dropColumn('momo_name')
      table.dropColumn('momo_network')
      table.dropColumn('bank_name')
      table.dropColumn('bank_account_name')
      table.dropColumn('bank_account_number')
      table.dropColumn('bank_branch')
      table.dropColumn('instagram_url')
      table.dropColumn('facebook_url')
      table.dropColumn('tiktok_url')
      table.dropColumn('x_url')
      table.dropColumn('cover_file_id')
    })
  }
}
