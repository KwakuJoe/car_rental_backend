import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'audit_logs'

  async up() {
    // Append-only: rows are never updated or deleted through the app.
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 26).primary()
      // Who acted. Null for system/webhook actions and failed logins.
      table.string('user_id', 26).nullable().references('id').inTable('users').onDelete('SET NULL')
      table.string('actor_type', 20).notNullable().defaultTo('staff') // staff | system | customer | webhook
      // Snapshot of the actor's name/email at the time - survives renames and deletions.
      table.string('actor_label').nullable()
      // <module>.<verb>, e.g. user.updated, branch.deleted, auth.login_failed
      table.string('action', 80).notNullable()
      table.string('subject_type', 40).nullable() // user | role | business | branch | ...
      table.string('subject_id', 26).nullable()
      table.string('subject_label').nullable()
      // Changed fields only (sensitive values redacted)
      table.jsonb('before').nullable()
      table.jsonb('after').nullable()
      table.jsonb('metadata').nullable()
      table.string('ip', 45).nullable()
      table.string('user_agent', 255).nullable()
      table.timestamp('created_at').notNullable()

      table.index(['subject_type', 'subject_id'])
      table.index(['user_id'])
      table.index(['action'])
      table.index(['created_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
