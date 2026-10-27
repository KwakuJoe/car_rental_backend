import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import Booking, { type BookingStatus } from '#models/booking'
import BookingCharge from '#models/booking_charge'
import Business from '#models/business'
import CreditNote from '#models/credit_note'
import Invoice, { type InvoiceBillTo, type InvoiceLine, type InvoiceTax } from '#models/invoice'
import type User from '#models/user'
import { BookingError } from '#services/bookings/booking_service'
import NumberingService from '#services/numbering_service'

/** Bookings that can be invoiced: held (to pay against) through to closed */
export const INVOICEABLE: BookingStatus[] = [
  'pending',
  'confirmed',
  'on_rent',
  'returned',
  'closed',
]

export type InvoiceDraft = {
  billTo: InvoiceBillTo
  lines: InvoiceLine[]
  taxes: InvoiceTax[]
  subtotal: number
  tax: number
  total: number
}

export type InvoiceStanding = {
  state: 'credited' | 'paid' | 'part_paid' | 'overdue' | 'unpaid'
  paid: number
  balance: number
  /** The booking's total has changed since this invoice was issued */
  outOfDate: boolean
}

const sum = <T>(items: T[], value: (item: T) => number) =>
  items.reduce((total, item) => total + value(item), 0)

/**
 * Invoices and credit notes (M5.6). An invoice copies the booking's charges
 * as they are when it's issued: the price lines, any return charges that
 * weren't waived, and - when dates or the car changed since - one line for
 * the difference, so it always adds up to the booking total. One live
 * invoice per booking; to correct it, cancel it with a credit note and
 * issue a new one. Payments stay on the booking.
 */
export default class InvoiceService {
  static async draft(booking: Booking): Promise<InvoiceDraft> {
    await booking.load('customer')
    const charges = await BookingCharge.query()
      .where('booking_id', booking.id)
      .where('status', 'accepted')
      .orderBy('created_at')
    const snapshot = booking.priceSnapshot
    const lines: InvoiceLine[] = [
      ...(snapshot?.lines ?? []).map((line) => ({
        description: line.label,
        quantity: line.quantity,
        unitAmount: line.unitAmount,
        amount: line.amount,
      })),
      ...charges.map((charge) => ({
        description: charge.label,
        quantity: Number(charge.quantity),
        unitAmount: charge.unitAmount,
        amount: charge.amount,
      })),
    ].filter((line) => line.amount !== 0)
    const net = booking.totalAmount - booking.taxAmount
    const difference = net - sum(lines, (line) => line.amount)
    if (difference !== 0) {
      lines.push({
        description: 'Changes to the booking (dates, car or return)',
        quantity: 1,
        unitAmount: difference,
        amount: difference,
      })
    }

    const taxes = new Map<string, InvoiceTax>()
    for (const tax of snapshot?.taxes ?? []) {
      const key = `${tax.name}|${tax.rateBp}`
      const line = taxes.get(key) ?? { name: tax.name, rateBp: tax.rateBp, amount: 0 }
      line.amount += tax.amount
      taxes.set(key, line)
    }
    const quotedTax = sum([...taxes.values()], (line) => line.amount)
    if (booking.taxAmount - quotedTax !== 0) {
      taxes.set('other', {
        name: 'Tax on later charges',
        rateBp: null,
        amount: booking.taxAmount - quotedTax,
      })
    }

    const customer = booking.customer
    return {
      billTo: {
        name: customer.fullName,
        company: customer.type === 'corporate_driver' ? customer.employer || null : null,
        tin: null,
        address: customer.residentialAddress || customer.digitalAddress || null,
        phone: customer.phone,
        email: customer.email,
      },
      lines,
      taxes: [...taxes.values()].filter((line) => line.amount !== 0),
      subtotal: net,
      tax: booking.taxAmount,
      total: booking.totalAmount,
    }
  }

  static async issue(
    bookingId: string,
    input: { billTo: InvoiceBillTo; dueOn: DateTime; notes: string | null },
    user: User
  ) {
    return db.transaction(async (trx) => {
      const booking = await Booking.query({ client: trx })
        .where('id', bookingId)
        .forUpdate()
        .firstOrFail()
      if (!INVOICEABLE.includes(booking.status)) {
        throw new BookingError(
          'status',
          'Only held, confirmed and finished bookings can be invoiced.'
        )
      }
      if (booking.totalAmount <= 0) {
        throw new BookingError('status', 'There’s nothing to invoice on this booking.')
      }
      const live = await Invoice.query({ client: trx })
        .where('booking_id', booking.id)
        .where('status', 'issued')
        .first()
      if (live) {
        throw new BookingError(
          'status',
          `This booking already has invoice ${live.number}. Cancel it with a credit note first.`,
          409
        )
      }
      const draft = await this.draft(booking)
      const business = await Business.query({ client: trx }).first()
      const zone = business?.timezone || 'Africa/Accra'
      const now = DateTime.now()
      if (input.dueOn.toISODate()! < now.setZone(zone).toISODate()!) {
        throw new BookingError('dueOn', 'The due date can’t be before today.')
      }
      return Invoice.create(
        {
          number: await NumberingService.next('invoice', trx),
          branchId: booking.branchId,
          bookingId: booking.id,
          customerId: booking.customerId,
          billTo: input.billTo,
          lines: draft.lines,
          taxes: draft.taxes,
          subtotalAmount: draft.subtotal,
          taxAmount: draft.tax,
          totalAmount: draft.total,
          issuedAt: now,
          dueOn: input.dueOn,
          notes: input.notes,
          status: 'issued',
          issuedBy: user.id,
        },
        { client: trx }
      )
    })
  }

  /** Cancels the invoice in full; the booking can then be invoiced again. */
  static async credit(invoiceId: string, reason: string, user: User) {
    return db.transaction(async (trx) => {
      const invoice = await Invoice.query({ client: trx })
        .where('id', invoiceId)
        .forUpdate()
        .firstOrFail()
      if (invoice.status !== 'issued') {
        throw new BookingError('status', 'This invoice has already been cancelled.', 409)
      }
      const note = await CreditNote.create(
        {
          number: await NumberingService.next('credit_note', trx),
          invoiceId: invoice.id,
          subtotalAmount: invoice.subtotalAmount,
          taxAmount: invoice.taxAmount,
          totalAmount: invoice.totalAmount,
          reason,
          issuedAt: DateTime.now(),
          issuedBy: user.id,
        },
        { client: trx }
      )
      invoice.useTransaction(trx)
      invoice.status = 'credited'
      await invoice.save()
      return { invoice, note }
    })
  }

  /** Paid / balance from the booking (payments are recorded there), as of now. */
  static standing(invoice: Invoice, booking: Booking, today: string): InvoiceStanding {
    const outOfDate = invoice.status === 'issued' && booking.totalAmount !== invoice.totalAmount
    if (invoice.status === 'credited') return { state: 'credited', paid: 0, balance: 0, outOfDate }
    const paid = Math.max(0, Math.min(booking.paidAmount, invoice.totalAmount))
    const balance = invoice.totalAmount - paid
    const state =
      balance <= 0
        ? 'paid'
        : invoice.dueOn.toISODate()! < today
          ? 'overdue'
          : paid > 0
            ? 'part_paid'
            : 'unpaid'
    return { state, paid, balance, outOfDate }
  }
}
