import { SettingSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { column } from '@adonisjs/lucid/orm'
import { withUlid } from '#models/mixins/with_ulid'

/** A stored override of a business rule - see app/services/settings/definitions.ts. */
export default class Setting extends compose(SettingSchema, withUlid) {
  /**
   * jsonb holding a scalar (25, true, "full_to_full"). Encode explicitly -
   * the pg driver would send a bare string as text, which isn't valid JSON.
   */
  @column({ prepare: (value: unknown) => JSON.stringify(value) })
  declare value: unknown
}
