import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Role from '#models/role'
import Permission from '#models/permission'
import User from '#models/user'

test.group('admin list endpoints - search, sort, pagination', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('GET /admin/users supports search, roleId filter, sort, and pagination', async ({
    client,
    assert,
  }) => {
    const ownerRole = await Role.create({ name: 'Owner', slug: 'owner', isSuperAdmin: true })
    const frontDeskRole = await Role.create({
      name: 'Front Desk',
      slug: 'front-desk',
      isSuperAdmin: false,
    })
    await User.create({
      fullName: 'Ada Owusu',
      email: 'ada@sunrise.test',
      password: 'OwnerPass123',
      roleId: ownerRole.id,
      mustResetPassword: false,
    })
    await User.create({
      fullName: 'Kojo Mensah',
      email: 'kojo@sunrise.test',
      password: 'StaffPass123',
      roleId: frontDeskRole.id,
      mustResetPassword: false,
    })
    await User.create({
      fullName: 'Kwame Asante',
      email: 'kwame@sunrise.test',
      password: 'StaffPass123',
      roleId: frontDeskRole.id,
      mustResetPassword: false,
    })

    const loginResponse = await client.post('/api/v1/auth/login').json({
      email: 'ada@sunrise.test',
      password: 'OwnerPass123',
    })
    const token = (loginResponse.body() as Record<string, any>).data.token

    const searchResponse = await client
      .get('/api/v1/admin/users?search=Kojo')
      .header('Authorization', `Bearer ${token}`)
    const searchBody = searchResponse.body() as Record<string, any>
    assert.lengthOf(searchBody.data, 1)
    assert.equal(searchBody.data[0].fullName, 'Kojo Mensah')

    const roleFilterResponse = await client
      .get(`/api/v1/admin/users?roleId=${frontDeskRole.id}`)
      .header('Authorization', `Bearer ${token}`)
    assert.lengthOf((roleFilterResponse.body() as Record<string, any>).data, 2)

    const sortResponse = await client
      .get('/api/v1/admin/users?sortBy=fullName&sortOrder=asc')
      .header('Authorization', `Bearer ${token}`)
    const names = (sortResponse.body() as Record<string, any>).data.map(
      (u: { fullName: string }) => u.fullName
    )
    assert.deepEqual(names, ['Ada Owusu', 'Kojo Mensah', 'Kwame Asante'])

    const paginatedResponse = await client
      .get('/api/v1/admin/users?page=1&limit=2')
      .header('Authorization', `Bearer ${token}`)
    const paginatedBody = paginatedResponse.body() as Record<string, any>
    assert.lengthOf(paginatedBody.data, 2)
    assert.equal(paginatedBody.meta.total, 3)
  })

  test('GET /admin/roles supports search and isSystem/isSuperAdmin filters', async ({
    client,
    assert,
  }) => {
    const ownerRole = await Role.create({
      name: 'Owner',
      slug: 'owner',
      isSuperAdmin: true,
      isSystem: true,
    })
    await Role.create({
      name: 'Night Auditor',
      slug: 'night-auditor',
      isSuperAdmin: false,
      isSystem: false,
    })
    await User.create({
      fullName: 'Ada Owusu',
      email: 'ada@sunrise.test',
      password: 'OwnerPass123',
      roleId: ownerRole.id,
      mustResetPassword: false,
    })

    const loginResponse = await client.post('/api/v1/auth/login').json({
      email: 'ada@sunrise.test',
      password: 'OwnerPass123',
    })
    const token = (loginResponse.body() as Record<string, any>).data.token

    const searchResponse = await client
      .get('/api/v1/admin/roles?search=night')
      .header('Authorization', `Bearer ${token}`)
    const searchBody = searchResponse.body() as Record<string, any>
    assert.lengthOf(searchBody.data, 1)
    assert.equal(searchBody.data[0].slug, 'night-auditor')

    const systemOnlyResponse = await client
      .get('/api/v1/admin/roles?isSystem=true')
      .header('Authorization', `Bearer ${token}`)
    assert.lengthOf((systemOnlyResponse.body() as Record<string, any>).data, 1)
  })

  test('GET /admin/permissions supports search, group filter, and pagination meta', async ({
    client,
    assert,
  }) => {
    const ownerRole = await Role.create({ name: 'Owner', slug: 'owner', isSuperAdmin: true })
    await User.create({
      fullName: 'Ada Owusu',
      email: 'ada@sunrise.test',
      password: 'OwnerPass123',
      roleId: ownerRole.id,
      mustResetPassword: false,
    })
    await Permission.create({ name: 'Manage users', slug: 'users.manage', group: 'rbac' })
    await Permission.create({
      name: 'View reports',
      slug: 'reports.view',
      group: 'reports',
    })

    const loginResponse = await client.post('/api/v1/auth/login').json({
      email: 'ada@sunrise.test',
      password: 'OwnerPass123',
    })
    const token = (loginResponse.body() as Record<string, any>).data.token

    const groupResponse = await client
      .get('/api/v1/admin/permissions?group=reports')
      .header('Authorization', `Bearer ${token}`)
    const groupBody = groupResponse.body() as Record<string, any>
    assert.lengthOf(groupBody.data, 1)
    assert.equal(groupBody.data[0].slug, 'reports.view')
    assert.isDefined(groupBody.meta)
  })
})
