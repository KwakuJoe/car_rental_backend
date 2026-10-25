import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Permission from '#models/permission'
import Role from '#models/role'
import User from '#models/user'

const json = (response: { body(): unknown }) => response.body() as Record<string, any>

async function setup() {
  const usersManage = await Permission.create({
    name: 'Manage users',
    slug: 'users.manage',
    group: 'rbac',
  })
  const ownerRole = await Role.create({ name: 'Owner', slug: 'owner', isSuperAdmin: true })
  const managerRole = await Role.create({ name: 'Manager', slug: 'manager' })
  await managerRole.related('permissions').attach([usersManage.id])
  const deskRole = await Role.create({ name: 'Front Desk', slug: 'front-desk' })

  const owner = await User.create({
    email: 'owner@sunrise.test',
    password: 'OwnerPass123',
    roleId: ownerRole.id,
  })
  const manager = await User.create({
    email: 'manager@sunrise.test',
    password: 'ManagerPass123',
    roleId: managerRole.id,
  })
  const desk = await User.create({
    email: 'desk@sunrise.test',
    password: 'DeskPass123',
    roleId: deskRole.id,
  })
  return { ownerRole, deskRole, owner, manager, desk }
}

test.group('admin/users - owner protection', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('a manager cannot reset, edit, or create owner accounts', async ({ client, assert }) => {
    const { owner, manager, ownerRole } = await setup()

    const reset = await client
      .post(`/api/v1/admin/users/${owner.id}/reset-password`)
      .loginAs(manager)
    reset.assertStatus(403)
    assert.equal(json(reset).code, 'E_OWNER_ONLY')

    const deactivate = await client
      .put(`/api/v1/admin/users/${owner.id}`)
      .loginAs(manager)
      .json({ isActive: false })
    deactivate.assertStatus(403)

    const create = await client
      .post('/api/v1/admin/users')
      .loginAs(manager)
      .json({ fullName: 'New Owner', email: 'new@sunrise.test', roleId: ownerRole.id })
    create.assertStatus(403)
  })

  test('a manager can still manage regular staff, and cannot promote them to owner', async ({
    client,
  }) => {
    const { manager, desk, ownerRole } = await setup()

    const reset = await client
      .post(`/api/v1/admin/users/${desk.id}/reset-password`)
      .loginAs(manager)
    reset.assertStatus(200)

    const promote = await client
      .put(`/api/v1/admin/users/${desk.id}`)
      .loginAs(manager)
      .json({ roleId: ownerRole.id })
    promote.assertStatus(403)
  })

  test('nobody can deactivate their own account', async ({ client }) => {
    const { owner } = await setup()
    const response = await client
      .put(`/api/v1/admin/users/${owner.id}`)
      .loginAs(owner)
      .json({ isActive: false })
    response.assertStatus(400)
  })

  test('GET /admin/users/:id returns the user with role and branches', async ({
    client,
    assert,
  }) => {
    const { owner, desk } = await setup()
    const response = await client.get(`/api/v1/admin/users/${desk.id}`).loginAs(owner)
    response.assertStatus(200)
    assert.equal(json(response).data.email, 'desk@sunrise.test')
    assert.equal(json(response).data.role.slug, 'front-desk')
    assert.isArray(json(response).data.branches)
  })

  test('roles list includes how many staff hold each role', async ({ client, assert }) => {
    const { owner } = await setup()
    const response = await client.get('/api/v1/admin/roles').loginAs(owner)
    response.assertStatus(200)
    const counts = Object.fromEntries(
      json(response).data.map((role: { slug: string; usersCount: number }) => [
        role.slug,
        role.usersCount,
      ])
    )
    assert.deepEqual(counts, { 'front-desk': 1, 'manager': 1, 'owner': 1 })
  })
})

test.group('auth/login - rate limiting', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('locks out after 5 failed attempts for the same email', async ({ client, assert }) => {
    await setup()
    for (let attempt = 1; attempt <= 5; attempt++) {
      const response = await client
        .post('/api/v1/auth/login')
        .json({ email: 'lockout@sunrise.test', password: 'wrong' })
      response.assertStatus(400)
    }
    const blocked = await client
      .post('/api/v1/auth/login')
      .json({ email: 'lockout@sunrise.test', password: 'wrong' })
    blocked.assertStatus(429)
    assert.isNumber(json(blocked).errors[0].retryAfter)

    // A different account from the same IP is unaffected.
    const other = await client
      .post('/api/v1/auth/login')
      .json({ email: 'owner@sunrise.test', password: 'OwnerPass123' })
    other.assertStatus(200)
  })
})
