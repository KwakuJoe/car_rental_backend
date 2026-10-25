import UserTransformer from '#transformers/user_transformer'
import type { HttpContext } from '@adonisjs/core/http'

export default class ProfileController {
  async show({ auth, response, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    await user.load((preloader) =>
      preloader.load('role', (roleQuery) => roleQuery.preload('permissions')).load('branches')
    )

    const transformed = await serialize(UserTransformer.transform(user))

    return response.ok({
      message: 'Profile fetched successfully',
      data: transformed.data,
    })
  }
}
