import type { HttpContext } from '@adonisjs/core/http'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import Booking, { type BookingStatus } from '#models/booking'
import File from '#models/file'
import Payment, {
  OUTGOING_TYPES,
  type PaymentMethod,
  type PaymentStatus,
  type PaymentType,
} from '#models/payment'
import type User from '#models/user'
import AuditService from '#services/audit_service'
import BookingMessages from '#services/messages/booking_messages'
import BookingService, { BookingError } from '#services/bookings/booking_service'
import NumberingService from '#services/numbering_service'
import { formatMoney as money } from '#helpers/money'
import { userCan } from '#helpers/permissions'

export type RecordPaymentInput = {
  type: Exclude<PaymentType, 'deposit_applied'>
  method: Exclude<PaymentMethod, 'deposit'>
  amount: number
  transactionRef?: string | null
  payerName?: string | null
  paidAt?: DateTime | null
  proofFileId?: string | null
  notes?: string | null
}

export type SettleDepositInput = {
  applyAmount: number
  refundAmount: number
  method?: Exclude<PaymentMethod, 'deposit'> | null
  transactionRef?: string | null
  payerName?: string | null
  notes?: string | null
}

/** Where a booking's money stands - worked out from its payments. */
export type MoneySummary = {
  total: number
  paid: number
  balance: number
  deposit: number
  depositHeld: number
  depositDue: number
  reservationFee: number
  /** MoMo/bank payments recorded but not yet checked against the statement */
  pendingRental: number
  pendingDeposit: number
  /** Rent that may be paid back now (overpaid, or paid minus the cancellation fee) */
  refundable: number
}

/** Rent and deposits can be taken while the booking is live; refunds also after it ends. */
const PAYABLE: BookingStatus[] = ['pending', 'confirmed', 'on_rent', 'returned']
const REFUNDABLE: BookingStatus[] = [...PAYABLE, 'cancelled', 'no_show', 'expired']
const ENDED: BookingStatus[] = ['cancelled', 'no_show', 'expired']

/** "  0244 123 abc " -> "0244123ABC": the same transaction typed two ways is one transaction. */
export const normaliseRef = (ref: string | null | undefined) => {
  const clean = (ref ?? '').replace(/\s+/g, '').toUpperCase()
  return clean || null
}

type Totals = Record<PaymentType, number>
const empty = (): Totals => ({
  rental: 0,
  deposit: 0,
  refund: 0,
  deposit_refund: 0,
  deposit_applied: 0,
})

/**
 * Payments, deposits and refunds (Phase 5 slice 1: M5.1, M5.4, M5.5).
 * Staff record money that came in by cash, MoMo or bank transfer; the
 * booking's paid / balance / deposit-held figures are recalculated from the
 * completed rows in the same transaction. MoMo and bank payments recorded by
 * someone without payments.verify wait until a verifier has checked the
 * statement. Nothing is deleted - wrong payments are voided with a reason.
 */
export default class PaymentService {
  /** Completed and pending sums per type. */
  private static async totals(bookingId: string, client?: TransactionClientContract) {
    const rows: { type: PaymentType; status: PaymentStatus; total: string }[] = await (client ?? db)
      .from('payments')
      .where('booking_id', bookingId)
      .whereIn('status', ['completed', 'pending_verification'])
      .select('type', 'status')
      .sum('amount as total')
      .groupBy('type', 'status')
    const completed = empty()
    const pending = empty()
    for (const row of rows) {
      ;(row.status === 'completed' ? completed : pending)[row.type] += Number(row.total)
    }
    return { completed, pending }
  }

  static async summary(
    booking: Booking,
    client?: TransactionClientContract
  ): Promise<MoneySummary> {
    const { completed, pending } = await this.totals(booking.id, client)
    const paid = completed.rental + completed.deposit_applied - completed.refund
    const depositHeld = completed.deposit - completed.deposit_refund - completed.deposit_applied
    const ended = ENDED.includes(booking.status)
    const refundable = ended
      ? Math.max(0, paid - (booking.cancellationFeeAmount ?? 0))
      : Math.max(0, paid - booking.totalAmount)
    return {
      total: booking.totalAmount,
      paid,
      balance: booking.totalAmount - paid,
      deposit: booking.depositAmount,
      depositHeld,
      depositDue: ended ? 0 : Math.max(0, booking.depositAmount - depositHeld),
      reservationFee: booking.reservationFeeAmount ?? 0,
      pendingRental: pending.rental,
      pendingDeposit: pending.deposit,
      refundable,
    }
  }

