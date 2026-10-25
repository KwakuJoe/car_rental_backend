import { DateTime } from 'luxon'
import User from '#models/user'
import { loginValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'
import UserTransformer from '#transformers/user_transformer'

export default class AccessTokensController {
  async store({ request, response, serialize }: HttpContext) {
    const { email, password } = await request.validateUsing(loginValidator)

    const user = await User.verifyCredentials(email, password)

    if (!user.isActive) {
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

    const transformed = await serialize(UserTransformer.transform(user))
    return response.ok({
      message: 'Login successful',
      data: {
        user: transformed.data,
        token: token.value!.release(),
      },
    })
  }

  async destroy({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    if (user.currentAccessToken) {
      await User.accessTokens.delete(user, user.currentAccessToken.identifier)
    }

    return response.ok({
      message: 'Logged out successfully',
    })
  }
}
