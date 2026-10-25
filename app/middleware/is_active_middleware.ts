import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class IsActiveMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.getUserOrFail()

    if (!user.isActive) {
      return ctx.response.forbidden({
        message: 'This account has been deactivated',
        code: 'E_ACCOUNT_DEACTIVATED',
      })
    }

    return next()
  }
}
