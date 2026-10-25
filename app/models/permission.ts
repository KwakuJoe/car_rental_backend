import { PermissionSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { manyToMany } from '@adonisjs/lucid/orm'
import type { ManyToMany } from '@adonisjs/lucid/types/relations'
import Role from '#models/role'
import { withUlid } from '#models/mixins/with_ulid'

export default class Permission extends compose(PermissionSchema, withUlid) {
  @manyToMany(() => Role, {
    pivotTable: 'role_permissions',
  })
  declare roles: ManyToMany<typeof Role>
}
