import { BookingChargeSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { withUlid } from '#models/mixins/with_ulid'

export const CHARGE_CODES = [
  'excess_km',
  'fuel',
  'refuel_service',
  'late_hours',
  'late_days',
  'damage',
  'missing_item',
  'cleaning',
  'smoking',
  'traffic_fine',
  'other',
] as const
export type ChargeCode = (typeof CHARGE_CODES)[number]

/** quantity is NUMERIC (comes back as a string) - convert with Number() when reading. */
export default class BookingCharge extends compose(BookingChargeSchema, withUlid) {}
