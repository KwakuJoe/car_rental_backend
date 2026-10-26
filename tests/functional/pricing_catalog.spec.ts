import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import Role from '#models/role'
import Permission from '#models/permission'
import User from '#models/user'
import Extra from '#models/extra'
import ProtectionPlan from '#models/protection_plan'
import DeliveryZone from '#models/delivery_zone'
import Fee from '#models/fee'
import AuditLog from '#models/audit_log'
import PricingCatalogSeeder from '#database/seeders/pricing_catalog_seeder'

const json = (response: { body(): unknown }) => response.body() as Record<string, any>

async function setup() {
  const ownerRole = await Role.create({ name: 'Owner', slug: 'owner', isSuperAdmin: true })
  const perms = Object.fromEntries(
    await Promise.all(
      ['pricing.view', 'pricing.manage', 'extras.manage'].map(async (slug) => [
        slug,
        await Permission.create({ name: slug, slug, group: 'pricing' }),
      ])
    )
  ) as Record<string, Permission>

  const deskRole = await Role.create({ name: 'Front Desk', slug: 'front-desk' })
  await deskRole.related('permissions').attach([perms['pricing.view'].id])
  // Can change prices but not extras
  const pricingRole = await Role.create({ name: 'Pricing', slug: 'pricing' })
  await pricingRole
    .related('permissions')
    .attach([perms['pricing.view'].id, perms['pricing.manage'].id])

  const make = (email: string, roleId: string) =>
    User.create({ email, password: 'Password123!', roleId })
  return {
    owner: await make('owner@wynk.test', ownerRole.id),
    desk: await make('desk@wynk.test', deskRole.id),
    pricer: await make('pricer@wynk.test', pricingRole.id),
  }
}

test.group('pricing catalog', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('extras: create with defaults, update, audit, permissions', async ({ client, assert }) => {
    const { owner, desk, pricer } = await setup()
    const seat = { name: 'Child seat', chargeType: 'per_day' as const, amount: 3000, stock: 4 }

    const created = await client.post('/api/v1/admin/extras').json(seat).loginAs(owner)
    created.assertStatus(201)
    const data = json(created).data
    assert.include(data, { maxQuantity: 1, taxable: true, availableOnline: true, active: true })

    const updated = await client
      .put(`/api/v1/admin/extras/${data.id}`)
      .json({ ...seat, amount: 3500, taxable: false })
      .loginAs(owner)
    updated.assertStatus(200)
    assert.include(json(updated).data, { amount: 3500, taxable: false })

    const actions = await AuditLog.query().where('subject_id', data.id)
    assert.sameMembers(
      actions.map((log) => log.action),
      ['extra.created', 'extra.updated']
    )

    const deskList = await client.get('/api/v1/admin/extras').loginAs(desk)
    deskList.assertStatus(200)
    const deskCreate = await client.post('/api/v1/admin/extras').json(seat).loginAs(desk)
    deskCreate.assertStatus(403)
    // pricing.manage is not enough for extras - they have their own permission
    const pricerExtra = await client.post('/api/v1/admin/extras').json(seat).loginAs(pricer)
    pricerExtra.assertStatus(403)
    const pricerZone = await client
      .post('/api/v1/admin/delivery-zones')
      .json({ name: 'Tema', deliveryAmount: 20000, collectionAmount: 20000 })
      .loginAs(pricer)
    pricerZone.assertStatus(201)
  })

  test('protection plans: only one default; an inactive plan is never the default', async ({
    client,
    assert,
  }) => {
    const { owner } = await setup()
    const plan = (name: string, extra: Record<string, unknown> = {}) =>
      client
        .post('/api/v1/admin/protection-plans')
        .json({ name, perDayAmount: 0, excessAmount: 500000, ...extra })
        .loginAs(owner)

    const basicResponse = await plan('Basic', { isDefault: true })
    basicResponse.assertStatus(201)
    const fullResponse = await plan('Full', {
      perDayAmount: 15000,
      excessAmount: 0,
      isDefault: true,
    })
    const full = json(fullResponse).data

    const defaults = await ProtectionPlan.query().where('is_default', true)
    assert.deepEqual(
      defaults.map((row) => row.id),
      [full.id]
    )

    const deactivated = await client
      .put(`/api/v1/admin/protection-plans/${full.id}`)
      .json({ name: 'Full', perDayAmount: 15000, excessAmount: 0, isDefault: true, active: false })
      .loginAs(owner)
    deactivated.assertStatus(200)
    assert.isFalse(json(deactivated).data.isDefault)
  })

  test('fees: custom codes, fixed codes, percentage cap', async ({ client, assert }) => {
    const { owner } = await setup()
    const towing = { code: 'towing', name: 'Towing', unit: 'flat' as const, amount: 80000 }

    const created = await client.post('/api/v1/admin/fees').json(towing).loginAs(owner)
    created.assertStatus(201)
    assert.isFalse(json(created).data.isSystem)

    const duplicate = await client.post('/api/v1/admin/fees').json(towing).loginAs(owner)
    duplicate.assertStatus(422)
    const badCode = await client
      .post('/api/v1/admin/fees')
      .json({ ...towing, code: 'Bad Code!' })
      .loginAs(owner)
    badCode.assertStatus(422)
    const overHundred = await client
      .post('/api/v1/admin/fees')
      .json({ code: 'fine_admin', name: 'Admin', unit: 'percent', amount: 15000 })
      .loginAs(owner)
    overHundred.assertStatus(422)

    // The code can't be changed on update (check-in looks fees up by code)
    const updated = await client
      .put(`/api/v1/admin/fees/${json(created).data.id}`)
      // Extra field on purpose: the API must ignore it
      .json({ ...towing, code: 'renamed', amount: 90000 } as any)
      .loginAs(owner)
    updated.assertStatus(200)
    assert.include(json(updated).data, { code: 'towing', amount: 90000 })
  })
})

test.group('pricing catalog seeder', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('adds inactive examples once and never overwrites edits', async ({ assert }) => {
    await new PricingCatalogSeeder(db.connection()).run()

    const count = async (
      model: typeof Extra | typeof ProtectionPlan | typeof DeliveryZone | typeof Fee
    ) => {
      const [row] = await model.query().count('* as total')
      return Number(row.$extras.total)
    }
    assert.equal(await count(Fee), 11)
    assert.equal(await count(Extra), 6)
    assert.equal(await count(ProtectionPlan), 3)
    assert.equal(await count(DeliveryZone), 5)
    const active = await Extra.query().where('active', true)
    assert.lengthOf(active, 0)
    const systemFees = await Fee.query().where('is_system', true).where('active', false)
    assert.lengthOf(systemFees, 11)

    const seat = await Extra.findByOrFail('name', 'Child seat')
    seat.merge({ amount: 4000, active: true })
    await seat.save()
    const lateFee = await Fee.findByOrFail('code', 'late_return_hour')
    lateFee.amount = 7000
    await lateFee.save()

    await new PricingCatalogSeeder(db.connection()).run()

    assert.equal(await count(Fee), 11)
    assert.equal(await count(Extra), 6)
    await seat.refresh()
    await lateFee.refresh()
    assert.equal(seat.amount, 4000)
    assert.isTrue(seat.active)
    assert.equal(lateFee.amount, 7000)
  })
})
