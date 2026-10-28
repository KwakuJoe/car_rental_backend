import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import Booking from '#models/booking'
import Business from '#models/business'
import CreditNote from '#models/credit_note'
import Customer from '#models/customer'
import Invoice from '#models/invoice'
import OutboundMessage from '#models/outbound_message'
import AuditService from '#services/audit_service'
import { BookingError } from '#services/bookings/booking_service'
import InvoicePdfService from '#services/invoices/invoice_pdf_service'
import InvoiceService, { INVOICEABLE } from '#services/invoices/invoice_service'
import InvoiceMessages from '#services/messages/invoice_messages'
import {
  creditNoteValidator,
  issueInvoiceValidator,
  listInvoicesValidator,
  sendInvoiceValidator,
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

type Emailed = {
  to: string
  document: 'invoice' | 'credit_note'
  status: string
  sentAt: string | null
  createdAt: string
  error: string | null
}

/** Each invoice's emails (the invoice and its credit note), newest first */
async function emailsFor(rows: Invoice[]) {
  const ids = rows.flatMap((invoice) =>
    [invoice.id, invoice.creditNote?.id].filter(Boolean)
  ) as string[]
  const messages = ids.length
    ? await OutboundMessage.query()
        .where('channel', 'email')
        .whereRaw(`attachment->>'id' = any(?)`, [ids])
        .orderBy('created_at', 'desc')
    : []
  return (invoice: Invoice): Emailed[] =>
    messages
      .filter(
        (message) =>
          message.attachment?.id === invoice.id || message.attachment?.id === invoice.creditNote?.id
      )
      .map((message) => ({
        to: message.to,
        document: message.attachment!.type,
        status: message.status,
        sentAt: message.sentAt?.toISO() ?? null,
        createdAt: message.createdAt.toISO()!,
        error:
          message.status === 'failed' || message.status === 'skipped' ? message.lastError : null,
      }))
}

const toJson = (invoice: Invoice, day: string, emails: Emailed[] = []) => ({
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
  emails,
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
    const emails = await emailsFor(page.all())

    // Still to collect on every live invoice, whatever the filters
    const open = await notPaidUp(Invoice.query().preload('booking').where('status', 'issued'))
    const standings = open.map((invoice) => InvoiceService.standing(invoice, invoice.booking, day))
    const overdue = standings.filter((row) => row.state === 'overdue')
    return response.ok({
      message: 'Invoices fetched successfully',
      data: page.all().map((invoice) => toJson(invoice, day, emails(invoice))),
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
    const emails = await emailsFor(rows)
    const live = rows.some((invoice) => invoice.status === 'issued')
    const canIssue = INVOICEABLE.includes(booking.status) && booking.totalAmount > 0 && !live
    return response.ok({
      message: 'Booking invoices',
      data: {
        invoices: rows.map((invoice) => toJson(invoice, day, emails(invoice))),
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
      if (payload.sendTo) await InvoiceMessages.invoice(invoice.id, payload.sendTo)
      return response.created({
        message: `Invoice ${invoice.number} issued${payload.sendTo ? ` and emailed to ${payload.sendTo}` : ''}`,
        data: await this.fresh(invoice.id),
      })
    } catch (error) {
      if (error instanceof BookingError) return fail(response, error)
      throw error
    }
  }

  async credit(ctx: HttpContext) {
    const { auth, params, request, response } = ctx
    const { reason, sendTo } = await request.validateUsing(creditNoteValidator)
    const invoice = await Invoice.findOrFail(params.id)
    try {
      const { note } = await InvoiceService.credit(invoice.id, reason, auth.getUserOrFail())
      await AuditService.record(ctx, {
        action: 'invoice.credited',
        subject: { type: 'invoice', id: invoice.id, label: invoice.number },
        metadata: { creditNote: note.number, reason, totalAmount: note.totalAmount },
      })
      if (sendTo) await InvoiceMessages.creditNote(note.id, sendTo)
      return response.ok({
        message: `Cancelled with credit note ${note.number}`,
        data: await this.fresh(invoice.id),
      })
    } catch (error) {
      if (error instanceof BookingError) return fail(response, error)
      throw error
    }
  }

  /** Email the invoice - or, once cancelled, its credit note - with the PDF attached. */
  async send(ctx: HttpContext) {
    const { params, request, response } = ctx
    const { to } = await request.validateUsing(sendInvoiceValidator)
    const invoice = await Invoice.query().where('id', params.id).preload('creditNote').firstOrFail()
    const credited = invoice.status === 'credited' && invoice.creditNote
    if (credited) await InvoiceMessages.creditNote(invoice.creditNote.id, to)
    else await InvoiceMessages.invoice(invoice.id, to)
    await AuditService.record(ctx, {
      action: 'invoice.emailed',
      subject: { type: 'invoice', id: invoice.id, label: invoice.number },
      metadata: { to, document: credited ? invoice.creditNote.number : invoice.number },
    })
    return response.ok({
      message: `${credited ? invoice.creditNote.number : invoice.number} is on its way to ${to}`,
      data: await this.fresh(invoice.id),
    })
  }

  private async fresh(id: string) {
    const { today: day } = await today()
    const saved = await invoices().where('id', id).firstOrFail()
    const emails = await emailsFor([saved])
    return toJson(saved, day, emails(saved))
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
