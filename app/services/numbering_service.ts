import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'
import { ulid } from 'ulid'
import Business from '#models/business'

export type DocumentType =
  'booking' | 'receipt' | 'refund' | 'invoice' | 'credit_note' | 'job_card' | 'incident'

/** Receipts, refund notes, invoices and credit notes have their own series; bookings use the business prefix. */
const SERIES_PREFIX: Partial<Record<DocumentType, string>> = {
  receipt: 'RCT',
  refund: 'RFD',
  invoice: 'INV',
  credit_note: 'CN',
  job_card: 'JC',
  incident: 'INC',
}

/**
 * Document numbers (M1.7): WYK-2026-00123 - business prefix, year, 5-digit
 * number restarting each year. Receipts RCT-2026-00001, refunds RFD-2026-00001,
 * invoices INV-2026-00001, credit notes CN-2026-00001. Taken inside the caller's transaction with the
 * counter row locked (SELECT ... FOR UPDATE), so concurrent bookings never get
 * the same number and a rolled-back booking leaves no gap.
 */
export default class NumberingService {
  static async next(type: DocumentType, trx: TransactionClientContract): Promise<string> {
    const business = await Business.query({ client: trx }).first()
    const zone = business?.timezone || 'Africa/Accra'
    const prefix = SERIES_PREFIX[type] ?? (business?.documentPrefix || 'WYK')
    const year = DateTime.now().setZone(zone).year

    const now = new Date()
    await trx.rawQuery(
      `INSERT INTO document_sequences (id, type, year, next_value, created_at, updated_at)
       VALUES (?, ?, ?, 1, ?, ?) ON CONFLICT (type, year) DO NOTHING`,
      [ulid(), type, year, now, now]
    )

    const row = await trx.from('document_sequences').where({ type, year }).forUpdate().firstOrFail()
    const value: number = row.next_value
    await trx
      .from('document_sequences')
      .where({ type, year })
      .update({ next_value: value + 1, updated_at: now })

    return `${prefix}-${year}-${String(value).padStart(5, '0')}`
  }
}
