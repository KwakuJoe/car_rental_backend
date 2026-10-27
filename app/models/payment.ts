import { PaymentSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Booking from '#models/booking'
import Customer from '#models/customer'
import File from '#models/file'
import User from '#models/user'
import { withUlid } from '#models/mixins/with_ulid'

export const PAYMENT_TYPES = [
  'rental',
  'deposit',
  'refund',
  'deposit_refund',
  'deposit_applied',
] as const
export type PaymentType = (typeof PAYMENT_TYPES)[number]

/** Methods staff can choose; `deposit` is internal (deposit kept against the balance). */
export const PAYMENT_METHODS = ['cash', 'momo', 'bank_transfer'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number] | 'deposit'

export const PAYMENT_STATUSES = ['pending_verification', 'completed', 'rejected', 'void'] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

/** Money paid back to the customer */
export const OUTGOING_TYPES: PaymentType[] = ['refund', 'deposit_refund']

export default class Payment extends compose(PaymentSchema, withUlid) {
  declare type: PaymentType
  declare method: PaymentMethod
  declare status: PaymentStatus

  @belongsTo(() => Booking)
  declare booking: BelongsTo<typeof Booking>

  @belongsTo(() => Customer)
  declare customer: BelongsTo<typeof Customer>

  @belongsTo(() => File, { foreignKey: 'proofFileId' })
  declare proof: BelongsTo<typeof File>

  @belongsTo(() => User, { foreignKey: 'recordedBy' })
  declare recorder: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'verifiedBy' })
  declare verifier: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'voidedBy' })
  declare voider: BelongsTo<typeof User>
}
