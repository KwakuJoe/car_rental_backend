import { TermsVersionSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { withUlid } from '#models/mixins/with_ulid'

/** Rental terms customers sign. Never edited - a change is a new version. */
export default class TermsVersion extends compose(TermsVersionSchema, withUlid) {
  static current() {
    return this.query().orderBy('version', 'desc').first()
  }
}
