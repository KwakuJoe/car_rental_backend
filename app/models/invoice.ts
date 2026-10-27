import { InvoiceSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { belongsTo, column, hasOne } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasOne } from '@adonisjs/lucid/types/relations'
import Booking from '#models/booking'
import CreditNote from '#models/credit_note'
import Customer from '#models/customer'
import User from '#models/user'
import { withUlid } from '#models/mixins/with_ulid'

export type InvoiceBillTo = {
  name: string
  company: string | null
  tin: string | null
  address: string | null
  phone: string | null
  email: string | null
}
/** Amounts before tax, pesewas */
export type InvoiceLine = {
  description: string
  quantity: number
  unitAmount: number
  amount: number
}
export type InvoiceTax = { name: string; rateBp: number | null; amount: number }
export type InvoiceStatus = 'issued' | 'credited'

const json = (value: unknown) =>
  value === null || value === undefined ? null : JSON.stringify(value)

/** A booking's charges as issued (never edited - see CreditNote). */
export default class Invoice extends compose(InvoiceSchema, withUlid) {
  @column({ prepare: json })
  declare billTo: InvoiceBillTo

  @column({ prepare: json })
  declare lines: InvoiceLine[]

  @column({ prepare: json })
  declare taxes: InvoiceTax[]

  declare status: InvoiceStatus

  @belongsTo(() => Booking)
  declare booking: BelongsTo<typeof Booking>

  @belongsTo(() => Customer)
  declare customer: BelongsTo<typeof Customer>

  @belongsTo(() => User, { foreignKey: 'issuedBy' })
  declare issuer: BelongsTo<typeof User>

  @hasOne(() => CreditNote)
  declare creditNote: HasOne<typeof CreditNote>
}
