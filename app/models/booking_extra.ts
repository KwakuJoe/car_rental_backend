import { BookingExtraSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { withUlid } from '#models/mixins/with_ulid'

export default class BookingExtra extends compose(BookingExtraSchema, withUlid) {}
