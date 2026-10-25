import vine from '@vinejs/vine'
import { paginationFields } from '#validators/shared'

export const roleFilterValidator = vine.create({
  ...paginationFields,
  search: vine.string().optional(),
  isSystem: vine.boolean().optional(),
  isSuperAdmin: vine.boolean().optional(),
  sortBy: vine.enum(['name', 'slug', 'createdAt'] as const).optional(),
})

/**
 * `isSuperAdmin` is intentionally not settable through these validators -
 * that flag is only ever set by the `business:create` bootstrap command, so
 * granting it can't become a privilege-escalation path through the API.
 */
export const createRoleValidator = vine.create({
  name: vine.string().minLength(2).maxLength(80),
  slug: vine
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    .unique({ table: 'roles', column: 'slug' }),
  description: vine.string().maxLength(255).nullable(),
})

export const updateRoleValidator = vine.create({
  name: vine.string().minLength(2).maxLength(80).optional(),
  description: vine.string().maxLength(255).nullable().optional(),
})

export const syncRolePermissionsValidator = vine.create({
  permissionIds: vine.array(vine.string().exists({ table: 'permissions', column: 'id' })),
})
