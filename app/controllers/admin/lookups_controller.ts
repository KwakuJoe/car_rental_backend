import type { HttpContext } from '@adonisjs/core/http'
import Business from '#models/business'
import Branch from '#models/branch'
import Role from '#models/role'
import User from '#models/user'

/**
 * Minimal, non-sensitive lists for dropdowns and display, available to any
 * signed-in staff member (no module permission). Use these instead of the
 * full admin resources, which need e.g. roles.manage or settings.manage.
 */
export default class LookupsController {
  async business({ response }: HttpContext) {
    const business = await Business.current()
    return response.ok({
      message: 'Business fetched successfully',
      data: {
        id: business.id,
        name: business.name,
        tradingName: business.tradingName,
        email: business.email,
        phone: business.phone,
        whatsappPhone: business.whatsappPhone,
        currency: business.currency,
        timezone: business.timezone,
      },
    })
  }

  async roles({ response }: HttpContext) {
    const roles = await Role.query().orderBy('name', 'asc')
    return response.ok({
      message: 'Roles fetched successfully',
      data: roles.map((role) => ({
        id: role.id,
        name: role.name,
        slug: role.slug,
        isSuperAdmin: role.isSuperAdmin,
      })),
    })
  }

  /** Staff names for "who" pickers (audit filters, assignments later). */
  async staff({ response }: HttpContext) {
    const users = await User.query().orderBy('full_name', 'asc').orderBy('email', 'asc')
    return response.ok({
      message: 'Staff fetched successfully',
      data: users.map((user) => ({
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        isActive: user.isActive,
      })),
    })
  }

  async branches({ response }: HttpContext) {
    const branches = await Branch.query()
      .where('is_active', true)
      .orderBy('is_main', 'desc')
      .orderBy('name')
    return response.ok({
      message: 'Branches fetched successfully',
      data: branches.map((branch) => ({
        id: branch.id,
        name: branch.name,
        code: branch.code,
        isMain: branch.isMain,
      })),
    })
  }
}
