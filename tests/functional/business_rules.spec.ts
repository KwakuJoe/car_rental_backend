import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import AuditLog from '#models/audit_log'
import Role from '#models/role'
import User from '#models/user'
import SettingsService from '#services/settings/settings_service'

const json = (response: { body(): unknown }) => response.body() as Record<string, any>

async function setup() {
  const ownerRole = await Role.create({ name: 'Owner', slug: 'owner', isSuperAdmin: true })
  const deskRole = await Role.create({ name: 'Front Desk', slug: 'front-desk' })
  const owner = await User.create({
    email: 'owner@sunrise.test',
    password: 'OwnerPass123',
    roleId: ownerRole.id,
  })
  const desk = await User.create({
    email: 'desk@sunrise.test',
    password: 'DeskPass123',
    roleId: deskRole.id,
  })
  return { owner, desk }
}

const find = (body: Record<string, any>, key: string) =>
  body.data.settings.find((setting: { key: string }) => setting.key === key)

test.group('business rules (settings)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('lists every rule with its default and metadata', async ({ client, assert }) => {
    const { owner } = await setup()
    const response = await client.get('/api/v1/admin/settings').loginAs(owner)
    response.assertStatus(200)

    const minAge = find(json(response), 'booking.min_driver_age')
    assert.include(minAge, {
      value: 25,
      default: 25,
      isDefault: true,
      type: 'integer',
      min: 18,
      max: 99,
      unit: 'years',
    })
    assert.equal(json(response).data.groups.bookings, 'Bookings')
    assert.lengthOf(find(json(response), 'rental.fuel_policy').options, 2)
  })

  test('saves overrides of every type, and a value equal to the default clears it', async ({
    client,
    assert,
  }) => {
    const { owner } = await setup()

    const saved = await client
      .put('/api/v1/admin/settings')
      .loginAs(owner)
      .json({
        values: {
          'booking.min_driver_age': 23,
          'rental.fuel_policy': 'same_to_same',
          'payment.allow_pay_at_pickup': false,
          'booking.after_hours_fee': 150_00,
        },
      })
    saved.assertStatus(200)
    assert.include(find(json(saved), 'booking.min_driver_age'), { value: 23, isDefault: false })
    assert.include(find(json(saved), 'rental.fuel_policy'), {
      value: 'same_to_same',
      isDefault: false,
    })
    assert.equal(await SettingsService.get('payment.allow_pay_at_pickup'), false)
    assert.equal(await SettingsService.get('booking.after_hours_fee'), 150_00)

    const reset = await client
      .put('/api/v1/admin/settings')
      .loginAs(owner)
      .json({ values: { 'booking.min_driver_age': 25 } })
    assert.include(find(json(reset), 'booking.min_driver_age'), { value: 25, isDefault: true })
  })

  test('rejects out-of-range, wrong-type, invalid-option and unknown values', async ({
    client,
    assert,
  }) => {
    const { owner } = await setup()
    const response = await client
      .put('/api/v1/admin/settings')
      .loginAs(owner)
      .json({
        values: {
          'booking.min_driver_age': 12,
          'booking.after_hours_fee': 10.5,
          'rental.fuel_policy': 'empty_to_empty',
          'booking.not_a_rule': 1,
        },
      })
    response.assertStatus(422)
    assert.sameMembers(
      json(response).errors.map((error: { field: string }) => error.field),
      [
        'values.booking.min_driver_age',
        'values.booking.after_hours_fee',
        'values.rental.fuel_policy',
        'values.booking.not_a_rule',
      ]
    )
    assert.equal(await SettingsService.get('booking.min_driver_age'), 25)
  })

  test('changes are audited and need settings.manage', async ({ client, assert }) => {
    const { owner, desk } = await setup()

    const denied = await client
      .put('/api/v1/admin/settings')
      .loginAs(desk)
      .json({ values: { 'booking.min_driver_age': 21 } })
    denied.assertStatus(403)

    await client
      .put('/api/v1/admin/settings')
      .loginAs(owner)
      .json({ values: { 'booking.min_driver_age': 21 } })
    const entry = await AuditLog.findByOrFail('action', 'settings.updated')
    assert.deepEqual(entry.before, { 'booking.min_driver_age': 25 })
    assert.deepEqual(entry.after, { 'booking.min_driver_age': 21 })
  })
})
