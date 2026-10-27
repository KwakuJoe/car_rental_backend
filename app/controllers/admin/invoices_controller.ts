import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import Booking from '#models/booking'
import Business from '#models/business'
import CreditNote from '#models/credit_note'
import Customer from '#models/customer'
import Invoice from '#models/invoice'
import AuditService from '#services/audit_service'
import { BookingError } from '#services/bookings/booking_service'
import InvoicePdfService from '#services/invoices/invoice_pdf_service'
import InvoiceService, { INVOICEABLE } from '#services/invoices/invoice_service'
import {
  creditNoteValidator,
  issueInvoiceValidator,
  listInvoicesValidator,
} from '#validators/invoice'

const fail = (response: HttpContext['response'], error: BookingError) =>
  response.status(error.status).send({
    message: error.message,
    code: error.code,
    errors: [{ field: error.field, rule: 'invoice', message: error.message }],
  })

async function today() {
  const business = await Business.query().first()
  const zone = business?.timezone || 'Africa/Accra'
  return { zone, today: DateTime.now().setZone(zone).toISODate()! }
}

const toJson = (invoice: Invoice, day: string) => ({
  id: invoice.id,
  number: invoice.number,
  bookingId: invoice.bookingId,
  booking: invoice.booking
    ? {
        id: invoice.booking.id,
        reference: invoice.booking.reference,
        totalAmount: invoice.booking.totalAmount,
      }
    : null,
  customerId: invoice.customerId,
  billTo: invoice.billTo,
  lines: invoice.lines,
  taxes: invoice.taxes,
  subtotalAmount: invoice.subtotalAmount,
  taxAmount: invoice.taxAmount,
  totalAmount: invoice.totalAmount,
  issuedAt: invoice.issuedAt.toISO(),
  dueOn: invoice.dueOn.toISODate(),
  notes: invoice.notes,
  status: invoice.status,
  issuedBy: invoice.issuer ? invoice.issuer.fullName || invoice.issuer.email : null,
  creditNote: invoice.creditNote
    ? {
        id: invoice.creditNote.id,
        number: invoice.creditNote.number,
        reason: invoice.creditNote.reason,
        issuedAt: invoice.creditNote.issuedAt.toISO(),
      }
    : null,
  standing: invoice.booking ? InvoiceService.standing(invoice, invoice.booking, day) : null,
})

const invoices = () => Invoice.query().preload('booking').preload('issuer').preload('creditNote')

/**
 * Invoices and credit notes (M5.6): invoices.view to see and download,
 * invoices.manage to issue one for a booking or cancel one with a credit
 * note. Issued invoices are never edited.
 */
export default class InvoicesController {
  async index({ request, response }: HttpContext) {
    const payload = await request.validateUsing(listInvoicesValidator)
    const { zone, today: day } = await today()
    const query = invoices()
    // Fully paid: the booking's payments cover the invoice
    const paidUp = (q: typeof query) =>
      q.whereExists((sub) =>
        sub
          .from('bookings')
          .whereColumn('bookings.id', 'invoices.booking_id')
          .whereRaw('bookings.paid_amount >= invoices.total_amount')
      )
    const notPaidUp = (q: typeof query) =>
      q.whereNotExists((sub) =>
        sub
          .from('bookings')
          .whereColumn('bookings.id', 'invoices.booking_id')
          .whereRaw('bookings.paid_amount >= invoices.total_amount')
      )
    if (payload.status === 'credited') query.where('status', 'credited')
    if (payload.status === 'paid') paidUp(query.where('status', 'issued'))
    if (payload.status === 'open') notPaidUp(query.where('status', 'issued'))
    if (payload.status === 'overdue')
      notPaidUp(query.where('status', 'issued')).where('due_on', '<', day)
    if (payload.search) {
      const term = `%${payload.search}%`
      query.where((q) =>
        q
          .whereILike('number', term)
          .orWhereRaw(`bill_to->>'name' ilike ?`, [term])
          .orWhereRaw(`bill_to->>'company' ilike ?`, [term])
          .orWhereIn('booking_id', Booking.query().select('id').whereILike('reference', term))
          .orWhereIn('customer_id', Customer.query().select('id').whereILike('full_name', term))
      )
    }
    if (payload.dateFrom) {
      const from = payload.dateFrom.setZone(zone, { keepLocalTime: true }).startOf('day')
      query.where('issued_at', '>=', from.toSQL()!)
    }
    if (payload.dateTo) {
      const to = payload.dateTo.setZone(zone, { keepLocalTime: true }).endOf('day')
      query.where('issued_at', '<=', to.toSQL()!)
    }
    const page = await query
      .orderBy('issued_at', 'desc')
      .paginate(payload.page ?? 1, payload.limit ?? 20)

    // Still to collect on every live invoice, whatever the filters
    const open = await notPaidUp(Invoice.query().preload('booking').where('status', 'issued'))
    const standings = open.map((invoice) => InvoiceService.standing(invoice, invoice.booking, day))
    const overdue = standings.filter((row) => row.state === 'overdue')
    return response.ok({
      message: 'Invoices fetched successfully',
      data: page.all().map((invoice) => toJson(invoice, day)),
      meta: {
        ...page.getMeta(),
        outstanding: {
          count: standings.length,
          amount: standings.reduce((total, row) => total + row.balance, 0),
          overdueCount: overdue.length,
          overdueAmount: overdue.reduce((total, row) => total + row.balance, 0),
        },
      },
    })
  }

