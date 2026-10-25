import { BaseTransformer } from '@adonisjs/core/transformers'
import type Role from '#models/role'
import PermissionTransformer from '#transformers/permission_transformer'

export default class RoleTransformer extends BaseTransformer<Role> {
  toObject() {
    return {
      ...this.pick(this.resource, [
        'id',
        'name',
        'slug',
        'description',
        'isSuperAdmin',
        'isSystem',
      ]),
      permissions: PermissionTransformer.transform(this.whenLoaded(this.resource.permissions)),
      // Only present when the query used withCount('users') (list/show).
      usersCount:
        this.resource.$extras.users_count === undefined
          ? undefined
          : Number(this.resource.$extras.users_count),
    }
  }
}
