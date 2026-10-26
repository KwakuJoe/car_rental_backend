import { ExtraSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { withUlid } from '#models/mixins/with_ulid'

export default class Extra extends compose(ExtraSchema, withUlid) {}

export const EXTRA_CHARGE_TYPES = ['per_day', 'per_rental'] as const