  /**
   * Writes paid / balance / deposit held onto the booking, then moves it on
   * when the money says so: a pending booking whose reservation fee is now
   * covered is confirmed; a returned booking with nothing owed either way is
   * closed.
   */
  static async recalculate(
    ctx: HttpContext | null,
    booking: Booking,
    trx: TransactionClientContract,
    userId: string | null
  ) {
    const summary = await this.summary(booking, trx)
    if (summary.paid < 0 || summary.depositHeld < 0) {
      throw new BookingError(
        'amount',
        'That would leave more paid back than was paid in. Void the refund first.'
      )
    }
    booking.useTransaction(trx)
    booking.merge({
      paidAmount: summary.paid,
      balanceAmount: summary.balance,
      depositHeldAmount: summary.depositHeld,
    })
    await booking.save()

    if (
      booking.status === 'pending' &&
      summary.paid > 0 &&
      summary.paid >= summary.reservationFee
    ) {
      await BookingService.confirmWithin(ctx, booking, userId, trx, 'Reservation fee received')
    }
    await this.closeIfSettled(ctx, booking, trx)
    return summary
  }

  /** returned -> closed once the balance is 0 and the deposit is settled. */
  static async closeIfSettled(
    ctx: HttpContext | null,
    booking: Booking,
    trx: TransactionClientContract
  ) {
    if (
      booking.status !== 'returned' ||
      booking.balanceAmount !== 0 ||
      booking.depositHeldAmount !== 0
    ) {
      return
    }
    booking.useTransaction(trx)
    booking.status = 'closed'
    await booking.save()
    await AuditService.record(
      ctx,
      {
        action: 'booking.closed',
        subject: { type: 'booking', id: booking.id, label: booking.reference },
        before: { status: 'returned' },
        after: { status: 'closed' },
        metadata: { reason: 'Paid in full and deposit settled' },
      },
      trx
    )
  }

  /** The booking row locked for the rest of the transaction (no two payments race past the balance). */
  private static lock(bookingId: string, trx: TransactionClientContract) {
    return Booking.query({ client: trx }).where('id', bookingId).forUpdate().firstOrFail()
  }

  private static async assertRefUnused(ref: string, trx: TransactionClientContract) {
    const used = await Payment.query({ client: trx })
      .where('transaction_ref', ref)
      .whereIn('status', ['pending_verification', 'completed'])
      .preload('booking')
      .first()
    if (used) {
      throw new BookingError(
        'transactionRef',
        `Transaction ${ref} was already recorded${used.number ? ` (${used.number})` : ''} on booking ${used.booking.reference}. Each transaction can be used once.`
      )
    }
  }

  private static numberFor(type: PaymentType, trx: TransactionClientContract) {
    if (type === 'deposit_applied') return null
    return NumberingService.next(OUTGOING_TYPES.includes(type) ? 'refund' : 'receipt', trx)
  }

