import { CarDamageSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import File from '#models/file'
import { withUlid } from '#models/mixins/with_ulid'

/** Zones of the top-view car diagram (frontend draws the same ones) */
export const DAMAGE_ZONES = [
  'front_bumper',
  'bonnet',
  'windscreen',
  'roof',
  'rear_window',
  'boot_lid',
  'rear_bumper',
  'left_front_wing',
  'left_front_door',
  'left_rear_door',
  'left_rear_wing',
  'right_front_wing',
  'right_front_door',
  'right_rear_door',
  'right_rear_wing',
  'left_mirror',
  'right_mirror',
  'wheel_front_left',
  'wheel_front_right',
  'wheel_rear_left',
  'wheel_rear_right',
  'interior',
] as const
export const DAMAGE_TYPES = ['scratch', 'dent', 'crack', 'chip', 'missing_part'] as const
export const DAMAGE_SEVERITIES = ['minor', 'moderate', 'major'] as const

export default class CarDamage extends compose(CarDamageSchema, withUlid) {
  @belongsTo(() => File, { foreignKey: 'photoFileId' })
  declare photo: BelongsTo<typeof File>
}
