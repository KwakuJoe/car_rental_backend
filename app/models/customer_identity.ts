import { CustomerIdentitySchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Customer from '#models/customer'
import File from '#models/file'
import User from '#models/user'
import { withUlid } from '#models/mixins/with_ulid'

/** Proof of identity */
export const ID_TYPES = ['ghana_card', 'passport', 'voter_id'] as const
/** Permission to drive (foreign visitors: home licence + IDP) */
export const LICENCE_TYPES = ['drivers_licence', 'international_driving_permit'] as const
export const IDENTITY_TYPES = [...ID_TYPES, ...LICENCE_TYPES] as const
export type IdentityType = (typeof IDENTITY_TYPES)[number]
export const IDENTITY_STATUSES = ['pending', 'verified', 'rejected'] as const

export const GHANA_CARD_PATTERN = /^GHA-\d{9}-\d$/

export default class CustomerIdentity extends compose(CustomerIdentitySchema, withUlid) {
  @belongsTo(() => Customer)
  declare customer: BelongsTo<typeof Customer>

  @belongsTo(() => File, { foreignKey: 'frontFileId' })
  declare frontFile: BelongsTo<typeof File>

  @belongsTo(() => File, { foreignKey: 'backFileId' })
  declare backFile: BelongsTo<typeof File>

  @belongsTo(() => User, { foreignKey: 'verifiedBy' })
  declare verifier: BelongsTo<typeof User>
}