  /** Record money in (rent, deposit) or out (refund, deposit refund). */
  static async record(ctx: HttpContext, bookingId: string, input: RecordPaymentInput, user: User) {
    const outgoing = OUTGOING_TYPES.includes(input.type)
    if (outgoing && !(await userCan(user, 'payments.refund'))) {
      throw new BookingError('type', 'You don’t have permission to record refunds.')
    }
    const ref = normaliseRef(input.transactionRef)
    if (input.method !== 'cash' && !ref) {
      throw new BookingError(
        'transactionRef',
        input.method === 'momo' ? 'Enter the MoMo transaction ID.' : 'Enter the bank reference.'
      )
    }
    const paidAt = input.paidAt ?? DateTime.now()
    if (paidAt > DateTime.now().plus({ minutes: 5 })) {
      throw new BookingError('paidAt', 'The payment date can’t be in the future.')
    }
    // MoMo/bank money counts once someone who may verify has seen it arrive
    const completed =
      outgoing || input.method === 'cash' || (await userCan(user, 'payments.verify'))

    try {
      return await db.transaction(async (trx) => {
        const booking = await this.lock(bookingId, trx)
        const allowed = outgoing ? REFUNDABLE : PAYABLE
        if (!allowed.includes(booking.status)) {
          throw new BookingError(
            'status',
            `A ${booking.status.replaceAll('_', ' ')} booking can’t take ${outgoing ? 'refunds' : 'payments'}.`
          )
        }
        const summary = await this.summary(booking, trx)
        this.assertAmount(input.type, input.amount, summary)
        if (ref) await this.assertRefUnused(ref, trx)
        if (input.proofFileId) {
          const proof = await File.find(input.proofFileId, { client: trx })
          if (!proof || proof.purpose !== 'receipt_proof') {
            throw new BookingError('proofFileId', 'Upload the proof again.')
          }
        }

        const payment = await Payment.create(
          {
            number: completed ? await this.numberFor(input.type, trx) : null,
            bookingId: booking.id,
            customerId: booking.customerId,
            branchId: booking.branchId,
            type: input.type,
            method: input.method,
            amount: input.amount,
            transactionRef: ref,
            payerName: input.payerName?.trim() || null,
            status: completed ? 'completed' : 'pending_verification',
            paidAt,
            proofFileId: input.proofFileId ?? null,
            notes: input.notes?.trim() || null,
            recordedBy: user.id,
            verifiedBy: completed && input.method !== 'cash' && !outgoing ? user.id : null,
            verifiedAt: completed && input.method !== 'cash' && !outgoing ? DateTime.now() : null,
          },
          { client: trx }
        )
        if (input.proofFileId) {
          await File.query({ client: trx })
            .where('id', input.proofFileId)
            .update({ attachable_type: 'payment', attachable_id: payment.id })
        }
        await AuditService.record(
          ctx,
          {
            action: outgoing ? 'payment.refunded' : 'payment.recorded',
            subject: { type: 'booking', id: booking.id, label: booking.reference },
            after: {
              number: payment.number,
              type: payment.type,
              method: payment.method,
              amount: payment.amount,
              transactionRef: payment.transactionRef,
              status: payment.status,
            },
          },
          trx
        )
        if (completed) await this.recalculate(ctx, booking, trx, user.id)
        return payment
      })
    } catch (error) {
      throw this.duplicateRef(error, ref)
    }
  }

  /**
   * A payment the customer says they made (website: MoMo or bank). Always
   * waits for someone with payments.verify - nobody has seen the money yet.
   */
  static async submitByCustomer(
    ctx: HttpContext,
    bookingId: string,
    input: {
      method: 'momo' | 'bank_transfer'
      amount: number
      transactionRef: string
      payerName: string | null
      proofFileId: string | null
      customerName: string
    }
  ) {
    const ref = normaliseRef(input.transactionRef)
    if (!ref) throw new BookingError('transactionRef', 'Enter the transaction ID.')
    try {
      return await db.transaction(async (trx) => {
        const booking = await this.lock(bookingId, trx)
        const summary = await this.summary(booking, trx)
        this.assertAmount('rental', input.amount, summary)
        await this.assertRefUnused(ref, trx)
        const payment = await Payment.create(
          {
            number: null,
            bookingId: booking.id,
            customerId: booking.customerId,
            branchId: booking.branchId,
            type: 'rental',
            method: input.method,
            amount: input.amount,
            transactionRef: ref,
            payerName: input.payerName?.trim() || null,
            status: 'pending_verification',
            paidAt: DateTime.now(),
            proofFileId: input.proofFileId,
            notes: 'Submitted by the customer online',
            recordedBy: null,
          },
          { client: trx }
        )
        await AuditService.record(
          ctx,
          {
            action: 'payment.submitted',
            actorType: 'customer',
            actorLabel: input.customerName,
            subject: { type: 'booking', id: booking.id, label: booking.reference },
            after: {
              method: payment.method,
              amount: payment.amount,
              transactionRef: payment.transactionRef,
              status: payment.status,
            },
          },
          trx
        )
        return payment
      })
    } catch (error) {
      throw this.duplicateRef(error, ref)
    }
  }

