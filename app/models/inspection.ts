import { InspectionSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Booking from '#models/booking'
import File from '#models/file'
import InspectionPhoto from '#models/inspection_photo'
import TermsVersion from '#models/terms_version'
import User from '#models/user'
import { withUlid } from '#models/mixins/with_ulid'

export const INSPECTION_TYPES = ['check_out', 'check_in'] as const
export type InspectionType = (typeof INSPECTION_TYPES)[number]
export const CHECK_RESULTS = ['ok', 'missing', 'damaged'] as const
export type ChecklistResult = {
  itemId: string
  name: string
  result: (typeof CHECK_RESULTS)[number]
  note: string | null
}
export const PHOTO_ANGLES = [
  'front',
  'rear',
  'left',
  'right',
  'odometer',
  'fuel_gauge',
  'interior',
  'boot',
  'other',
] as const
/** The six angles required when handover.require_photos is on */
export const REQUIRED_ANGLES = ['front', 'rear', 'left', 'right', 'odometer', 'fuel_gauge'] as const

export default class Inspection extends compose(InspectionSchema, withUlid) {
  declare type: InspectionType

  @column({ prepare: (value: unknown) => JSON.stringify(value ?? []) })
  declare checklist: ChecklistResult[]

  @belongsTo(() => Booking)
  declare booking: BelongsTo<typeof Booking>

  @hasMany(() => InspectionPhoto)
  declare photos: HasMany<typeof InspectionPhoto>

  @belongsTo(() => TermsVersion)
  declare termsVersion: BelongsTo<typeof TermsVersion>

  @belongsTo(() => File, { foreignKey: 'signatureFileId' })
  declare signature: BelongsTo<typeof File>

  @belongsTo(() => User, { foreignKey: 'inspectedBy' })
  declare inspector: BelongsTo<typeof User>
}
