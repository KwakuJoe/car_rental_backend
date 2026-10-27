import vine from '@vinejs/vine'
import { EXPENSE_PAID_VIA, EXPENSE_STATUSES } from '#models/expense'

export const listExpensesValidator = vine.create({
  page: vine.number().min(1).optional(),
  limit: vine.number().min(1).max(100).optional(),
  status: vine.enum(EXPENSE_STATUSES).optional(),
  categoryId: vine.string().optional(),
  carId: vine.string().optional(),
  // Description, vendor or reference
  search: vine.string().trim().maxLength(100).optional(),
  dateFrom: vine.date({ formats: ['YYYY-MM-DD'] }).optional(),
  dateTo: vine.date({ formats: ['YYYY-MM-DD'] }).optional(),
})

/** Add or correct an expense (amount in pesewas; paidAt "YYYY-MM-DD" or a full ISO date-time) */
export const expenseValidator = vine.create({
  categoryId: vine.string(),
  carId: vine.string().nullable().optional(),
  description: vine.string().trim().minLength(2).maxLength(200),
  vendor: vine.string().trim().maxLength(120).nullable().optional(),
  amount: vine.number().withoutDecimals().min(1).max(100_000_000),
  paidVia: vine.enum(EXPENSE_PAID_VIA),
  paidAt: vine.string().trim().maxLength(40),
  reference: vine.string().trim().maxLength(80).nullable().optional(),
  receiptFileId: vine.string().maxLength(26).nullable().optional(),
  notes: vine.string().trim().maxLength(1000).nullable().optional(),
})

export const rejectExpenseValidator = vine.create({
  reason: vine.string().trim().minLength(3).maxLength(300),
})