  /** What this payment may be, given what's owed and held. */
  private static assertAmount(type: PaymentType, amount: number, summary: MoneySummary) {
    const fail = (message: string) => {
      throw new BookingError('amount', message)
    }
    if (amount <= 0) fail('Enter an amount above zero.')
    if (type === 'rental') {
      const due = summary.balance - summary.pendingRental
      if (due <= 0) {
        fail(
          summary.pendingRental > 0
            ? 'Nothing more is due - a payment is waiting to be verified.'
            : 'Nothing is due on this booking.'
        )
      }
      if (amount > due) fail(`Only ${money(due)} is due. Take any extra as the deposit.`)
    }
    if (type === 'deposit') {
      const due = summary.depositDue - summary.pendingDeposit
      if (summary.deposit === 0) fail('This booking has no security deposit.')
      if (due <= 0) fail('The deposit has already been taken.')
      if (amount > due) fail(`The deposit still to take is ${money(due)}.`)
    }
    if (type === 'refund') {
      if (summary.refundable <= 0) fail('There’s no rent to pay back on this booking.')
      if (amount > summary.refundable)
        fail(`At most ${money(summary.refundable)} can be paid back.`)
    }
    if (type === 'deposit_refund') {
      if (summary.depositHeld <= 0) fail('No deposit is held for this booking.')
      if (amount > summary.depositHeld) fail(`Only ${money(summary.depositHeld)} is held.`)
    }
  }

  /** The unique index caught a race on the same transaction ID. */
  private static duplicateRef(error: unknown, ref: string | null) {
    if ((error as { code?: string })?.code === '23505' && ref) {
      return new BookingError(
        'transactionRef',
        `Transaction ${ref} was already recorded. Each transaction can be used once.`
      )
    }
    return error
  }

  /**
   * After return: keep part of the deposit against what's still owed and pay
   * back the rest - in one go, so the deposit always ends at zero.
   */
  static async settleDeposit(
    ctx: HttpContext,
    bookingId: string,
    input: SettleDepositInput,
    user: User
  ) {
    const ref = normaliseRef(input.transactionRef)
    if (input.refundAmount > 0) {
      if (!input.method) throw new BookingError('method', 'Choose how the deposit is paid back.')
      if (input.method !== 'cash' && !ref) {
        throw new BookingError('transactionRef', 'Enter the transaction ID of the refund.')
      }
    }
    try {
      return await db.transaction(async (trx) => {
        const booking = await this.lock(bookingId, trx)
        if (!['returned', ...ENDED].includes(booking.status)) {
          throw new BookingError('status', 'The deposit is settled once the car is back.')
        }
        const summary = await this.summary(booking, trx)
        if (summary.depositHeld <= 0) {
          throw new BookingError('amount', 'No deposit is held for this booking.')
        }
        if (input.applyAmount < 0 || input.refundAmount < 0) {
          throw new BookingError('amount', 'Amounts can’t be negative.')
        }
        if (input.applyAmount + input.refundAmount !== summary.depositHeld) {
          throw new BookingError(
            'amount',
            `Kept and paid back must add up to the ${money(summary.depositHeld)} held.`
          )
        }
        const owed = Math.max(0, summary.balance)
        if (input.applyAmount > owed) {
          throw new BookingError(
            'applyAmount',
            owed === 0
              ? 'Nothing is owed - pay the whole deposit back.'
              : `Only ${money(owed)} is owed; pay the rest back.`
          )
        }
        if (ref) await this.assertRefUnused(ref, trx)

        const rows: Payment[] = []
        const base = {
          bookingId: booking.id,
          customerId: booking.customerId,
          branchId: booking.branchId,
          status: 'completed' as const,
          paidAt: DateTime.now(),
          notes: input.notes?.trim() || null,
          recordedBy: user.id,
        }
        if (input.applyAmount > 0) {
          rows.push(
            await Payment.create(
              {
                ...base,
                type: 'deposit_applied',
                method: 'deposit',
                amount: input.applyAmount,
                number: null,
              },
              { client: trx }
            )
          )
        }
        if (input.refundAmount > 0) {
          rows.push(
            await Payment.create(
              {
                ...base,
                type: 'deposit_refund',
                method: input.method!,
                amount: input.refundAmount,
                transactionRef: ref,
                payerName: input.payerName?.trim() || null,
                number: await this.numberFor('deposit_refund', trx),
              },
              { client: trx }
            )
          )
        }
        await AuditService.record(
          ctx,
          {
            action: 'deposit.settled',
            subject: { type: 'booking', id: booking.id, label: booking.reference },
            before: { depositHeld: summary.depositHeld },
            after: { kept: input.applyAmount, paidBack: input.refundAmount },
          },
          trx
        )
        await this.recalculate(ctx, booking, trx, user.id)
        return rows
      })
    } catch (error) {
      throw this.duplicateRef(error, ref)
    }
  }

