import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import Branch from '#models/branch'
import Business from '#models/business'
import Car from '#models/car'
import Category from '#models/category'
import Customer from '#models/customer'
import Permission from '#models/permission'
import RatePlan from '#models/rate_plan'
import Role from '#models/role'
import User from '#models/user'

const json = (response: { body(): unknown }) => response.body() as Record<string, any>

async function role(slug: string, permissions: string[]) {
  const created = await Role.create({ name: slug, slug })
  const ids = []
  for (const permission of permissions) {
    const row = await Permission.firstOrCreate(
      { slug: permission },
      { name: permission, slug: permission, group: permission.split('.')[0] }
    )
    ids.push(row.id)
  }
  await created.related('permissions').attach(ids)
  return created
}

async function setup() {
  const business = await Business.create({
    name: 'Wynk',
    email: 'admin@wynk.test',
    timezone: 'Africa/Accra',
  })
  const branch = await Branch.create({
    businessId: business.id,
    name: 'Main',
    code: 'MAIN',
    isMain: true,
  })
  const category = await Category.create({
    name: 'Economy',
    slug: 'economy',
    seats: 5,
    defaultDepositAmount: 100_000,
  })
  const car = await Car.create({
    branchId: branch.id,
    categoryId: category.id,
    make: 'Toyota',
    model: 'Corolla',
    year: 2022,
    colour: 'Silver',
    registrationNo: 'GR 1234-22',
    vinChassisNo: 'VINREPORTS01XYZ',
    transmission: 'auto',
    fuelType: 'petrol',
    seats: 5,
    doors: 4,
    luggage: 2,
    currentOdometerKm: 1000,
    status: 'active',
  })
  await RatePlan.create({
    categoryId: category.id,
    driveType: 'self_drive',
    dailyAmount: 45_000,
    mileageMode: 'default',
    fuelIncluded: false,
    active: true,
  })
  const customer = await Customer.create({
    branchId: branch.id,
    fullName: 'Ama Owusu',
    phone: '+233241234567',
    dateOfBirth: DateTime.fromISO('1990-05-14'),
  })
  const ownerRole = await Role.create({ name: 'Owner', slug: 'owner', isSuperAdmin: true })
  const opsRole = await role('ops', ['reports.view', 'exports.run', 'bookings.view'])
  const deskRole = await role('desk', ['bookings.view'])
  const owner = await User.create({
    email: 'owner@wynk.test',
    fullName: 'Ama Owner',
    password: 'Password123!',
    roleId: ownerRole.id,
  })
  const viewer = await User.create({
    email: 'viewer@wynk.test',
    password: 'Password123!',
    roleId: opsRole.id,
  })
  const desk = await User.create({
    email: 'desk@wynk.test',
    password: 'Password123!',
    roleId: deskRole.id,
  })
  return { car, customer, owner, viewer, desk }
}

const today = () => DateTime.now().setZone('Africa/Accra').toISODate()!

