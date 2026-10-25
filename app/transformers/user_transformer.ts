import type User from '#models/user'
import { BaseTransformer } from '@adonisjs/core/transformers'
import RoleTransformer from '#transformers/role_transformer'
import BranchTransformer from '#transformers/branch_transformer'

export default class UserTransformer extends BaseTransformer<User> {
  toObject() {
    return {
      ...this.pick(this.resource, [
        'id',
        'fullName',
        'email',
        'phone',
        'isActive',
        'mustResetPassword',
        'lastLoginAt',
        'permissionsOverride',
        'createdAt',
        'updatedAt',
        'initials',
      ]),
      // .depth(2): every transformer's Item/Collection defaults to maxDepth 1,
      // which is enough when this transformer is the serialize() root (e.g.
      // RoleTransformer.transform() directly from admin/roles endpoints) but
      // NOT when nested here two levels deep (User -> Role -> Permissions) -
      // without this, role.permissions silently disappears from the response.
      // roleId is nullable, so the item can be undefined - guard with `?.`.
      role: RoleTransformer.transform(this.whenLoaded(this.resource.role))?.depth(2),
      branches: BranchTransformer.transform(this.whenLoaded(this.resource.branches)),
    }
  }
}
