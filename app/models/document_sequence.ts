import { DocumentSequenceSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { withUlid } from '#models/mixins/with_ulid'

export default class DocumentSequence extends compose(DocumentSequenceSchema, withUlid) {}
