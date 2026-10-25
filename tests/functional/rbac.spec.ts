import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Role from '#models/role'
import Permission from '#models/permission'
import User from '#models/user'

test.group('RBAC + forced password reset', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('owner with a temp password is blocked until they reset it, then super admin bypasses permission checks', async ({
    client,
    assert,
  }) => {
    const superAdminRole = await Role.create({
      name: 'Owner',
      slug: 'owner',
      isSuperAdmin: true,
    })
    await User.create({
      fullName: 'Ada Owusu',
      email: 'ada@example.test',
      password: 'TempPass123',
      roleId: superAdminRole.id,
      mustResetPassword: true,
    })

    const loginResponse = await client.post('/api/v1/auth/login').json({
      email: 'ada@example.test',
      password: 'TempPass123',
    })
    loginResponse.assertStatus(200)
    assert.equal(loginResponse.body().message, 'Login successful')
    const token = loginResponse.body().data.token

    const blockedResponse = await client
      .get('/api/v1/admin/users')
      .header('Authorization', `Bearer ${token}`)
    blockedResponse.assertStatus(403)

    const changePasswordResponse = await client
      .post('/api/v1/account/change-password')
      .header('Authorization', `Bearer ${token}`)
      .json({
        currentPassword: 'TempPass123',
        password: 'NewPass456',
        passwordConfirmation: 'NewPass456',
      })
    changePasswordResponse.assertStatus(200)
    assert.equal(changePasswordResponse.body().message, 'Password updated successfully')

    const allowedResponse = await client
      .get('/api/v1/admin/users')
      .header('Authorization', `Bearer ${token}`)
    allowedResponse.assertStatus(200)
    assert.equal(allowedResponse.body().message, 'Users fetched successfully')
    assert.isArray(allowedResponse.body().data)
  })

  test('a role without the required permission is forbidden even after resetting its password', async ({
    client,
  }) => {
    const frontDeskRole = await Role.create({
      name: 'Front Desk',
      slug: 'front-desk',
      isSuperAdmin: false,
    })
    await Permission.create({ name: 'Manage users', slug: 'users.manage', group: 'rbac' })
    await User.create({
      fullName: 'Kojo Mensah',
      email: 'kojo@example.test',
      password: 'StaffPass123',
      roleId: frontDeskRole.id,
      mustResetPassword: false,
    })

    const loginResponse = await client.post('/api/v1/auth/login').json({
      email: 'kojo@example.test',
      password: 'StaffPass123',
    })
    loginResponse.assertStatus(200)
    const token = loginResponse.body().data.token

    const forbiddenResponse = await client
      .get('/api/v1/admin/users')
      .header('Authorization', `Bearer ${token}`)
    forbiddenResponse.assertStatus(403)
  })

  test("an admin can reset a staff member's password, forcing them to change it", async ({
    client,
    assert,
  }) => {
    const ownerRole = await Role.create({ name: 'Owner', slug: 'owner', isSuperAdmin: true })
    await User.create({
      fullName: 'Ada Owusu',
      email: 'ada@example.test',
      password: 'OwnerPass123',
      roleId: ownerRole.id,
      mustResetPassword: false,
    })

    const staffRole = await Role.create({
      name: 'Front Desk',
      slug: 'front-desk',
      isSuperAdmin: false,
    })
    const staff = await User.create({
      fullName: 'Kojo Mensah',
      email: 'kojo@example.test',
      password: 'StaffPass123',
      roleId: staffRole.id,
      mustResetPassword: false,
    })

    const loginResponse = await client.post('/api/v1/auth/login').json({
      email: 'ada@example.test',
      password: 'OwnerPass123',
    })
    loginResponse.assertStatus(200)
    const token = loginResponse.body().data.token

    const resetResponse = await client
      .post(`/api/v1/admin/users/${staff.id}/reset-password`)
      .header('Authorization', `Bearer ${token}`)
    resetResponse.assertStatus(200)
    assert.equal(resetResponse.body().message, 'Password reset successfully')
    const temporaryPassword = resetResponse.body().data.temporaryPassword
    assert.isString(temporaryPassword)

    const oldPasswordLogin = await client.post('/api/v1/auth/login').json({
      email: 'kojo@example.test',
      password: 'StaffPass123',
    })
    oldPasswordLogin.assertStatus(400)

    const newPasswordLogin = await client.post('/api/v1/auth/login').json({
      email: 'kojo@example.test',
      password: temporaryPassword,
    })
    newPasswordLogin.assertStatus(200)

    await staff.refresh()
    assert.isTrue(staff.mustResetPassword)
  })

  test('a deactivated user cannot log in', async ({ client }) => {
    const ownerRole = await Role.create({ name: 'Owner', slug: 'owner', isSuperAdmin: true })
    await User.create({
      fullName: 'Ada Owusu',
      email: 'ada@example.test',
      password: 'OwnerPass123',
      roleId: ownerRole.id,
      mustResetPassword: false,
      isActive: false,
    })

    const loginResponse = await client.post('/api/v1/auth/login').json({
      email: 'ada@example.test',
      password: 'OwnerPass123',
    })
    loginResponse.assertStatus(403)
  })

  test('deactivating a user blocks /admin routes but not logout or change-password', async ({
    client,
    assert,
  }) => {
    const ownerRole = await Role.create({ name: 'Owner', slug: 'owner', isSuperAdmin: true })
    const user = await User.create({
      fullName: 'Ada Owusu',
      email: 'ada@example.test',
      password: 'OwnerPass123',
      roleId: ownerRole.id,
      mustResetPassword: false,
      isActive: true,
    })

    const loginResponse = await client.post('/api/v1/auth/login').json({
      email: 'ada@example.test',
      password: 'OwnerPass123',
    })
    loginResponse.assertStatus(200)
    const token = loginResponse.body().data.token

    user.isActive = false
    await user.save()

    const blockedResponse = await client
      .get('/api/v1/admin/users')
      .header('Authorization', `Bearer ${token}`)
    blockedResponse.assertStatus(403)
    assert.equal((blockedResponse.body() as Record<string, any>).code, 'E_ACCOUNT_DEACTIVATED')

    const changePasswordResponse = await client
      .post('/api/v1/account/change-password')
      .header('Authorization', `Bearer ${token}`)
      .json({
        currentPassword: 'OwnerPass123',
        password: 'NewPass456',
        passwordConfirmation: 'NewPass456',
      })
    changePasswordResponse.assertStatus(200)

    const logoutResponse = await client
      .post('/api/v1/account/logout')
      .header('Authorization', `Bearer ${token}`)
    logoutResponse.assertStatus(200)
  })

  test('a per-user permission override grants access the role does not have', async ({
    client,
  }) => {
    const frontDeskRole = await Role.create({
      name: 'Front Desk',
      slug: 'front-desk',
      isSuperAdmin: false,
    })
    await Permission.create({ name: 'Manage users', slug: 'users.manage', group: 'rbac' })
    await User.create({
      fullName: 'Kojo Mensah',
      email: 'kojo@example.test',
      password: 'StaffPass123',
      roleId: frontDeskRole.id,
      mustResetPassword: false,
      permissionsOverride: { 'users.manage': true },
    })

    const loginResponse = await client.post('/api/v1/auth/login').json({
      email: 'kojo@example.test',
      password: 'StaffPass123',
    })
    const token = loginResponse.body().data.token

    const allowedResponse = await client
      .get('/api/v1/admin/users')
      .header('Authorization', `Bearer ${token}`)
    allowedResponse.assertStatus(200)
  })

  test('a per-user permission override can deny access a super admin role would otherwise have', async ({
    client,
  }) => {
    const ownerRole = await Role.create({ name: 'Owner', slug: 'owner', isSuperAdmin: true })
    await User.create({
      fullName: 'Ada Owusu',
      email: 'ada@example.test',
      password: 'OwnerPass123',
      roleId: ownerRole.id,
      mustResetPassword: false,
      permissionsOverride: { 'users.manage': false },
    })

    const loginResponse = await client.post('/api/v1/auth/login').json({
      email: 'ada@example.test',
      password: 'OwnerPass123',
    })
    const token = loginResponse.body().data.token

    const deniedResponse = await client
      .get('/api/v1/admin/users')
      .header('Authorization', `Bearer ${token}`)
    deniedResponse.assertStatus(403)
  })

  test('login and profile responses include the role and its permissions', async ({
    client,
    assert,
  }) => {
    const frontDeskRole = await Role.create({
      name: 'Front Desk',
      slug: 'front-desk',
      isSuperAdmin: false,
    })
    const usersManage = await Permission.create({
      name: 'Manage users',
      slug: 'users.manage',
      group: 'rbac',
    })
    await frontDeskRole.related('permissions').sync([usersManage.id])
    await User.create({
      fullName: 'Kojo Mensah',
      email: 'kojo@example.test',
      password: 'StaffPass123',
      roleId: frontDeskRole.id,
      mustResetPassword: false,
    })

    const loginResponse = await client.post('/api/v1/auth/login').json({
      email: 'kojo@example.test',
      password: 'StaffPass123',
    })
    loginResponse.assertStatus(200)
    const loginUser = (loginResponse.body() as Record<string, any>).data.user
    assert.equal(loginUser.role.slug, 'front-desk')
    assert.isFalse(loginUser.role.isSuperAdmin)
    assert.deepEqual(
      loginUser.role.permissions.map((permission: { slug: string }) => permission.slug),
      ['users.manage']
    )
    const token = (loginResponse.body() as Record<string, any>).data.token

    const profileResponse = await client
      .get('/api/v1/account/profile')
      .header('Authorization', `Bearer ${token}`)
    profileResponse.assertStatus(200)
    const profileUser = (profileResponse.body() as Record<string, any>).data
    assert.equal(profileUser.role.slug, 'front-desk')
  })
})
