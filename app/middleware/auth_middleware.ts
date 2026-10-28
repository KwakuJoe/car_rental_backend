import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { Authenticators } from '@adonisjs/auth/types'
import User from '#models/user'

/**
 * Auth middleware is used authenticate HTTP requests and deny
 * access to unauthenticated users.
 */
export default class AuthMiddleware {
  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: {
      guards?: (keyof Authenticators)[]
    } = {}
  ) {
    await ctx.auth.authenticateUsing(options.guards)
    // Staff activity keeps the sign-in alive; an open page refreshing itself doesn't
    const token = ctx.auth.user?.currentAccessToken
    if (token && ctx.request.header('x-background') !== '1') {
      await User.accessTokens.touch(token.identifier)
    }
    return next()
  }
}