  /** The money is in the MoMo/bank statement: it now counts. */
  static async verify(ctx: HttpContext, paymentId: string, user: User) {
    const verified = await db.transaction(async (trx) => {
      const payment = await Payment.query({ client: trx }).where('id', paymentId).firstOrFail()
      const booking = await this.lock(payment.bookingId, trx)
      if (payment.status !== 'pending_verification') {
        throw new BookingError('status', 'Only payments waiting to be verified can be verified.')
      }
      payment.useTransaction(trx)
      payment.merge({
        status: 'completed',
        number: await this.numberFor(payment.type, trx),
        verifiedBy: user.id,
        verifiedAt: DateTime.now(),
      })
      await payment.save()
      await AuditService.record(
        ctx,
        {
          action: 'payment.verified',
          subject: { type: 'booking', id: booking.id, label: booking.reference },
          after: { number: payment.number, amount: payment.amount, ref: payment.transactionRef },
        },
        trx
      )
      await this.recalculate(ctx, booking, trx, user.id)
      return { payment, booking }
    })
    // Website customers are told (after the commit, so a failed send changes nothing)
    if (verified.booking.source === 'website') {
      await BookingMessages.paymentVerified(verified.booking, verified.payment.amount)
    }
    return verified.payment
  }

  /** Not in the statement: never counted. Also frees the transaction ID. */
  static async reject(ctx: HttpContext, paymentId: string, reason: string, user: User) {
    const payment = await this.cancel(
      ctx,
      paymentId,
      reason,
      user,
      'pending_verification',
      'rejected'
    )
    const booking = await Booking.findOrFail(payment.bookingId)
    if (booking.source === 'website') {
      await BookingMessages.paymentNotFound(booking, payment.transactionRef)
    }
    return payment
  }

  /** Recorded by mistake: stops counting, kept on record. */
  static async void(ctx: HttpContext, paymentId: string, reason: string, user: User) {
    return this.cancel(ctx, paymentId, reason, user, 'completed', 'void')
  }

  private static async cancel(
    ctx: HttpContext,
    paymentId: string,
    reason: string,
    user: User,
    from: PaymentStatus,
    to: 'rejected' | 'void'
  ) {
    return db.transaction(async (trx) => {
      const payment = await Payment.query({ client: trx }).where('id', paymentId).firstOrFail()
      const booking = await this.lock(payment.bookingId, trx)
      if (payment.status !== from) {
        throw new BookingError(
          'status',
          to === 'void'
            ? 'Only completed payments can be voided.'
            : 'Only payments waiting to be verified can be rejected.'
        )
      }
      if (booking.status === 'closed') {
        throw new BookingError('status', 'This booking is closed; its payments can’t change.')
      }
      payment.useTransaction(trx)
      payment.merge({
        status: to,
        voidedBy: user.id,
        voidedAt: DateTime.now(),
        voidReason: reason,
      })
      await payment.save()
      await AuditService.record(
        ctx,
        {
          action: to === 'void' ? 'payment.voided' : 'payment.rejected',
          subject: { type: 'booking', id: booking.id, label: booking.reference },
          before: { status: from },
          after: { status: to, number: payment.number, amount: payment.amount },
          metadata: { reason },
        },
        trx
      )
      if (to === 'void') await this.recalculate(ctx, booking, trx, user.id)
      return payment
    })
  }
}
