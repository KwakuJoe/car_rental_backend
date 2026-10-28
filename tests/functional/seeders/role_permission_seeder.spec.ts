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
      [
        'audit.view',
        'bookings.cancel',
        'bookings.create',
        'bookings.override',
        'bookings.update',
        'bookings.view',
        'customers.blacklist',
        'customers.manage',
        'customers.verify',
        'customers.view',
        'customers.view_documents',
        'drivers.manage',
        'drivers.view',
        'expenses.approve',
        'expenses.manage',
        'expenses.view',
        'exports.run',
        'extras.manage',
        'fleet.manage',
        'fleet.view',
        'handover.checkin',
        'handover.checkout',
        'invoices.manage',
        'invoices.view',
        'maintenance.manage',
        'maintenance.view',
        'payments.record',
        'payments.refund',
        'payments.verify',
        'payments.view',
        'payments.void',
        'permissions.manage',
        'pricing.manage',
        'pricing.view',
        'reports.financial',
        'reports.view',
        'roles.manage',
        'settings.manage',
        'users.manage',
      ]
    )

    const manager = roles.find((role) => role.slug === 'manager')!
    await manager.load('permissions')
    assert.sameMembers(
      manager.permissions.map((permission) => permission.slug),
      [
        'users.manage',
        'settings.manage',
        'audit.view',
        'fleet.view',
        'fleet.manage',
        'pricing.view',
        'pricing.manage',
        'extras.manage',
        'customers.view',
        'customers.manage',
        'customers.verify',
        'customers.view_documents',
        'customers.blacklist',
        'bookings.view',
        'bookings.create',
        'bookings.update',
        'bookings.cancel',
        'bookings.override',
        'drivers.view',
        'drivers.manage',
        'handover.checkout',
        'handover.checkin',
        'payments.view',
        'payments.record',
        'payments.verify',
        'payments.refund',
        'payments.void',
        'reports.view',
        'reports.financial',
        'exports.run',
        'expenses.view',
        'expenses.manage',
        'expenses.approve',
        'invoices.view',
        'invoices.manage',
        'maintenance.view',
        'maintenance.manage',
      ]
    )
  })

  test('re-running the seeder does not undo permissions granted afterwards', async ({ assert }) => {
    await new RolePermissionSeeder(db.connection()).run()

    const frontDesk = await Role.query().where('slug', 'front-desk').firstOrFail()
    const rolesManage = await Permission.query().where('slug', 'roles.manage').firstOrFail()
    await frontDesk.related('permissions').sync([rolesManage.id], false)

    await new RolePermissionSeeder(db.connection()).run()

    await frontDesk.load('permissions')
    assert.sameMembers(
      frontDesk.permissions.map((permission) => permission.slug),
      [
        'fleet.view',
        'pricing.view',
        'customers.view',
        'customers.manage',
        'customers.verify',
        'customers.view_documents',
        'bookings.view',
        'bookings.create',
        'bookings.update',
        'bookings.cancel',
        'drivers.view',
        'handover.checkout',
        'handover.checkin',
        'payments.view',
        'payments.record',
        'payments.refund',
        'invoices.view',
        'invoices.manage',
        'maintenance.view',
        'roles.manage',
      ]
    )
  })
})
