import { FileSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import { withUlid } from '#models/mixins/with_ulid'

const json = {
  prepare: (value: unknown) =>
    value === null || value === undefined ? null : JSON.stringify(value),
}

export const FILE_PURPOSES = [
  'car_photo',
  'category_image',
  'business_logo',
  'vehicle_document',
  'id_front',
  'id_back',
  'licence',
  'signature',
  'receipt_proof',
  'inspection_photo',
  'other',
] as const

export type FilePurpose = (typeof FILE_PURPOSES)[number]

/** Public image purposes that may be imported from a pasted link. */
export const IMPORTABLE_PURPOSES = ['car_photo', 'category_image', 'business_logo'] as const

/**
 * Purposes considered private by default under Ghana Data Protection Act 2012 (Act 843)
 * or sensitive operational business requirements.
 */
export const PRIVATE_PURPOSES: readonly FilePurpose[] = [
  'vehicle_document',
  'id_front',
  'id_back',
  'licence',
  'signature',
  'receipt_proof',
] as const

export default class File extends compose(FileSchema, withUlid) {
  @column(json)
  declare metadata: Record<string, unknown> | null

  @belongsTo(() => User, { foreignKey: 'uploadedBy' })
  declare uploader: BelongsTo<typeof User>
}