test.group('reports & exports', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('overview: money collected, bookings, cancellations, rentals, tax - money only for financial', async ({
    client,
    assert,
  }) => {
    const ctx = await setup()
    const book = async (pickupAt: string, returnAt: string) => {
      const created = await client
        .post('/api/v1/admin/bookings')
        .json({
          customerId: ctx.customer.id,
          carId: ctx.car.id,
          pickupAt,
          returnAt,
          driveType: 'self_drive',
          source: 'phone',
          confirm: true,
        })
        .loginAs(ctx.owner)
      created.assertStatus(201)
      return json(created).data
    }
    const kept = await book('2030-03-04T09:00', '2030-03-07T09:00')
    const paid = await client
      .post(`/api/v1/admin/bookings/${kept.id}/payments`)
      .json({ type: 'rental', method: 'cash', amount: 45_000 })
      .loginAs(ctx.owner)
    paid.assertStatus(201)
    const dropped = await book('2030-04-04T09:00', '2030-04-06T09:00')
    const cancelled = await client
      .post(`/api/v1/admin/bookings/${dropped.id}/cancel`)
      .json({ reason: 'Plans changed' })
      .loginAs(ctx.owner)
    cancelled.assertStatus(200)

    // This period: money in, bookings made, the cancellation
    const now = json(
      await client
        .get('/api/v1/admin/reports/overview')
        .qs({ dateFrom: today(), dateTo: today() })
        .loginAs(ctx.owner)
    ).data
    assert.isTrue(now.financial)
    assert.equal(now.kpis.collected.net, 45_000)
    assert.equal(now.kpis.bookings.count, 2)
    assert.deepEqual(
      now.payments.byMethod.find((row: { method: string }) => row.method === 'cash'),
      {
        method: 'cash',
        count: 1,
        in: 45_000,
        out: 0,
      }
    )
    assert.equal(now.payments.byStaff[0].name, 'Ama Owner')
    assert.equal(now.cancellations.cancelled, 1)
    assert.closeTo(now.cancellations.rate, 0.5, 0.001)
    assert.equal(now.bookings.bySource[0].source, 'phone')
    assert.equal(now.daily.length, 1)
    assert.equal(now.daily[0].net, 45_000)

    // The rental month: one rental of 3 days, its tax, the car's row
    const march = json(
      await client
        .get('/api/v1/admin/reports/overview')
        .qs({ dateFrom: '2030-03-01', dateTo: '2030-03-31' })
        .loginAs(ctx.owner)
    ).data
    assert.equal(march.kpis.rentals.count, 1)
    assert.equal(march.kpis.rentals.days, 3)
    assert.equal(march.fleet.byCar[0].registrationNo, 'GR 1234-22')
    assert.equal(march.fleet.byCar[0].rentals, 1)
    assert.equal(march.taxes.total, kept.taxAmount)
    assert.equal(march.taxes.rentals, 1)

    // Reports without reports.financial: counts and percentages, no money
    const plain = json(
      await client
        .get('/api/v1/admin/reports/overview')
        .qs({ dateFrom: today(), dateTo: today() })
        .loginAs(ctx.viewer)
    ).data
    assert.isFalse(plain.financial)
    assert.isNull(plain.kpis.collected)
    assert.isNull(plain.payments)
    assert.isNull(plain.taxes)
    assert.isNull(plain.kpis.outstanding.amount)
    assert.equal(plain.kpis.bookings.count, 2)

    // No reports.view: refused
    const refused = await client
      .get('/api/v1/admin/reports/overview')
      .qs({ dateFrom: today(), dateTo: today() })
      .loginAs(ctx.desk)
    refused.assertStatus(403)
  })

  test('exports: CSV and Excel, the data permission too, no ID numbers', async ({
    client,
    assert,
  }) => {
    const ctx = await setup()
    const created = await client
      .post('/api/v1/admin/bookings')
      .json({
        customerId: ctx.customer.id,
        carId: ctx.car.id,
        pickupAt: '2030-03-04T09:00',
        returnAt: '2030-03-07T09:00',
        driveType: 'self_drive',
        source: 'walk_in',
        confirm: true,
      })
      .loginAs(ctx.owner)
    const reference = json(created).data.reference

    const csv = await client
      .get('/api/v1/admin/exports/bookings')
      .qs({ format: 'csv' })
      .loginAs(ctx.viewer)
    csv.assertStatus(200)
    assert.include(csv.header('content-type'), 'text/csv')
    assert.include(csv.header('content-disposition'), 'bookings.csv')
    const text = csv.text()
    assert.include(text, 'Reference,Status,Source')
    assert.include(text, reference)
    assert.include(text, 'Ama Owusu')

    const xlsx = await client
      .get('/api/v1/admin/exports/bookings')
      .qs({ format: 'xlsx', dateFrom: '2030-03-01', dateTo: '2030-03-31' })
      .loginAs(ctx.viewer)
    xlsx.assertStatus(200)
    assert.include(xlsx.header('content-disposition'), 'bookings-2030-03-01-to-2030-03-31.xlsx')

    // exports.run alone isn't enough: payments need payments.view
    const payments = await client.get('/api/v1/admin/exports/payments').loginAs(ctx.viewer)
    payments.assertStatus(403)

    // Customers: what the list shows, never ID numbers
    const customers = await client
      .get('/api/v1/admin/exports/customers')
      .qs({ format: 'csv' })
      .loginAs(ctx.owner)
    customers.assertStatus(200)
    assert.include(customers.text(), 'Ama Owusu')
    assert.notInclude(customers.text().toLowerCase(), 'ghana card')
    assert.notInclude(customers.text().toLowerCase(), 'licence')

    const unknown = await client.get('/api/v1/admin/exports/salaries').loginAs(ctx.owner)
    unknown.assertStatus(404)
  })
})
