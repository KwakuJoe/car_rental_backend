import { CreditNoteSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Invoice from '#models/invoice'
import User from '#models/user'
import { withUlid } from '#models/mixins/with_ulid'

/** Cancels an invoice in full (the invoice itself is never edited). */
export default class CreditNote extends compose(CreditNoteSchema, withUlid) {
  @belongsTo(() => Invoice)
  declare invoice: BelongsTo<typeof Invoice>

  @belongsTo(() => User, { foreignKey: 'issuedBy' })
  declare issuer: BelongsTo<typeof User>
}
