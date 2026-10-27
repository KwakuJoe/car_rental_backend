import vine from '@vinejs/vine'
import { PAYMENT_METHODS, PAYMENT_STATUSES, PAYMENT_TYPES } from '#models/payment'

const amount = () => vine.number().withoutDecimals().min(1).max(100_000_000)
const ref = () => vine.string().trim().maxLength(80).nullable().optional()
const name = () => vine.string().trim().maxLength(120).nullable().optional()
const notes = () => vine.string().trim().maxLength(1000).nullable().optional()

/** POST /admin/bookings/:id/payments - money in (rental, deposit) or out (refunds). */
export const recordPaymentValidator = vine.create({
  type: vine.enum(['rental', 'deposit', 'refund', 'deposit_refund'] as const),
  method: vine.enum(PAYMENT_METHODS),
  amount: amount(),
  transactionRef: ref(),
  payerName: name(),
  // When the money moved, if not now (e.g. a MoMo payment from last night).
  // ISO date-time, parsed by the controller.
  paidAt: vine.string().trim().maxLength(40).nullable().optional(),
  proofFileId: vine.string().maxLength(26).nullable().optional(),
  notes: notes(),
})

/** POST /admin/bookings/:id/deposit/settle - keep part against the balance, pay back the rest. */
export const settleDepositValidator = vine.create({
  applyAmount: vine.number().withoutDecimals().min(0).max(100_000_000),
  refundAmount: vine.number().withoutDecimals().min(0).max(100_000_000),
  method: vine.enum(PAYMENT_METHODS).nullable().optional(),
  transactionRef: ref(),
  payerName: name(),
  notes: notes(),
})

/** Void (completed) or reject (pending) - always with a reason. */
export const paymentReasonValidator = vine.create({
  reason: vine.string().trim().minLength(3).maxLength(300),
})

export const listPaymentsValidator = vine.create({
  page: vine.number().min(1).optional(),
  limit: vine.number().min(1).max(100).optional(),
  status: vine.enum(PAYMENT_STATUSES).optional(),
  type: vine.enum(PAYMENT_TYPES).optional(),
  method: vine.enum([...PAYMENT_METHODS, 'deposit'] as const).optional(),
  // Payment number, transaction ID, booking reference or customer name
  search: vine.string().trim().maxLength(100).optional(),
  dateFrom: vine.date({ formats: ['YYYY-MM-DD'] }).optional(),
  dateTo: vine.date({ formats: ['YYYY-MM-DD'] }).optional(),
})
