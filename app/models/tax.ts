import { TaxSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { column } from '@adonisjs/lucid/orm'
import { withUlid } from '#models/mixins/with_ulid'

/** The types of charge a tax can apply to - taxes never attach to individual cars. */
export const CHARGE_TYPES = ['rental', 'extras', 'protection', 'delivery', 'fees'] as const
export type ChargeType = (typeof CHARGE_TYPES)[number]

/** on_net: on the charge itself; on_net_plus_levies: on the charge plus the on_net taxes */
export const TAX_CALCULATIONS = ['on_net', 'on_net_plus_levies'] as const
export type TaxCalculation = (typeof TAX_CALCULATIONS)[number]

export default class Tax extends compose(TaxSchema, withUlid) {
  // jsonb: encode explicitly (the pg driver would send arrays as Postgres arrays)
  @column({ prepare: (value: unknown) => JSON.stringify(value ?? []) })
  declare appliesTo: ChargeType[]
}
