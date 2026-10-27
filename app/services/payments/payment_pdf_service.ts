import Business from '#models/business'
import Car from '#models/car'
import Payment, { OUTGOING_TYPES, type PaymentMethod, type PaymentType } from '#models/payment'
import { BookingError } from '#services/bookings/booking_service'
import { footerLine, letterhead } from '#services/pdf/letterhead'
import { PdfDocument } from '#services/pdf/pdf_document'

const money = PdfDocument.money

const TYPE_LABEL: Record<PaymentType, string> = {
  rental: 'Rental payment',
  deposit: 'Security deposit (refundable)',
  refund: 'Rent paid back',
  deposit_refund: 'Security deposit paid back',
  deposit_applied: 'Deposit kept against the balance',
}

const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: 'Cash',
  momo: 'Mobile money',
  bank_transfer: 'Bank transfer',
  deposit: 'From the deposit',
}

/**
 * Receipts (money in, RCT-) and refund notes (money out, RFD-) in the house
 * style (M5.6). Built on request from the payment and its booking; the
 * figures under it are as at this payment (later payments don't change an
 * old receipt). A voided payment's receipt carries a red VOID stamp.
 */
export default class PaymentPdfService {
  static async receipt(paymentId: string): Promise<Buffer> {
    const payment = await Payment.query()
      .where('id', paymentId)
      .preload('booking')
      .preload('customer')
      .preload('recorder')
      .preload('verifier')
      .firstOrFail()
    if (!payment.number) {
      throw new BookingError('status', 'The receipt is issued once the payment has been verified.')
    }
    const { booking, customer } = payment
    const [business, car, earlier] = await Promise.all([
      Business.query().preload('logo').first(),
      Car.findOrFail(booking.carId),
      // Everything that counted up to and including this payment
      Payment.query()
        .where('booking_id', booking.id)
        .where('status', 'completed')
        .where('created_at', '<=', payment.createdAt.toSQL()!),
    ])
    const zone = business?.timezone || 'Africa/Accra'
    const when = (format: string) => payment.paidAt.setZone(zone).toFormat(format)
    const sum = (...types: PaymentType[]) =>
      earlier
        .filter((row) => types.includes(row.type))
        .reduce((total, row) => total + row.amount, 0)
    const paidToDate = sum('rental', 'deposit_applied') - sum('refund')
    const depositHeld = sum('deposit') - sum('deposit_refund', 'deposit_applied')

    const outgoing = OUTGOING_TYPES.includes(payment.type)
    const isDeposit = payment.type === 'deposit' || payment.type === 'deposit_refund'
    const voided = payment.status === 'void'
    const methodText = [METHOD_LABEL[payment.method], payment.transactionRef]
      .filter(Boolean)
      .join(' · ')

    const pdf = new PdfDocument({
      title: outgoing ? 'Refund' : 'Receipt',
      reference: payment.number,
      letterhead: await letterhead(business),
      footer: footerLine(business),
      stamp: voided ? 'VOID' : undefined,
    })
    pdf.header(voided ? 'Void' : `${outgoing ? 'Paid back' : 'Paid'} ${when('d LLL yyyy')}`)

    pdf.summary([
      {
        label: outgoing ? 'Paid to' : 'Received from',
        value: payment.payerName && outgoing ? payment.payerName : customer.fullName,
        hint: customer.phone,
      },
      {
        label: 'Booking',
        value: booking.reference,
        hint: `${car.make} ${car.model} · ${car.registrationNo}`,
      },
      { label: 'Method', value: METHOD_LABEL[payment.method], hint: payment.transactionRef ?? '' },
      {
        label: outgoing ? 'Amount paid back' : 'Amount received',
        value: money(payment.amount),
        hint: TYPE_LABEL[payment.type],
        strong: true,
      },
    ])

    const pickup = booking.pickupAt.setZone(zone)
    const back = booking.returnAt.setZone(zone)
    const period = pickup.hasSame(back, 'day')
      ? back.toFormat('d LLL yyyy')
      : `${pickup.toFormat('d LLL')} - ${back.toFormat('d LLL yyyy')}`
    pdf.table(
      outgoing ? 'Refund' : 'Payment',
      [
        {
          label: `${TYPE_LABEL[payment.type]} - ${booking.reference}`,
          note: `${car.make} ${car.model} (${car.registrationNo}), ${period}${payment.notes ? `. ${payment.notes}` : ''}`,
          amount: money(payment.amount),
        },
      ],
      isDeposit
        ? [
            { label: 'Deposit required', amount: money(booking.depositAmount), muted: true },
            { label: 'Deposit held after this', amount: money(depositHeld) },
          ]
        : [
            { label: 'Booking total', amount: money(booking.totalAmount), muted: true },
            { label: 'Paid to date', amount: money(paidToDate), muted: true },
            {
              label: 'Balance after this payment',
              amount: money(booking.totalAmount - paidToDate),
            },
          ],
      isDeposit
        ? ['The security deposit is refundable and is not part of the rental price']
        : depositHeld > 0
          ? [`Security deposit held: ${money(depositHeld)}`]
          : []
    )

    pdf.factsCard(
      'Details',
      [
        [outgoing ? 'Paid back on' : 'Paid on', when('ccc d LLL yyyy, HH:mm')],
        ['Method', methodText],
        [
          outgoing ? 'Paid by' : 'Received by',
          payment.recorder?.fullName ?? payment.recorder?.email ?? null,
        ],
        ...(payment.method === 'momo' || payment.method === 'bank_transfer'
          ? ([
              [outgoing ? 'Sent to' : 'Sent from', payment.payerName],
              [
                'Checked against the statement by',
                payment.verifier?.fullName ?? payment.verifier?.email ?? null,
              ],
            ] as [string, string | null][])
          : []),
        ...(voided ? ([['Voided', payment.voidReason]] as [string, string | null][]) : []),
      ],
      2
    )
    return pdf.finish()
  }
}
