import { CustomerSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Branch from '#models/branch'
import CustomerIdentity from '#models/customer_identity'
import User from '#models/user'
import { withUlid } from '#models/mixins/with_ulid'

export const CUSTOMER_TYPES = ['individual', 'corporate_driver'] as const
export const CUSTOMER_SOURCES = [
  'walk_in',
  'phone',
  'whatsapp',
  'website',
  'referral',
  'social_media',
  'corporate',
  'other',
] as const
/** unverified | id_verified (ID only - enough for chauffeur rentals) | verified (ID + licence) */
export const VERIFICATION_STATUSES = ['unverified', 'id_verified', 'verified'] as const
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number]

export default class Customer extends compose(CustomerSchema, withUlid) {
  @belongsTo(() => Branch)
  declare branch: BelongsTo<typeof Branch>

  @hasMany(() => CustomerIdentity)
  declare identities: HasMany<typeof CustomerIdentity>

  @belongsTo(() => User, { foreignKey: 'createdBy' })
  declare creator: BelongsTo<typeof User>
}
