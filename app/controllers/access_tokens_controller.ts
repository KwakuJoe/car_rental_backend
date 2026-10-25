import { DateTime } from 'luxon'
import User from '#models/user'
import { loginValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'
import UserTransformer from '#transformers/user_transformer'
import AuditService from '#services/audit_service'

export default class AccessTokensController {
  async store(ctx: HttpContext) {
    const { request, response, serialize } = ctx
    const { email, password } = await request.validateUsing(loginValidator)

    let user: User
    try {
      user = await User.verifyCredentials(email, password)
    } catch (error) {
      // Failed sign-ins are worth seeing (brute force, forgotten passwords).
      await AuditService.record(ctx, {
        action: 'auth.login_failed',
        actor: null,
        actorType: 'staff',
        actorLabel: email,
        metadata: { reason: 'invalid_credentials' },
      })
      throw error
    }

    if (!user.isActive) {
      await AuditService.record(ctx, {
        action: 'auth.login_blocked',
        actor: user,
        subject: { type: 'user', id: user.id, label: user.fullName ?? user.email },
        metadata: { reason: 'deactivated' },
      })
      return response.forbidden({
        message: 'This account has been deactivated',
        code: 'E_ACCOUNT_DEACTIVATED',
      })
    }

    user.lastLoginAt = DateTime.now()
    await user.save()
    await user.load((preloader) =>
      preloader.load('role', (roleQuery) => roleQuery.preload('permissions')).load('branches')
    )

    const token = await User.accessTokens.create(user)
    await AuditService.record(ctx, {
      action: 'auth.login',
      actor: user,
      subject: { type: 'user', id: user.id, label: user.fullName ?? user.email },
    })

    const transformed = await serialize(UserTransformer.transform(user))
    return response.ok({
      message: 'Login successful',
      data: {
        user: transformed.data,
        token: token.value!.release(),
      },
    })
  }

  async destroy(ctx: HttpContext) {
    const { auth, response } = ctx
    const user = auth.getUserOrFail()
    if (user.currentAccessToken) {
      await User.accessTokens.delete(user, user.currentAccessToken.identifier)
    }
    await AuditService.record(ctx, {
      action: 'auth.logout',
      subject: { type: 'user', id: user.id, label: user.fullName ?? user.email },
    })

    return response.ok({
      message: 'Logged out successfully',
    })
  }
}
