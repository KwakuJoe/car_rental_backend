import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class MustResetPasswordMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.getUserOrFail()

    if (user.mustResetPassword) {
      return ctx.response.forbidden({
        message: 'You must change your temporary password before continuing',
        code: 'E_PASSWORD_RESET_REQUIRED',
      })
    }

    return next()
  }
}
