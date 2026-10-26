import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import Role from '#models/role'
import Permission from '#models/permission'
import User from '#models/user'
import Category from '#models/category'
import PricingRule from '#models/pricing_rule'
import AuditLog from '#models/audit_log'
import PricingRuleService from '#services/pricing/pricing_rule_service'

const json = (response: { body(): unknown }) => response.body() as Record<string, any>
const day = (iso: string) => DateTime.fromISO(iso)
const BASE = 45000 // GHS 450/day
const economy = { categoryId: 'cat-economy', carId: 'car-1' }

function rule(values: Partial<PricingRule>) {
  return PricingRule.create({
    name: 'Rule',
    type: 'season',
    adjustmentType: 'percent',
    adjustmentValue: 2500,
    appliesTo: 'all',
    priority: 0,
    // Set explicitly: a new model doesn't know the DB defaults until reloaded
    active: true,
    stackable: false,
    recursYearly: false,
    ...values,
  })
}

test.group('PricingRuleService.adjustDay', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('a season raises prices only inside its dates', async ({ assert }) => {
    const season = await rule({
      name: 'Easter',
      dateFrom: day('2027-03-26'),
      dateTo: day('2027-03-29'),
    })
    const adjust = (iso: string) => PricingRuleService.adjustDay(BASE, day(iso), [season], economy)

    assert.equal(adjust('2027-03-26').amount, 56250) // +25%
    assert.equal(adjust('2027-03-29').amount, 56250)
    assert.equal(adjust('2027-03-30').amount, BASE)
    assert.deepEqual(
      adjust('2027-03-27').applied.map((item) => [item.name, item.change]),
      [['Easter', 11250]]
    )
  })

  test('a yearly rule wraps the year end and repeats every year', async ({ assert }) => {
    const christmas = await rule({
      name: 'Christmas',
      dateFrom: day('2026-12-20'),
      dateTo: day('2027-01-05'),
      recursYearly: true,
    })
    const price = (iso: string) =>
      PricingRuleService.adjustDay(BASE, day(iso), [christmas], economy).amount

    assert.equal(price('2030-12-25'), 56250)
    assert.equal(price('2031-01-03'), 56250)
    assert.equal(price('2031-01-06'), BASE)
    assert.equal(price('2030-12-19'), BASE)
  })

  test('weekend rules follow weekdays, optionally within a period', async ({ assert }) => {
    const weekends = await rule({
      name: 'Weekend',
      type: 'weekend',
      weekdays: [5, 6, 7],
      adjustmentType: 'fixed',
      adjustmentValue: 5000,
    })
    const price = (iso: string) =>
      PricingRuleService.adjustDay(BASE, day(iso), [weekends], economy).amount

    assert.equal(price('2026-10-30'), 50000) // Friday
    assert.equal(price('2026-11-01'), 50000) // Sunday
    assert.equal(price('2026-11-02'), BASE) // Monday

    weekends.dateFrom = day('2026-11-01')
    weekends.dateTo = day('2026-11-30')
    assert.equal(price('2026-10-30'), BASE) // before the period
    assert.equal(price('2026-11-06'), 50000)
  })

  test('the highest priority wins; ties go to the more specific rule', async ({ assert }) => {
    const season = await rule({
      name: 'Dec season',
      dateFrom: day('2026-12-01'),
      dateTo: day('2026-12-31'),
      priority: 5,
    })
    const holiday = await rule({
      name: 'Christmas Day',
      type: 'holiday',
      dateFrom: day('2026-12-25'),
      adjustmentValue: 5000,
      priority: 10,
    })
    const result = PricingRuleService.adjustDay(BASE, day('2026-12-25'), [season, holiday], economy)
    assert.deepEqual(
      result.applied.map((item) => item.name),
      ['Christmas Day']
    )
    assert.equal(result.amount, 67500) // +50%

    holiday.priority = 5
    const tie = PricingRuleService.adjustDay(BASE, day('2026-12-25'), [season, holiday], economy)
    assert.equal(tie.applied[0].name, 'Christmas Day') // holiday beats season
  })

  test('stackable rules add on top, worked out on the base price', async ({ assert }) => {
    const season = await rule({ dateFrom: day('2026-12-01'), dateTo: day('2026-12-31') })
    const weekend = await rule({
      name: 'Weekend surcharge',
      type: 'weekend',
      weekdays: [6],
      adjustmentValue: 1000,
      stackable: true,
    })
    const result = PricingRuleService.adjustDay(BASE, day('2026-12-05'), [season, weekend], economy)
    assert.equal(result.amount, 45000 + 11250 + 4500) // +25% and +10% of the base, not compounded
    assert.lengthOf(result.applied, 2)
  })

  test('discounts lower prices but never below zero', async ({ assert }) => {
    const promo = await rule({
      name: 'Independence promo',
      type: 'holiday',
      dateFrom: day('2027-03-06'),
      adjustmentValue: -1000,
    })
    assert.equal(
      PricingRuleService.adjustDay(BASE, day('2027-03-06'), [promo], economy).amount,
      40500
    )

    promo.adjustmentType = 'fixed'
    promo.adjustmentValue = -60000
    assert.equal(PricingRuleService.adjustDay(BASE, day('2027-03-06'), [promo], economy).amount, 0)
  })

  test('rules can target categories or single cars; inactive rules never apply', async ({
    assert,
  }) => {
    const suvOnly = await rule({
      dateFrom: day('2026-12-01'),
      dateTo: day('2026-12-31'),
      appliesTo: 'categories',
      categoryIds: ['cat-suv'],
    })
    const oneCar = await rule({
      dateFrom: day('2026-12-01'),
      dateTo: day('2026-12-31'),
      appliesTo: 'cars',
      carIds: ['car-1'],
      adjustmentValue: 1000,
    })
    const on = day('2026-12-10')
    assert.equal(PricingRuleService.adjustDay(BASE, on, [suvOnly], economy).amount, BASE)
    assert.equal(
      PricingRuleService.adjustDay(BASE, on, [suvOnly], { categoryId: 'cat-suv' }).amount,
      56250
    )
    assert.equal(PricingRuleService.adjustDay(BASE, on, [oneCar], economy).amount, 49500)
    assert.equal(
      PricingRuleService.adjustDay(BASE, on, [oneCar], { categoryId: 'cat-economy', carId: 'x' })
        .amount,
      BASE
    )

    oneCar.active = false
    assert.equal(PricingRuleService.adjustDay(BASE, on, [oneCar], economy).amount, BASE)
  })
})

