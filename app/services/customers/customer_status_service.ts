import { DateTime } from 'luxon'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import BlacklistEntry, { type BlacklistSeverity } from '#models/blacklist_entry'
import Customer, { type VerificationStatus } from '#models/customer'
import CustomerIdentity, { ID_TYPES, LICENCE_TYPES } from '#models/customer_identity'

type Identifiers = { phone?: string | null; numbers?: string[] }

/**
 * Keeps a customer's denormalised status columns right: verification (from
 * their documents) and blacklist severity (from matching entries). Called
 * whenever a customer, a document or a blacklist entry changes.
 */
export class CustomerStatusService {
  /** verified = a verified, unexpired ID and licence; id_verified = ID only (chauffeur). */
  static verificationFor(identities: CustomerIdentity[], on = DateTime.now()): VerificationStatus {
    const today = on.toISODate()!
    const valid = (identity: CustomerIdentity) =>
      identity.status === 'verified' &&
      (!identity.expiresOn || identity.expiresOn.toISODate()! >= today)
    const hasId = identities.some(
      (identity) => (ID_TYPES as readonly string[]).includes(identity.type) && valid(identity)
    )
    const hasLicence = identities.some(
      (identity) => (LICENCE_TYPES as readonly string[]).includes(identity.type) && valid(identity)
    )
    if (hasId && hasLicence) return 'verified'
    return hasId ? 'id_verified' : 'unverified'
  }

  /** Active (not lifted) entries matching the customer id, phone or any document number. */
  static async matchingEntries(
    identifiers: Identifiers & { customerId?: string | null },
    trx?: TransactionClientContract
  ): Promise<BlacklistEntry[]> {
    const numbers = (identifiers.numbers ?? []).filter(Boolean)
    if (!identifiers.customerId && !identifiers.phone && numbers.length === 0) return []
    return BlacklistEntry.query(trx ? { client: trx } : undefined)
      .whereNull('lifted_at')
      .where((q) => {
        if (identifiers.customerId) q.orWhere('customer_id', identifiers.customerId)
        if (identifiers.phone) q.orWhere('phone', identifiers.phone)
        if (numbers.length) {
          q.orWhereIn('ghana_card_no', numbers)
            .orWhereIn('licence_no', numbers)
            .orWhereIn('passport_no', numbers)
        }
      })
  }

  static severityOf(entries: BlacklistEntry[]): BlacklistSeverity | null {
    if (entries.some((entry) => entry.severity === 'block')) return 'block'
    return entries.length ? 'warn' : null
  }

  /** Recompute and save both status columns for one customer. */
  static async refresh(customer: Customer, trx?: TransactionClientContract) {
    const options = trx ? { client: trx } : undefined
    const identities = await CustomerIdentity.query(options).where('customer_id', customer.id)
    const entries = await this.matchingEntries(
      {
        customerId: customer.id,
        phone: customer.phone,
        numbers: identities.map((identity) => identity.number),
      },
      trx
    )
    customer.verificationStatus = this.verificationFor(identities)
    customer.blacklistSeverity = this.severityOf(entries)
    if (trx) customer.useTransaction(trx)
    await customer.save()
    return customer
  }

  /** After a blacklist entry changes: refresh every customer it can match. */
  static async refreshMatching(entry: BlacklistEntry, trx?: TransactionClientContract) {
    const options = trx ? { client: trx } : undefined
    const numbers = [entry.ghanaCardNo, entry.licenceNo, entry.passportNo].filter(
      (value): value is string => !!value
    )
    // Nothing to match on: never fall through to an unfiltered query (all customers)
    if (!entry.customerId && !entry.phone && numbers.length === 0) return 0
    const customers = await Customer.query(options).where((q) => {
      if (entry.customerId) q.orWhere('id', entry.customerId)
      if (entry.phone) q.orWhere('phone', entry.phone)
      if (numbers.length) {
        q.orWhereIn(
          'id',
          CustomerIdentity.query(options).select('customer_id').whereIn('number', numbers)
        )
      }
    })
    for (const customer of customers) await this.refresh(customer, trx)
    return customers.length
  }
}

export default CustomerStatusService
