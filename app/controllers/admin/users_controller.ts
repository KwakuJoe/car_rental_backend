import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import Branch from '#models/branch'
import Role from '#models/role'
import UserTransformer from '#transformers/user_transformer'
import {
  createStaffUserValidator,
  updateStaffUserValidator,
  userFilterValidator,
} from '#validators/user'
import { generateTemporaryPassword } from '#services/temporary_password_service'
import UserFilter from '#filters/user_filter'

/**
 * Owner accounts (super-admin role) can only be managed by another
 * super-admin - otherwise a Manager with users.manage could reset the
 * owner's password or demote them. Same for handing out the Owner role.
 */
async function actorIsSuperAdmin(ctx: HttpContext) {
  const actor = ctx.auth.getUserOrFail()
  await actor.load((preloader) => preloader.load('role'))
  return !!actor.role?.isSuperAdmin
}

async function isSuperAdminRole(roleId: string | null | undefined) {
  if (!roleId) return false
  const role = await Role.find(roleId)
  return !!role?.isSuperAdmin
}

const OWNER_ONLY = {
  message: 'Only an owner can manage owner accounts or assign the owner role',
  code: 'E_OWNER_ONLY',
}

export default class UsersController {
  async index({ request, response, serialize }: HttpContext) {
    const payload = await request.validateUsing(userFilterValidator)
    const page = payload.page ?? 1
    const limit = payload.limit ?? 20

    const query = new UserFilter(
      User.query()
        .preload('role', (roleQuery) => roleQuery.preload('permissions'))
        .preload('branches'),
      { ...payload }
    ).apply()
    const users = await query.paginate(page, limit)

    const transformed = await serialize(UserTransformer.paginate(users.all(), users.getMeta()))

    return response.ok({
      message: 'Users fetched successfully',
      data: transformed.data,
      meta: transformed.metadata,
    })
  }

  async store(ctx: HttpContext) {
    const { request, response, serialize } = ctx
    const { fullName, email, phone, roleId, branchIds } =
      await request.validateUsing(createStaffUserValidator)
    if ((await isSuperAdminRole(roleId)) && !(await actorIsSuperAdmin(ctx))) {
      return response.forbidden(OWNER_ONLY)
    }
    const temporaryPassword = generateTemporaryPassword()

    const user = await db.transaction(async (trx) => {
      const newUser = await User.create(
        {
          fullName,
          email,
          phone: phone ?? null,
          roleId,
          password: temporaryPassword,
          mustResetPassword: true,
        },
        { client: trx }
      )

      // Every staff user works at one or more branches - default to the
      // main branch when none are given.
      let assignedBranchIds = branchIds ?? []
      if (assignedBranchIds.length === 0) {
        const mainBranch = await Branch.query({ client: trx }).where('is_main', true).first()
        assignedBranchIds = mainBranch ? [mainBranch.id] : []
      }
      if (assignedBranchIds.length > 0) {
        await newUser.related('branches').sync(assignedBranchIds)
      }

      return newUser
    })

    await user.load((preloader) => preloader.load('role').load('branches'))

    const transformed = await serialize(UserTransformer.transform(user))
    return response.created({
      message: 'Staff user created successfully',
      data: {
        user: transformed.data,
        temporaryPassword,
      },
    })
  }

  async show({ params, response, serialize }: HttpContext) {
    const user = await User.query()
      .where('id', params.id)
      .preload('role', (roleQuery) => roleQuery.preload('permissions'))
      .preload('branches')
      .firstOrFail()

    const transformed = await serialize(UserTransformer.transform(user))
    return response.ok({
      message: 'User fetched successfully',
      data: transformed.data,
    })
  }

  async update(ctx: HttpContext) {
    const { auth, params, request, response, serialize } = ctx
    const { roleId, isActive, branchIds, permissionsOverride } =
      await request.validateUsing(updateStaffUserValidator)

    const user = await User.findOrFail(params.id)
    const touchesOwner = (await isSuperAdminRole(user.roleId)) || (await isSuperAdminRole(roleId))
    if (touchesOwner && !(await actorIsSuperAdmin(ctx))) {
      return response.forbidden(OWNER_ONLY)
    }
    if (user.id === auth.getUserOrFail().id && isActive === false) {
      return response.badRequest({ message: 'You cannot deactivate your own account' })
    }
    await db.transaction(async (trx) => {
      user.useTransaction(trx)
      if (roleId !== undefined) {
        user.roleId = roleId
      }
      if (isActive !== undefined) {
        user.isActive = isActive
      }
      if (permissionsOverride !== undefined) {
        user.permissionsOverride = permissionsOverride
      }
      await user.save()

      // Replaces the full set of branch assignments (sync, not additive).
      if (branchIds !== undefined) {
        await user.related('branches').sync(branchIds)
      }
    })

    await user.load((preloader) => preloader.load('role').load('branches'))

    const transformed = await serialize(UserTransformer.transform(user))
    return response.ok({
      message: 'User updated successfully',
      data: transformed.data,
    })
  }

  async resetPassword(ctx: HttpContext) {
    const { params, response, serialize } = ctx
    const user = await User.findOrFail(params.id)
    if ((await isSuperAdminRole(user.roleId)) && !(await actorIsSuperAdmin(ctx))) {
      return response.forbidden(OWNER_ONLY)
    }
    const temporaryPassword = generateTemporaryPassword()

    user.password = temporaryPassword
    user.mustResetPassword = true
    await user.save()
    await user.load((preloader) => preloader.load('role').load('branches'))

    const transformed = await serialize(UserTransformer.transform(user))
    return response.ok({
      message: 'Password reset successfully',
      data: {
        user: transformed.data,
        temporaryPassword,
      },
    })
  }
}
