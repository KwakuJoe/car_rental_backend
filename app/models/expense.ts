import { ExpenseSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Car from '#models/car'
import ExpenseCategory from '#models/expense_category'
import File from '#models/file'
import User from '#models/user'
import { withUlid } from '#models/mixins/with_ulid'

export const EXPENSE_STATUSES = ['submitted', 'approved', 'rejected'] as const
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number]
export const EXPENSE_PAID_VIA = ['cash', 'momo', 'bank_transfer', 'card'] as const
export type ExpensePaidVia = (typeof EXPENSE_PAID_VIA)[number]

/** Money the business spent - approved ones count in Reports (and profit per car). */
export default class Expense extends compose(ExpenseSchema, withUlid) {
  declare status: ExpenseStatus
  declare paidVia: ExpensePaidVia

  @belongsTo(() => ExpenseCategory, { foreignKey: 'categoryId' })
  declare category: BelongsTo<typeof ExpenseCategory>

  @belongsTo(() => Car)
  declare car: BelongsTo<typeof Car>

  @belongsTo(() => File, { foreignKey: 'receiptFileId' })
  declare receipt: BelongsTo<typeof File>

  @belongsTo(() => User, { foreignKey: 'submittedBy' })
  declare submitter: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'approvedBy' })
  declare approver: BelongsTo<typeof User>
}
