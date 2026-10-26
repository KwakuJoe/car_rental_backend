import type { DateTime } from 'luxon'
import Tax, { type ChargeType } from '#models/tax'
import SettingsService from '#services/settings/settings_service'

export type TaxableLine = {
  chargeType: ChargeType
  /** pesewas; negative for discounts */
  amount: number
  /** false for items marked exempt (an extra, plan or fee) */
  taxable: boolean
}

export type TaxLine = {
  taxId: string
  name: string
  rateBp: number
  calculation: string
  /** What the tax was worked out on, pesewas */
  base: number
  amount: number
}

export type TaxResult = { lines: TaxLine[]; total: number }

const NO_TAX: TaxResult = { lines: [], total: 0 }

/**
 * Taxes (M2.10). The quote engine passes every charge line; taxes apply by
 * type of charge, rounded to the pesewa PER LINE (then summed), only while
 * the business is VAT registered. Deposits are never passed in - never taxed.
 */
export class TaxService {
  /** Active taxes in force on a day, in receipt order. */
  static activeOn(day: DateTime): Promise<Tax[]> {
    const date = day.toISODate()!
    return Tax.query()
      .where('active', true)
      .where((q) => q.whereNull('effective_from').orWhere('effective_from', '<=', date))
      .where((q) => q.whereNull('effective_to').orWhere('effective_to', '>=', date))
      .orderBy('sort_order', 'asc')
      .orderBy('name', 'asc')
  }

  /** Loads the VAT switch and the taxes in force on `day`, then calculates. */
  static async forLines(lines: TaxableLine[], day: DateTime): Promise<TaxResult> {
    if (!(await SettingsService.get('pricing.vat_registered'))) return NO_TAX
    return this.calculate(lines, await this.activeOn(day))
  }

  /**
   * Pure calculation. For each taxable line: on_net taxes on the line amount;
   * then on_net_plus_levies taxes on (line amount + that line's on_net taxes).
   */
  static calculate(lines: TaxableLine[], taxes: Tax[]): TaxResult {
    const totals = new Map<string, TaxLine>(
      taxes.map((tax) => [
        tax.id,
        {
          taxId: tax.id,
          name: tax.name,
          rateBp: tax.rateBp,
          calculation: tax.calculation,
          base: 0,
          amount: 0,
        },
      ])
    )
    const onNet = taxes.filter((tax) => tax.calculation !== 'on_net_plus_levies')
    const compound = taxes.filter((tax) => tax.calculation === 'on_net_plus_levies')

    for (const line of lines) {
      if (!line.taxable || line.amount === 0) continue
      let levies = 0
      for (const tax of onNet) {
        if (!tax.appliesTo.includes(line.chargeType)) continue
        const amount = Math.round((line.amount * tax.rateBp) / 10_000)
        levies += amount
        const total = totals.get(tax.id)!
        total.base += line.amount
        total.amount += amount
      }
      for (const tax of compound) {
        if (!tax.appliesTo.includes(line.chargeType)) continue
        const base = line.amount + levies
        const total = totals.get(tax.id)!
        total.base += base
        total.amount += Math.round((base * tax.rateBp) / 10_000)
      }
    }

    const result = taxes.map((tax) => totals.get(tax.id)!).filter((line) => line.base !== 0)
    return { lines: result, total: result.reduce((sum, line) => sum + line.amount, 0) }
  }
}

export default TaxService
