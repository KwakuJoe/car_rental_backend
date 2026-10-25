import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class PermissionMiddleware {
  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: {
      permissions: string[]
    }
  ) {
    const user = ctx.auth.getUserOrFail()
    await user.load((preloader) =>
      preloader.load('role', (roleQuery) => roleQuery.preload('permissions'))
    )

    const role = user.role
    const hasAccess =
      !!role &&
      options.permissions.every((slug) => {
        // A per-user override always wins, in either direction - it can
        // grant a permission the role doesn't have, or deny one the role
        // (or isSuperAdmin) would otherwise allow.
        const override = user.permissionsOverride?.[slug]
        if (override !== undefined) {
          return override
        }

        return role.isSuperAdmin || role.permissions.some((permission) => permission.slug === slug)
      })

    if (!hasAccess) {
      return ctx.response.forbidden({
        message: 'You do not have permission to perform this action',
      })
    }

    return next()
  }
}
