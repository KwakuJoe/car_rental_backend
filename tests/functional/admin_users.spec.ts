import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Role from '#models/role'
import User from '#models/user'
import Business from '#models/business'
import Branch from '#models/branch'

async function loginAsOwner(client: any) {
  const ownerRole = await Role.create({ name: 'Owner', slug: 'owner', isSuperAdmin: true })
  await User.create({
    fullName: 'Ada Owusu',
    email: 'ada@example.test',
    password: 'OwnerPass123',
    roleId: ownerRole.id,
    mustResetPassword: false,
  })
  const loginResponse = await client.post('/api/v1/auth/login').json({
    email: 'ada@example.test',
    password: 'OwnerPass123',
  })
  return { ownerRole, token: loginResponse.body().data.token as string }
}

async function createBranches() {
  const business = await Business.create({ name: 'Sunrise Car Rentals', email: 'hi@sunrise.test' })
  const main = await Branch.create({
    businessId: business.id,
    name: 'Main Branch',
    code: 'MAIN',
    isMain: true,
  })
  const airport = await Branch.create({ businessId: business.id, name: 'Airport', code: 'KIA' })
  return { main, airport }
}

test.group('admin/users - create and update', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('creating a staff user returns a temporary password and the assigned role', async ({
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

    const loginResponse = await client.post('/api/v1/auth/login').json({
      email: 'ada@example.test',
      password: 'OwnerPass123',
    })
    const token = loginResponse.body().data.token

    const response = await client
      .post('/api/v1/admin/users')
      .header('Authorization', `Bearer ${token}`)
      .json({
        fullName: 'Kojo Mensah',
        email: 'kojo@example.test',
        roleId: ownerRole.id,
      })

    response.assertStatus(201)
    const body = response.body() as Record<string, any>
    assert.equal(body.data.user.role.id, ownerRole.id)
    assert.isTrue(body.data.user.mustResetPassword)
    assert.isString(body.data.temporaryPassword)
  })

  test('updating a user can change role, active status, and permission overrides', async ({
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

    const loginResponse = await client.post('/api/v1/auth/login').json({
      email: 'ada@example.test',
      password: 'OwnerPass123',
    })
    const token = loginResponse.body().data.token

    const managerRole = await Role.create({ name: 'Manager', slug: 'manager', isSuperAdmin: false })
    const staff = await User.create({
      fullName: 'Kojo Mensah',
      email: 'kojo@example.test',
      password: 'StaffPass123',
      roleId: ownerRole.id,
    })

    const response = await client
      .put(`/api/v1/admin/users/${staff.id}`)
      .header('Authorization', `Bearer ${token}`)
      .json({
        roleId: managerRole.id,
        isActive: false,
        permissionsOverride: { 'roles.manage': true },
      })

    response.assertStatus(200)
    const data = (response.body() as Record<string, any>).data
    assert.equal(data.role.id, managerRole.id)
    assert.isFalse(data.isActive)
    assert.deepEqual(data.permissionsOverride, { 'roles.manage': true })
  })

  test('a new staff user defaults to the main branch when no branchIds are given', async ({
    client,
    assert,
  }) => {
    const { ownerRole, token } = await loginAsOwner(client)
    const { main } = await createBranches()

    const response = await client
      .post('/api/v1/admin/users')
      .header('Authorization', `Bearer ${token}`)
      .json({ fullName: 'Kojo Mensah', email: 'kojo@example.test', roleId: ownerRole.id })

    response.assertStatus(201)
    const branches = (response.body() as Record<string, any>).data.user.branches
    assert.deepEqual(
      branches.map((branch: { id: string }) => branch.id),
      [main.id]
    )
  })

  test('updating branchIds replaces the full set of branch assignments', async ({
    client,
    assert,
  }) => {
    const { ownerRole, token } = await loginAsOwner(client)
    const { main, airport } = await createBranches()
    const staff = await User.create({
      fullName: 'Kojo Mensah',
      email: 'kojo@example.test',
      password: 'StaffPass123',
      roleId: ownerRole.id,
    })
    await staff.related('branches').attach([main.id])

    const response = await client
      .put(`/api/v1/admin/users/${staff.id}`)
      .header('Authorization', `Bearer ${token}`)
      .json({ branchIds: [airport.id] })

    response.assertStatus(200)
    const branches = (response.body() as Record<string, any>).data.branches
    assert.deepEqual(
      branches.map((branch: { id: string }) => branch.id),
      [airport.id]
    )

    const filtered = await client
      .get('/api/v1/admin/users')
      .qs({ branchId: airport.id })
      .header('Authorization', `Bearer ${token}`)
    filtered.assertStatus(200)
    assert.deepEqual(
      (filtered.body() as Record<string, any>).data.map((user: { id: string }) => user.id),
      [staff.id]
    )
  })
})
