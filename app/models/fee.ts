import { FeeSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { withUlid } from '#models/mixins/with_ulid'

export default class Fee extends compose(FeeSchema, withUlid) {}

/** percent: amount in basis points (1000 = 10%) */
export const FEE_UNITS = ['flat', 'per_hour', 'per_day', 'per_litre', 'per_km', 'percent'] as const
