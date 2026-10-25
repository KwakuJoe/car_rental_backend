import { ulid } from 'ulid'
import { BaseModel, beforeCreate } from '@adonisjs/lucid/orm'
import type { NormalizeConstructor } from '@adonisjs/core/types/helpers'

/**
 * Mixin that assigns a ULID to a model's `id` column before it's created,
 * since these tables use ULID primary keys instead of auto-increment
 * integers (sortable by creation time, but globally unique like a UUID).
 *
 * @example
 * export default class Role extends compose(RoleSchema, withUlid) {}
 */
export function withUlid<Model extends NormalizeConstructor<typeof BaseModel>>(superclass: Model) {
  class WithUlid extends superclass {
    // Without this, Lucid assumes the "id" column is auto-increment and
    // overwrites whatever `assignUlid` sets with the driver's
    // lastInsertRowid after the insert.
    static selfAssignPrimaryKey = true

    @beforeCreate()
    static assignUlid(model: InstanceType<typeof BaseModel> & { id?: string | null }) {
      if (!model.id) {
        model.id = ulid()
      }
    }
  }

  return WithUlid
}
