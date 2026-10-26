import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import Role from '#models/role'
import Permission from '#models/permission'
import User from '#models/user'
import Tax from '#models/tax'
import AuditLog from '#models/audit_log'
import TaxService, { type TaxableLine } from '#services/pricing/tax_service'

const json = (response: { body(): unknown }) => response.body() as Record<string, any>

/** An unsaved tax for the pure calculation tests. */
function tax(values: Partial<Tax>) {
  const row = new Tax()
  row.merge({
    id: values.name ?? 'tax',
    rateBp: 1500,
    calculation: 'on_net',
    appliesTo: ['rental'],
    ...values,
  } as Partial<Tax>)
  return row
}

const rental = (amount: number, taxable = true): TaxableLine => ({
  chargeType: 'rental',
  amount,
  taxable,
})

test.group('TaxService.calculate', () => {
  test('applies only to the charge types it lists', ({ assert }) => {
    const vat = tax({ name: 'VAT', appliesTo: ['rental', 'delivery'] })
    const result = TaxService.calculate(
      [
        rental(100_000),
        { chargeType: 'extras', amount: 9000, taxable: true },
        { chargeType: 'delivery', amount: 15000, taxable: true },
      ],
      [vat]
    )
    assert.deepEqual(result.lines[0], {
      taxId: 'VAT',
      name: 'VAT',
      rateBp: 1500,
      calculation: 'on_net',
      base: 115_000,
      amount: 17_250,
    })
    assert.equal(result.total, 17_250)
  })

  test('rounds to the pesewa per line, then adds up', ({ assert }) => {
    // 15% of 3 pesewas = 0.45 -> 0 on each line (on the sum it would be 0.9 -> 1)
    const result = TaxService.calculate([rental(3), rental(3)], [tax({ name: 'VAT' })])
    assert.equal(result.total, 0)

    const half = TaxService.calculate([rental(10)], [tax({ name: 'VAT', rateBp: 500 })])
    assert.equal(half.total, 1) // 0.5 rounds up
  })

  test('skips exempt items; discounts lower the base', ({ assert }) => {
    const vat = tax({ name: 'VAT', appliesTo: ['rental', 'extras'] })
    const result = TaxService.calculate(
      [
        rental(100_000),
        rental(-10_000), // discount
        { chargeType: 'extras', amount: 5000, taxable: false }, // exempt extra
      ],
      [vat]
    )
    assert.equal(result.lines[0].base, 90_000)
    assert.equal(result.total, 13_500)
  })

  test('levies first, then a tax on the price plus levies', ({ assert }) => {
    const nhil = tax({ name: 'NHIL', rateBp: 250 })
    const getfund = tax({ name: 'GETFund', rateBp: 250 })
    const vat = tax({ name: 'VAT', rateBp: 1500, calculation: 'on_net_plus_levies' })
    const result = TaxService.calculate([rental(100_000)], [nhil, getfund, vat])

    assert.deepEqual(
      result.lines.map((line) => [line.name, line.base, line.amount]),
      [
        ['NHIL', 100_000, 2500],
        ['GETFund', 100_000, 2500],
        ['VAT', 105_000, 15_750],
      ]
    )
    assert.equal(result.total, 20_750)
  })

  test('taxes with nothing to tax are left off the receipt', ({ assert }) => {
    const result = TaxService.calculate(
      [rental(100_000)],
      [tax({ name: 'VAT' }), tax({ name: 'Fees levy', appliesTo: ['fees'] })]
    )
    assert.deepEqual(
      result.lines.map((line) => line.name),
      ['VAT']
    )
  })
})

async function setup() {
  const ownerRole = await Role.create({ name: 'Owner', slug: 'owner', isSuperAdmin: true })
  const view = await Permission.create({
    name: 'View pricing',
    slug: 'pricing.view',
    group: 'pricing',
  })
  const manage = await Permission.create({
    name: 'Manage pricing',
    slug: 'pricing.manage',
    group: 'pricing',
  })
  const deskRole = await Role.create({ name: 'Front Desk', slug: 'front-desk' })
  await deskRole.related('permissions').attach([view.id])
  const pricingRole = await Role.create({ name: 'Pricing', slug: 'pricing' })
  await pricingRole.related('permissions').attach([view.id, manage.id])
  const make = (email: string, roleId: string) =>
    User.create({ email, password: 'Password123!', roleId })
  return {
    owner: await make('owner@wynk.test', ownerRole.id),
    desk: await make('desk@wynk.test', deskRole.id),
    pricer: await make('pricer@wynk.test', pricingRole.id),
  }
}