  /** A booking's invoices (newest first) and, when it can have one, what a new one would say. */
  async forBooking({ params, response }: HttpContext) {
    const booking = await Booking.findOrFail(params.id)
    const { today: day } = await today()
    const rows = await invoices().where('booking_id', booking.id).orderBy('issued_at', 'desc')
    const live = rows.some((invoice) => invoice.status === 'issued')
    const canIssue = INVOICEABLE.includes(booking.status) && booking.totalAmount > 0 && !live
    return response.ok({
      message: 'Booking invoices',
      data: {
        invoices: rows.map((invoice) => toJson(invoice, day)),
        draft: canIssue ? await InvoiceService.draft(booking) : null,
      },
    })
  }

  async store(ctx: HttpContext) {
    const { auth, params, request, response } = ctx
    const payload = await request.validateUsing(issueInvoiceValidator)
    const booking = await Booking.findOrFail(params.id)
    try {
      const invoice = await InvoiceService.issue(
        booking.id,
        {
          billTo: {
            name: payload.billTo.name,
            company: payload.billTo.company || null,
            tin: payload.billTo.tin || null,
            address: payload.billTo.address || null,
            phone: payload.billTo.phone || null,
            email: payload.billTo.email || null,
          },
          dueOn: payload.dueOn,
          notes: payload.notes || null,
        },
        auth.getUserOrFail()
      )
      await AuditService.record(ctx, {
        action: 'invoice.issued',
        subject: { type: 'invoice', id: invoice.id, label: invoice.number },
        after: {
          bookingId: booking.id,
          totalAmount: invoice.totalAmount,
          dueOn: invoice.dueOn.toISODate(),
        },
      })
      const { today: day } = await today()
      const saved = await invoices().where('id', invoice.id).firstOrFail()
      return response.created({
        message: `Invoice ${invoice.number} issued`,
        data: toJson(saved, day),
      })
    } catch (error) {
      if (error instanceof BookingError) return fail(response, error)
      throw error
    }
  }

  async credit(ctx: HttpContext) {
    const { auth, params, request, response } = ctx
    const { reason } = await request.validateUsing(creditNoteValidator)
    const invoice = await Invoice.findOrFail(params.id)
    try {
      const { note } = await InvoiceService.credit(invoice.id, reason, auth.getUserOrFail())
      await AuditService.record(ctx, {
        action: 'invoice.credited',
        subject: { type: 'invoice', id: invoice.id, label: invoice.number },
        metadata: { creditNote: note.number, reason, totalAmount: note.totalAmount },
      })
      const { today: day } = await today()
      const saved = await invoices().where('id', invoice.id).firstOrFail()
      return response.ok({
        message: `Cancelled with credit note ${note.number}`,
        data: toJson(saved, day),
      })
    } catch (error) {
      if (error instanceof BookingError) return fail(response, error)
      throw error
    }
  }

  async pdf({ params, response }: HttpContext) {
    const invoice = await Invoice.findOrFail(params.id)
    const file = await InvoicePdfService.invoice(invoice.id)
    response.header('Content-Type', 'application/pdf')
    response.header('Content-Disposition', `inline; filename="${invoice.number}.pdf"`)
    return response.send(file)
  }

  async creditNotePdf({ params, response }: HttpContext) {
    const note = await CreditNote.findOrFail(params.id)
    const file = await InvoicePdfService.creditNote(note.id)
    response.header('Content-Type', 'application/pdf')
    response.header('Content-Disposition', `inline; filename="${note.number}.pdf"`)
    return response.send(file)
  }
}
