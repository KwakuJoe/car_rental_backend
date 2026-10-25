import vine from '@vinejs/vine'
import { paginationFields } from '#validators/shared'

/**
 * Shared rules for email and password.
 */
const email = () => vine.string().email().maxLength(254)
const password = () => vine.string().minLength(8).maxLength(32)

/**
 * Validator to use before validating user credentials
 * during login
 */
export const loginValidator = vine.create({
  email: email(),
  password: vine.string(),
})

/**
 * Validator for a logged-in user changing their own password
 * (also used to clear a forced temporary-password reset).
 */
export const changePasswordValidator = vine.create({
  currentPassword: vine.string(),
  password: password(),
  passwordConfirmation: password().sameAs('password'),
})

/**
 * Validator for an admin creating a new staff user. There is no public
 * signup - accounts are only ever created this way or via `business:create`.
 * If branchIds is omitted or empty, the user is assigned to the main branch.
 */
export const createStaffUserValidator = vine.create({
  fullName: vine.string().nullable(),
  email: email().unique({ table: 'users', column: 'email' }),
  phone: vine.string().maxLength(20).nullable().optional(),
  roleId: vine.string().exists({ table: 'roles', column: 'id' }),
  branchIds: vine.array(vine.string().exists({ table: 'branches', column: 'id' })).optional(),
})

/**
 * Validator for an admin updating a staff user - role, active status,
 * branch assignments, and per-user permission overrides. Every field is optional; only the
 * ones provided get changed.
 */
export const updateStaffUserValidator = vine.create({
  roleId: vine.string().exists({ table: 'roles', column: 'id' }).optional(),
  isActive: vine.boolean().optional(),
  branchIds: vine
    .array(vine.string().exists({ table: 'branches', column: 'id' }))
    .minLength(1)
    .optional(),
  permissionsOverride: vine.record(vine.boolean()).nullable().optional(),
})

export const userFilterValidator = vine.create({
  ...paginationFields,
  search: vine.string().optional(),
  roleId: vine.string().optional(),
  branchId: vine.string().optional(),
  isActive: vine.boolean().optional(),
  mustResetPassword: vine.boolean().optional(),
  createdFrom: vine.string().optional(),
  createdTo: vine.string().optional(),
  sortBy: vine.enum(['fullName', 'email', 'createdAt', 'lastLoginAt'] as const).optional(),
})