async function setup() {
  const ownerRole = await Role.create({ name: 'Owner', slug: 'owner', isSuperAdmin: true })
  const pricingView = await Permission.create({
    name: 'View pricing',
    slug: 'pricing.view',
    group: 'pricing',
  })
  await Permission.create({ name: 'Manage pricing', slug: 'pricing.manage', group: 'pricing' })
  const deskRole = await Role.create({ name: 'Front Desk', slug: 'front-desk' })
  await deskRole.related('permissions').attach([pricingView.id])
  const owner = await User.create({
    email: 'owner@wynk.test',
    password: 'Password123!',
    roleId: ownerRole.id,
  })
  const desk = await User.create({
    email: 'desk@wynk.test',
    password: 'Password123!',
    roleId: deskRole.id,
  })
  const suv = await Category.create({ name: 'SUV', slug: 'suv', seats: 7 })
  return { owner, desk, suv }
}

const christmas = {
  name: 'Christmas season',
  type: 'season',
  dateFrom: '2026-12-20',
  dateTo: '2027-01-05',
  recursYearly: true,
  adjustmentType: 'percent',
  adjustmentValue: 2500,
  minRentalDays: 3,
}

test.group('pricing rules API', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('creates, updates and deletes a rule, all audited', async ({ client, assert }) => {
    const { owner, suv } = await setup()

    const created = await client
      .post('/api/v1/admin/pricing-rules')
      .json({ ...christmas, appliesTo: 'categories', categoryIds: [suv.id] })
      .loginAs(owner)
    created.assertStatus(201)
    const data = json(created).data
    assert.equal(data.minRentalDays, 3)
    assert.isTrue(data.recursYearly)
    assert.deepEqual(data.categories, [{ id: suv.id, label: 'SUV' }])

    const updated = await client
      .put(`/api/v1/admin/pricing-rules/${data.id}`)
      .json({ ...christmas, adjustmentValue: 3000 })
      .loginAs(owner)
    updated.assertStatus(200)
    assert.equal(json(updated).data.adjustmentValue, 3000)
    assert.equal(json(updated).data.appliesTo, 'all')
    assert.deepEqual(json(updated).data.categoryIds, [])

    const deleted = await client.delete(`/api/v1/admin/pricing-rules/${data.id}`).loginAs(owner)
    deleted.assertStatus(200)
    assert.isNull(await PricingRule.find(data.id))

    const actions = await AuditLog.query().where('subject_id', data.id).orderBy('created_at')
    assert.sameMembers(
      actions.map((log) => log.action),
      ['pricing_rule.created', 'pricing_rule.updated', 'pricing_rule.deleted']
    )
  })

  test('a one-day holiday ends on its start date; weekend rules keep only weekdays', async ({
    client,
    assert,
  }) => {
    const { owner } = await setup()
    const holiday = await client
      .post('/api/v1/admin/pricing-rules')
      .json({
        name: 'Independence Day',
        type: 'holiday',
        dateFrom: '2027-03-06',
        weekdays: [1],
        adjustmentType: 'fixed',
        adjustmentValue: 5000,
      })
      .loginAs(owner)
    holiday.assertStatus(201)
    assert.equal(json(holiday).data.dateTo, '2027-03-06')
    assert.deepEqual(json(holiday).data.weekdays, [])

    const weekend = await client
      .post('/api/v1/admin/pricing-rules')
      .json({
        name: 'Weekends',
        type: 'weekend',
        weekdays: [7, 5, 6],
        recursYearly: true,
        adjustmentType: 'percent',
        adjustmentValue: 1000,
      })
      .loginAs(owner)
    weekend.assertStatus(201)
    assert.deepEqual(json(weekend).data.weekdays, [5, 6, 7])
    assert.isFalse(json(weekend).data.recursYearly)
  })

  test('explains invalid rules', async ({ client }) => {
    const { owner } = await setup()
    const post = (body: Record<string, unknown>) =>
      client.post('/api/v1/admin/pricing-rules').json(body).loginAs(owner)

    const cases = [
      { ...christmas, dateFrom: null, dateTo: null }, // season without dates
      { ...christmas, type: 'weekend', weekdays: [] }, // weekend without days
      { ...christmas, adjustmentValue: 0 }, // no change
      { ...christmas, adjustmentValue: 60000 }, // +600%
      { ...christmas, appliesTo: 'categories', categoryIds: [] }, // no categories
      { ...christmas, appliesTo: 'cars', carIds: ['01NOTACAR00000000000000000'] },
      { ...christmas, dateFrom: '2026-01-01', dateTo: '2027-01-05' }, // yearly but > 1 year
      { ...christmas, dateFrom: '2027-01-05', dateTo: '2026-12-20', recursYearly: false },
    ]
    for (const body of cases) {
      const response = await post(body)
      response.assertStatus(422)
    }
  })

  test('front desk can view rules but not change them', async ({ client }) => {
    const { desk } = await setup()
    const list = await client.get('/api/v1/admin/pricing-rules').loginAs(desk)
    list.assertStatus(200)
    const create = await client.post('/api/v1/admin/pricing-rules').json(christmas).loginAs(desk)
    create.assertStatus(403)
  })
})
