import { test } from '@japa/runner'
import hash from '@adonisjs/core/services/hash'
import ace from '@adonisjs/core/services/ace'
import testUtils from '@adonisjs/core/services/test_utils'
import PasswordReset from '../../../commands/password_reset.js'
import User from '#models/user'

test.group('password:reset', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('generates a new temporary password and forces a reset', async ({ assert }) => {
    const user = await User.create({
      fullName: 'Ada Owusu',
      email: 'ada@sunrise.test',
      password: 'OldPass123',
      mustResetPassword: false,
    })

    const command = await ace.create(PasswordReset, ['ada@sunrise.test'])
    await command.exec()

    command.assertSucceeded()

    await user.refresh()
    assert.isTrue(user.mustResetPassword)
    assert.isFalse(await hash.verify(user.password, 'OldPass123'))
  })

  test('fails when no account matches the email', async () => {
    const command = await ace.create(PasswordReset, ['nobody@sunrise.test'])
    await command.exec()

    command.assertFailed()
  })
})
