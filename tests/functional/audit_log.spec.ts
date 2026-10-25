import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import AuditLog from '#models/audit_log'
import Permission from '#models/permission'
import Role from '#models/role'
import User from '#models/user'
import AuditService from '#services/audit_service'

const json = (response: { body(): unknown }) => response.body() as Record<string, any>

async function setup() {
  const auditView = await Permission.create({
    name: 'View audit log',
    slug: 'audit.view',
    group: 'audit',
  })
  const ownerRole = await Role.create({ name: 'Owner', slug: 'owner', isSuperAdmin: true })
  const deskRole = await Role.create({ name: 'Front Desk', slug: 'front-desk' })
  const accountantRole = await Role.create({ name: 'Accountant', slug: 'accountant' })
  await accountantRole.related('permissions').attach([auditView.id])

  const owner = await User.create({
    fullName: 'Ada Owner',
    email: 'owner@sunrise.test',
    password: 'OwnerPass123',
    roleId: ownerRole.id,
  })
  const desk = await User.create({
    email: 'desk@sunrise.test',
    password: 'DeskPass123',
    roleId: deskRole.id,
  })
  const accountant = await User.create({
    email: 'accounts@sunrise.test',
    password: 'AccountsPass123',
    roleId: accountantRole.id,
  })
  return { owner, desk, accountant, deskRole, accountantRole }
}

test.group('audit log - recording', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('successful and failed sign-ins are recorded', async ({ client, assert }) => {
    const { owner } = await setup()

    await client
      .post('/api/v1/auth/login')
      .json({ email: 'owner@sunrise.test', password: 'OwnerPass123' })
    await client.post('/api/v1/auth/login').json({ email: 'owner@sunrise.test', password: 'wrong' })

    const login = await AuditLog.findByOrFail('action', 'auth.login')
    assert.equal(login.userId, owner.id)
    assert.equal(login.actorLabel, 'Ada Owner')

    const failed = await AuditLog.findByOrFail('action', 'auth.login_failed')
    assert.isNull(failed.userId)
    assert.equal(failed.actorLabel, 'owner@sunrise.test')
    assert.deepEqual(failed.metadata, { reason: 'invalid_credentials' })
  })

  test('updates store only the changed fields, with readable names', async ({ client, assert }) => {
    const { owner, desk, accountantRole } = await setup()

    await client
      .put(`/api/v1/admin/users/${desk.id}`)
      .loginAs(owner)
      .json({ roleId: accountantRole.id })
    const entry = await AuditLog.query().where('action', 'user.updated').firstOrFail()
    assert.equal(entry.subjectId, desk.id)
    assert.equal(entry.userId, owner.id)
    assert.deepEqual(entry.before, { role: 'Front Desk' })
    assert.deepEqual(entry.after, { role: 'Accountant' })
  })

  test('an update that changes nothing writes no entry', async ({ client, assert }) => {
    const { owner, desk } = await setup()
    await client.put(`/api/v1/admin/users/${desk.id}`).loginAs(owner).json({ isActive: true })
    assert.isNull(await AuditLog.query().where('action', 'user.updated').first())
  })

  test('role permission changes are recorded as slug lists', async ({ client, assert }) => {
    const { owner, deskRole } = await setup()
    const permission = await Permission.findByOrFail('slug', 'audit.view')

    await client
      .put(`/api/v1/admin/roles/${deskRole.id}/permissions`)
      .loginAs(owner)
      .json({ permissionIds: [permission.id] })

    const entry = await AuditLog.findByOrFail('action', 'role.permissions_synced')
    assert.deepEqual(entry.before, { permissions: [] })
    assert.deepEqual(entry.after, { permissions: ['audit.view'] })
  })

  test('sensitive values are redacted', async ({ assert }) => {
    const entry = await AuditService.record(null, {
      action: 'test.recorded',
      after: { password: 'Secret123', apiToken: 'abc', name: 'Visible' },
    })
    assert.deepEqual(entry!.after, {
      password: '[redacted]',
      apiToken: '[redacted]',
      name: 'Visible',
    })
    assert.equal(entry!.actorType, 'system')
  })
})

test.group('audit log - reading', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('requires audit.view; newest first; filters by subject and action prefix', async ({
    client,
    assert,
  }) => {
    const { owner, desk, accountant, accountantRole } = await setup()
    await client
      .put(`/api/v1/admin/users/${desk.id}`)
      .loginAs(owner)
      .json({ roleId: accountantRole.id })
    await client.post(`/api/v1/admin/users/${desk.id}/reset-password`).loginAs(owner)

    const denied = await client.get('/api/v1/admin/audit-logs').loginAs(desk)
    denied.assertStatus(403)

    const all = await client.get('/api/v1/admin/audit-logs').loginAs(accountant)
    all.assertStatus(200)
    assert.deepEqual(
      json(all).data.map((log: { action: string }) => log.action),
      ['user.password_reset', 'user.updated']
    )

    const forDesk = await client
      .get('/api/v1/admin/audit-logs')
      .qs({ subjectType: 'user', subjectId: desk.id, action: 'user.' })
      .loginAs(accountant)
    assert.equal(json(forDesk).meta.total, 2)

    const one = await client
      .get(`/api/v1/admin/audit-logs/${json(all).data[1].id}`)
      .loginAs(accountant)
    assert.deepEqual(json(one).data.after, { role: 'Accountant' })
  })

  test('entries cannot be edited or deleted', async ({ client }) => {
    const { accountant } = await setup()
    const entry = await AuditService.record(null, { action: 'test.recorded' })
    const update = await client
      .put(`/api/v1/admin/audit-logs/${entry!.id}`)
      .loginAs(accountant)
      .json({})
    update.assertStatus(404)
    const remove = await client.delete(`/api/v1/admin/audit-logs/${entry!.id}`).loginAs(accountant)
    remove.assertStatus(404)
  })
})
