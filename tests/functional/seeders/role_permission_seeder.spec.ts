import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import testUtils from '@adonisjs/core/services/test_utils'
import RolePermissionSeeder from '#database/seeders/role_permission_seeder'
import Role from '#models/role'
import Permission from '#models/permission'

test.group('role_permission_seeder', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('seeds the default roles and permissions', async ({ assert }) => {
    await new RolePermissionSeeder(db.connection()).run()

    const roles = await Role.query().orderBy('slug', 'asc')
    assert.deepEqual(
      roles.map((role) => role.slug),
      ['accountant', 'driver', 'fleet', 'front-desk', 'manager', 'owner']
    )
    assert.isTrue(roles.every((role) => role.isSystem))
    assert.deepEqual(
      roles.filter((role) => role.isSuperAdmin).map((role) => role.slug),
      ['owner']
    )

    const permissions = await Permission.query().orderBy('slug', 'asc')
    assert.deepEqual(
      permissions.map((permission) => permission.slug),
      ['permissions.manage', 'roles.manage', 'settings.manage', 'users.manage']
    )

    const manager = roles.find((role) => role.slug === 'manager')!
    await manager.load('permissions')
    assert.sameMembers(
      manager.permissions.map((permission) => permission.slug),
      ['users.manage', 'settings.manage']
    )
  })

  test('re-running the seeder does not undo permissions granted afterwards', async ({ assert }) => {
    await new RolePermissionSeeder(db.connection()).run()

    const frontDesk = await Role.query().where('slug', 'front-desk').firstOrFail()
    const rolesManage = await Permission.query().where('slug', 'roles.manage').firstOrFail()
    await frontDesk.related('permissions').sync([rolesManage.id], false)

    await new RolePermissionSeeder(db.connection()).run()

    await frontDesk.load('permissions')
    assert.deepEqual(
      frontDesk.permissions.map((permission) => permission.slug),
      ['roles.manage']
    )
  })
})
