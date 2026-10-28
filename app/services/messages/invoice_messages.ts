import { DateTime } from 'luxon'
import Car from '#models/car'
import CreditNote from '#models/credit_note'
import Invoice from '#models/invoice'
import { dial, loadBrand, renderContent } from '#mails/branded_message'
import InvoiceService from '#services/invoices/invoice_service'
import MessageService from '#services/messages/message_service'
import { formatMoney } from '#helpers/money'

/**
 * Invoices and credit notes by email, the PDF attached (built when it's
 * sent). Staff choose the address - the bill-to email or another.
 */
export default class InvoiceMessages {
  static async invoice(invoiceId: string, to: string) {
    const invoice = await Invoice.query().where('id', invoiceId).preload('booking').firstOrFail()
    const { booking, billTo } = invoice
    const [{ business, brand }, car] = await Promise.all([
      loadBrand(),
      Car.findOrFail(booking.carId),
    ])
    const zone = business.timezone || 'Africa/Accra'
    const standing = InvoiceService.standing(
      invoice,
      booking,
      DateTime.now().setZone(zone).toISODate()!
    )
    const due = invoice.dueOn.toFormat('d LLL yyyy')
    const momo = business.momoNumber
      ? `${dial(business.momoNumber)}${business.momoName ? ` (${business.momoName})` : ''}`
      : null
    const bank = business.bankAccountNumber
      ? `${business.bankName ?? 'Bank'} ${business.bankAccountNumber}${business.bankAccountName ? ` (${business.bankAccountName})` : ''}`
      : null
    const paidUp = standing.balance <= 0
    const { html, text } = renderContent(
      brand,
      {
        subject: `Invoice ${invoice.number} from ${brand.name}`,
        preheader: paidUp
          ? `Invoice ${invoice.number} for booking ${booking.reference} - paid, thank you.`
          : `Invoice ${invoice.number}: ${formatMoney(standing.balance)} due by ${due}.`,
        eyebrow: { text: 'Invoice' },
        heading: `Invoice ${invoice.number}`,
        paragraphs: [
          `Hello ${billTo.name.split(/\s+/)[0]}, please find attached the invoice for booking ${booking.reference}${billTo.company ? ` (${billTo.company})` : ''}.`,
        ],
        amount: paidUp
          ? { label: 'Paid in full', value: formatMoney(invoice.totalAmount), note: 'Thank you.' }
          : {
              label: 'Amount due',
              value: formatMoney(standing.balance),
              note: `Due by ${due}. Use ${invoice.number} as the payment reference.`,
            },
        details: {
          title: paidUp ? 'Invoice' : 'How to pay',
          rows: [
            { label: 'Invoice', value: invoice.number },
            { label: 'Booking', value: booking.reference },
            { label: 'Car', value: car.publicTitle || `${car.make} ${car.model}` },
            { label: 'Total', value: formatMoney(invoice.totalAmount) },
            ...(!paidUp && momo ? [{ label: 'Mobile Money', value: momo }] : []),
            ...(!paidUp && bank ? [{ label: 'Bank transfer', value: bank }] : []),
          ],
        },
        notes: ['The invoice is attached as a PDF.'],
      },
      `You're receiving this because ${brand.name} issued you an invoice.`
    )
    return MessageService.queue({
      channel: 'email',
      to,
      kind: 'invoice',
      subject: `Invoice ${invoice.number} from ${brand.name}`,
      body: text,
      html,
      bookingId: booking.id,
      attachment: { type: 'invoice', id: invoice.id },
    })
  }

  static async creditNote(creditNoteId: string, to: string) {
    const note = await CreditNote.query()
      .where('id', creditNoteId)
      .preload('invoice', (query) => query.preload('booking'))
      .firstOrFail()
    const { invoice } = note
    const { brand } = await loadBrand()
    const { html, text } = renderContent(
      brand,
      {
        subject: `Credit note ${note.number} - invoice ${invoice.number} cancelled`,
        preheader: `Invoice ${invoice.number} has been cancelled.`,
        eyebrow: { text: 'Credit note' },
        heading: `Invoice ${invoice.number} is cancelled`,
        paragraphs: [
          `Hello ${invoice.billTo.name.split(/\s+/)[0]}, invoice ${invoice.number} for booking ${invoice.booking.reference} has been cancelled with credit note ${note.number}, attached.`,
          'Anything you have paid stays on the booking. If a corrected invoice is needed, it will follow separately.',
        ],
        amount: { label: 'Credited', value: formatMoney(note.totalAmount), note: note.reason },
      },
      `You're receiving this because ${brand.name} issued you an invoice.`
    )
    return MessageService.queue({
      channel: 'email',
      to,
      kind: 'credit_note',
      subject: `Credit note ${note.number} - invoice ${invoice.number} cancelled`,
      body: text,
      html,
      bookingId: invoice.bookingId,
      attachment: { type: 'credit_note', id: note.id },
    })
  }
}