const vatBody = {
  name: 'VAT',
  rateBp: 1500,
  appliesTo: ['fees', 'rental'] as ('fees' | 'rental')[],
}

test.group('taxes API and VAT switch', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('no tax at all until the business is VAT registered', async ({ client, assert }) => {
    const { owner } = await setup()
    await Tax.create({ name: 'VAT', rateBp: 1500, calculation: 'on_net', appliesTo: ['rental'] })
    const day = DateTime.fromISO('2026-11-10')

    const off = await TaxService.forLines([rental(100_000)], day)
    assert.equal(off.total, 0)

    const turnedOn = await client
      .put('/api/v1/admin/settings')
      .json({ values: { 'pricing.vat_registered': true } })
      .loginAs(owner)
    turnedOn.assertStatus(200)

    const on = await TaxService.forLines([rental(100_000)], day)
    assert.equal(on.total, 15_000)
  })

  test('only taxes in force on the day apply', async ({ assert }) => {
    await Tax.create({
      name: 'Old VAT',
      rateBp: 1250,
      calculation: 'on_net',
      appliesTo: ['rental'],
      effectiveTo: DateTime.fromISO('2026-12-31'),
    })
    await Tax.create({
      name: 'New VAT',
      rateBp: 1500,
      calculation: 'on_net',
      appliesTo: ['rental'],
      effectiveFrom: DateTime.fromISO('2027-01-01'),
    })
    await Tax.create({
      name: 'Switched off',
      rateBp: 500,
      calculation: 'on_net',
      appliesTo: ['rental'],
      active: false,
    })
    const names = async (iso: string) => {
      const taxes = await TaxService.activeOn(DateTime.fromISO(iso))
      return taxes.map((row) => row.name)
    }
    assert.deepEqual(await names('2026-12-31'), ['Old VAT'])
    assert.deepEqual(await names('2027-01-01'), ['New VAT'])
  })

  test('create and update, audited; charge types kept in a fixed order', async ({
    client,
    assert,
  }) => {
    const { owner } = await setup()
    const created = await client.post('/api/v1/admin/taxes').json(vatBody).loginAs(owner)
    created.assertStatus(201)
    const data = json(created).data
    assert.deepEqual(data.appliesTo, ['rental', 'fees'])
    assert.equal(data.calculation, 'on_net')

    const updated = await client
      .put(`/api/v1/admin/taxes/${data.id}`)
      .json({ ...vatBody, rateBp: 1250, effectiveTo: '2026-12-31' })
      .loginAs(owner)
    updated.assertStatus(200)
    assert.include(json(updated).data, { rateBp: 1250, effectiveTo: '2026-12-31' })

    const actions = await AuditLog.query().where('subject_id', data.id)
    assert.sameMembers(
      actions.map((log) => log.action),
      ['tax.created', 'tax.updated']
    )
  })

  test('explains invalid taxes', async ({ client }) => {
    const { owner } = await setup()
    const cases = [
      { ...vatBody, appliesTo: [] },
      { ...vatBody, rateBp: 0 },
      { ...vatBody, rateBp: 10_001 },
      { ...vatBody, effectiveFrom: '2027-01-02', effectiveTo: '2027-01-01' },
    ]
    for (const body of cases) {
      const response = await client.post('/api/v1/admin/taxes').json(body).loginAs(owner)
      response.assertStatus(422)
    }
  })

  test('anyone with pricing access sees taxes and the switch; only settings.manage changes them', async ({
    client,
    assert,
  }) => {
    const { desk, pricer } = await setup()
    const list = await client.get('/api/v1/admin/taxes').loginAs(desk)
    list.assertStatus(200)
    assert.deepEqual(json(list).context, { vatRegistered: false })

    const deskCreate = await client.post('/api/v1/admin/taxes').json(vatBody).loginAs(desk)
    deskCreate.assertStatus(403)
    const pricerCreate = await client.post('/api/v1/admin/taxes').json(vatBody).loginAs(pricer)
    pricerCreate.assertStatus(403)
  })
})
