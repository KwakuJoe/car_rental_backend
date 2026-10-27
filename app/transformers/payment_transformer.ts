import type Payment from '#models/payment'
import type User from '#models/user'

const person = (user: User | null | undefined) =>
  user ? { id: user.id, name: user.fullName || user.email } : null

/**
 * A payment for the dashboard. The booking page preloads the staff relations;
 * the payments list also preloads booking + customer.
 */
export function paymentToJson(payment: Payment) {
  const loaded = payment.$preloaded
  return {
    id: payment.id,
    number: payment.number,
    bookingId: payment.bookingId,
    type: payment.type,
    method: payment.method,
    amount: payment.amount,
    transactionRef: payment.transactionRef,
    payerName: payment.payerName,
    status: payment.status,
    paidAt: payment.paidAt.toISO(),
    proofFileId: payment.proofFileId,
    notes: payment.notes,
    recordedBy: loaded.recorder ? person(payment.recorder) : null,
    verifiedBy: loaded.verifier ? person(payment.verifier) : null,
    verifiedAt: payment.verifiedAt?.toISO() ?? null,
    voidedBy: loaded.voider ? person(payment.voider) : null,
    voidedAt: payment.voidedAt?.toISO() ?? null,
    voidReason: payment.voidReason,
    booking: loaded.booking
      ? {
          id: payment.booking.id,
          reference: payment.booking.reference,
          status: payment.booking.status,
        }
      : undefined,
    customer: loaded.customer
      ? {
          id: payment.customer.id,
          fullName: payment.customer.fullName,
          phone: payment.customer.phone,
        }
      : undefined,
    createdAt: payment.createdAt.toISO(),
  }
}
