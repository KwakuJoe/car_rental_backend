import hash from '@adonisjs/core/services/hash'
import type { HttpContext } from '@adonisjs/core/http'
import { changePasswordValidator } from '#validators/user'

export default class ChangePasswordController {
  async store({ request, auth, response }: HttpContext) {
    const { currentPassword, password } = await request.validateUsing(changePasswordValidator)
    const user = auth.getUserOrFail()

    const isValidPassword = await hash.verify(user.password, currentPassword)
    if (!isValidPassword) {
      return response.badRequest({ message: 'Current password is incorrect' })
    }

    user.password = password
    user.mustResetPassword = false
    await user.save()

    return response.ok({
      message: 'Password updated successfully',
    })
  }
}
