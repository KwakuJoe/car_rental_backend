import hash from '@adonisjs/core/services/hash'
import type { HttpContext } from '@adonisjs/core/http'
import { changePasswordValidator } from '#validators/user'
import AuditService from '#services/audit_service'

export default class ChangePasswordController {
  async store(ctx: HttpContext) {
    const { request, auth, response } = ctx
    const { currentPassword, password } = await request.validateUsing(changePasswordValidator)
    const user = auth.getUserOrFail()

    const isValidPassword = await hash.verify(user.password, currentPassword)
    if (!isValidPassword) {
      return response.badRequest({ message: 'Current password is incorrect' })
    }

    user.password = password
    const wasTemporary = user.mustResetPassword
    user.mustResetPassword = false
    await user.save()
    await AuditService.record(ctx, {
      action: 'auth.password_changed',
      subject: { type: 'user', id: user.id, label: user.fullName ?? user.email },
      metadata: { replacedTemporaryPassword: wasTemporary },
    })

    return response.ok({
      message: 'Password updated successfully',
    })
  }
}
