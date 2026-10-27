import { DateTime } from 'luxon'
import Business from '#models/business'
import Car from '#models/car'
import CreditNote from '#models/credit_note'
import Invoice from '#models/invoice'
import InvoiceService from '#services/invoices/invoice_service'
import { footerLine, letterhead } from '#services/pdf/letterhead'
import { type Fact, PdfDocument } from '#services/pdf/pdf_document'

const money = PdfDocument.money

const quantity = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(2))

/**
 * Invoice (INV-) and credit note (CN-) PDFs in the house style (M5.6).
 * Built on request from what was saved when the document was issued; only
 * "paid so far" on an invoice is read from the booking as it is now. A
 * cancelled invoice carries a red CANCELLED stamp.
 */
export default class InvoicePdfService {
  static async invoice(invoiceId: string): Promise<Buffer> {
    const invoice = await Invoice.query()
      .where('id', invoiceId)
      .preload('booking')
      .preload('creditNote')
      .firstOrFail()
    const { booking } = invoice
    const [business, car] = await Promise.all([
      Business.query().preload('logo').first(),
      Car.findOrFail(booking.carId),
    ])
    const zone = business?.timezone || 'Africa/Accra'
    const today = DateTime.now().setZone(zone).toISODate()!
    const standing = InvoiceService.standing(invoice, booking, today)
    const credited = invoice.status === 'credited'
    const { billTo } = invoice

    const pdf = new PdfDocument({
      title: 'Invoice',
      reference: invoice.number,
      letterhead: await letterhead(business),
      footer: footerLine(business),
      stamp: credited ? 'CANCELLED' : undefined,
    })
    pdf.header(
      credited
        ? `Cancelled by ${invoice.creditNote?.number ?? 'credit note'}`
        : standing.state === 'paid'
          ? 'Paid'
          : `Due ${invoice.dueOn.toFormat('d LLL yyyy')}`
    )

    pdf.summary([
      {
        label: 'Bill to',
        value: billTo.company || billTo.name,
        hint: billTo.company ? `Attn: ${billTo.name}` : (billTo.phone ?? ''),
      },
      {
        label: 'Issued',
        value: invoice.issuedAt.setZone(zone).toFormat('d LLL yyyy'),
        hint: `Due ${invoice.dueOn.toFormat('d LLL yyyy')}`,
      },
      {
        label: 'Booking',
        value: booking.reference,
        hint: `${car.make} ${car.model} · ${car.registrationNo}`,
      },
      {
        label: credited ? 'Invoice total' : 'Amount due',
        value: money(credited ? invoice.totalAmount : standing.balance),
        hint: credited ? 'Cancelled' : standing.paid > 0 ? `Of ${money(invoice.totalAmount)}` : '',
        strong: true,
      },
    ])

    const pickup = booking.pickupAt.setZone(zone)
    const back = booking.returnAt.setZone(zone)
    pdf.table(
      'Charges',
      invoice.lines.map((line) => ({
        label: line.description,
        note:
          line.quantity !== 1
            ? `${quantity(line.quantity)} × ${money(line.unitAmount)}`
            : undefined,
        amount: money(line.amount),
      })),
      [
        ...(invoice.taxAmount
          ? [{ label: 'Subtotal', amount: money(invoice.subtotalAmount), muted: true }]
          : []),
        ...invoice.taxes.map((tax) => ({
          label: tax.rateBp !== null ? `${tax.name} (${tax.rateBp / 100}%)` : tax.name,
          amount: money(tax.amount),
          muted: true,
        })),
        { label: 'Total', amount: money(invoice.totalAmount) },
        ...(!credited && standing.paid > 0
          ? [
              { label: 'Paid so far', amount: money(standing.paid), muted: true },
              { label: 'Balance due', amount: money(standing.balance) },
            ]
          : []),
      ],
      [
        `${pickup.toFormat('d LLL yyyy, HH:mm')} - ${back.toFormat('d LLL yyyy, HH:mm')}`,
        `${car.make} ${car.model} (${car.registrationNo})`,
      ]
    )

    pdf.factsCard(
      'Bill to',
      [
        ['Name', billTo.name],
        ['Company', billTo.company],
        ['TIN', billTo.tin],
        ['Address', billTo.address],
        ['Phone', billTo.phone],
        ['Email', billTo.email],
      ].filter(([, value]) => value) as Fact[],
      2
    )

    if (!credited && standing.balance > 0) {
      const payTo: Fact[] = [
        [
          'Mobile money',
          business?.momoNumber
            ? [business.momoNumber, business.momoNetwork?.toUpperCase(), business.momoName]
                .filter(Boolean)
                .join(' · ')
            : null,
        ],
        [
          'Bank transfer',
          business?.bankAccountNumber
            ? [
                business.bankName,
                business.bankBranch,
                business.bankAccountNumber,
                business.bankAccountName,
              ]
                .filter(Boolean)
                .join(' · ')
            : null,
        ],
        ['Reference', `${invoice.number} or ${booking.reference}`],
      ]
      pdf.factsCard(
        'How to pay',
        payTo.filter(([, value]) => value),
        1
      )
    }
    if (invoice.notes) pdf.factsCard('Notes', [['', invoice.notes]], 1)
    if (credited && invoice.creditNote) {
      pdf.factsCard(
        'Cancelled',
        [
          ['Credit note', invoice.creditNote.number],
          ['Reason', invoice.creditNote.reason],
        ],
        2
      )
    }
    return pdf.finish()
  }

  static async creditNote(creditNoteId: string): Promise<Buffer> {
    const note = await CreditNote.query()
      .where('id', creditNoteId)
      .preload('invoice', (query) => query.preload('booking'))
      .firstOrFail()
    const { invoice } = note
    const business = await Business.query().preload('logo').first()
    const zone = business?.timezone || 'Africa/Accra'
    const { billTo } = invoice

    const pdf = new PdfDocument({
      title: 'Credit note',
      reference: note.number,
      letterhead: await letterhead(business),
      footer: footerLine(business),
    })
    pdf.header(`Issued ${note.issuedAt.setZone(zone).toFormat('d LLL yyyy')}`)
    pdf.summary([
      {
        label: 'Credited to',
        value: billTo.company || billTo.name,
        hint: billTo.company ? `Attn: ${billTo.name}` : (billTo.phone ?? ''),
      },
      {
        label: 'Cancels invoice',
        value: invoice.number,
        hint: invoice.issuedAt.setZone(zone).toFormat('d LLL yyyy'),
      },
      { label: 'Booking', value: invoice.booking.reference },
      { label: 'Amount credited', value: money(note.totalAmount), strong: true },
    ])
    pdf.table(
      'Credited',
      [
        {
          label: `Invoice ${invoice.number} cancelled in full`,
          note: note.reason,
          amount: money(note.subtotalAmount),
        },
      ],
      [
        ...(note.taxAmount
          ? [{ label: 'Tax credited', amount: money(note.taxAmount), muted: true }]
          : []),
        { label: 'Total credited', amount: money(note.totalAmount) },
      ],
      ['Any money paid stays on the booking and counts towards a new invoice']
    )
    return pdf.finish()
  }
}
