import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import Branch from '#models/branch'
import Business from '#models/business'
import Car from '#models/car'
import Category from '#models/category'
import ExpenseCategory from '#models/expense_category'
import Permission from '#models/permission'
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
  const category = await Category.create({ name: 'Economy', slug: 'economy', seats: 5 })
  const car = await Car.create({
    branchId: branch.id,
    categoryId: category.id,
    make: 'Toyota',
    model: 'Corolla',
    year: 2022,
    colour: 'Silver',
    registrationNo: 'GR 1234-22',
    vinChassisNo: 'VINEXPENSES01XY',
    transmission: 'auto',
    fuelType: 'petrol',
    seats: 5,
    doors: 4,
    luggage: 2,
    currentOdometerKm: 1000,
    status: 'active',
  })
  const fuel = await ExpenseCategory.firstOrCreate(
    { slug: 'fuel' },
    { name: 'Fuel', slug: 'fuel', sortOrder: 1, active: true }
  )
  const rent = await ExpenseCategory.firstOrCreate(
    { slug: 'rent' },
    { name: 'Rent', slug: 'rent', sortOrder: 10, active: true }
  )
  const ownerRole = await Role.create({ name: 'Owner', slug: 'owner', isSuperAdmin: true })
  const clerkRole = await role('clerk', ['expenses.view', 'expenses.manage'])
  const readerRole = await role('reader', ['expenses.view'])
  const owner = await User.create({
    email: 'owner@wynk.test',
    fullName: 'Ama Owner',
    password: 'Password123!',
    roleId: ownerRole.id,
  })
  const clerk = await User.create({
    email: 'clerk@wynk.test',
    fullName: 'Kofi Clerk',
    password: 'Password123!',
    roleId: clerkRole.id,
  })
  const reader = await User.create({
    email: 'reader@wynk.test',
    password: 'Password123!',
    roleId: readerRole.id,
  })
  return { car, fuel, rent, owner, clerk, reader }
}

const today = () => DateTime.now().setZone('Africa/Accra').toISODate()!

test.group('expenses', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('a clerk adds one for approval; an approver decides; only approved ones count', async ({
    client,
    assert,
  }) => {
    const ctx = await setup()
    const fuel = {
      categoryId: ctx.fuel.id,
      carId: ctx.car.id,
      description: 'Fuel before a long rental',
      vendor: 'Shell Airport',
      amount: 50_000,
      paidVia: 'momo',
      paidAt: today(),
    }

    // Added by the clerk: waiting
    const added = await client.post('/api/v1/admin/expenses').json(fuel).loginAs(ctx.clerk)
    added.assertStatus(201)
    const expense = json(added).data
    assert.equal(expense.status, 'submitted')
    assert.equal(expense.submittedBy, 'Kofi Clerk')
    assert.equal(expense.car.registrationNo, 'GR 1234-22')

    // The clerk can correct it while it waits, but not approve it
    const corrected = await client
      .put(`/api/v1/admin/expenses/${expense.id}`)
      .json({ ...fuel, amount: 55_000 })
      .loginAs(ctx.clerk)
    corrected.assertStatus(200)
    assert.equal(json(corrected).data.amount, 55_000)
    const denied = await client
      .post(`/api/v1/admin/expenses/${expense.id}/approve`)
      .loginAs(ctx.clerk)
    denied.assertStatus(403)

    // Not in the reports yet
    const before = await client
      .get('/api/v1/admin/reports/overview')
      .qs({ dateFrom: today(), dateTo: today() })
      .loginAs(ctx.owner)
    before.assertStatus(200)
    assert.equal(json(before).data.expenses.total, 0)

    // Approved: the clerk can't change it any more
    const approved = await client
      .post(`/api/v1/admin/expenses/${expense.id}/approve`)
      .loginAs(ctx.owner)
    approved.assertStatus(200)
    assert.equal(json(approved).data.status, 'approved')
    assert.equal(json(approved).data.approvedBy, 'Ama Owner')
    const locked = await client
      .put(`/api/v1/admin/expenses/${expense.id}`)
      .json({ ...fuel, amount: 1 })
      .loginAs(ctx.clerk)
    locked.assertStatus(403)

    // The owner's own entries are approved at once; a rejected one doesn't count
    const office = await client
      .post('/api/v1/admin/expenses')
      .json({
        categoryId: ctx.rent.id,
        description: 'Office rent',
        amount: 300_000,
        paidVia: 'bank_transfer',
        paidAt: today(),
      })
      .loginAs(ctx.owner)
    office.assertStatus(201)
    assert.equal(json(office).data.status, 'approved')
    const wrong = await client
      .post('/api/v1/admin/expenses')
      .json({ ...fuel, description: 'Duplicate fuel', amount: 55_000 })
      .loginAs(ctx.clerk)
    const rejected = await client
      .post(`/api/v1/admin/expenses/${json(wrong).data.id}/reject`)
      .json({ reason: 'Already entered' })
      .loginAs(ctx.owner)
    rejected.assertStatus(200)
    assert.equal(json(rejected).data.rejectReason, 'Already entered')

    // The list: filters and totals
    const list = await client.get('/api/v1/admin/expenses').loginAs(ctx.reader)
    list.assertStatus(200)
    assert.lengthOf(json(list).data, 3)
    assert.deepEqual(json(list).meta.totals, {
      approved: { count: 2, amount: 355_000 },
      submitted: { count: 0, amount: 0 },
    })
    const forCar = await client
      .get('/api/v1/admin/expenses')
      .qs({ carId: ctx.car.id, status: 'approved' })
      .loginAs(ctx.reader)
    assert.lengthOf(json(forCar).data, 1)
    const searched = await client
      .get('/api/v1/admin/expenses')
      .qs({ search: 'shell' })
      .loginAs(ctx.reader)
    assert.lengthOf(json(searched).data, 2)

    // A reader can't add one
    const readOnly = await client.post('/api/v1/admin/expenses').json(fuel).loginAs(ctx.reader)
    readOnly.assertStatus(403)

    // Reports: by category, spent and earned-less-spent per car
    const after = await client
      .get('/api/v1/admin/reports/overview')
      .qs({ dateFrom: today(), dateTo: today() })
      .loginAs(ctx.owner)
    const report = json(after).data
    assert.equal(report.expenses.total, 355_000)
    assert.equal(report.expenses.general, 300_000)
    assert.deepEqual(
      report.expenses.byCategory.map((row: any) => [row.name, row.amount]),
      [
        ['Rent', 300_000],
        ['Fuel', 55_000],
      ]
    )
    const car = report.fleet.byCar.find((row: any) => row.id === ctx.car.id)
    assert.equal(car.spent, 55_000)
    assert.equal(car.profit, -55_000)
  })

  test('checks: the date, the category, and the export', async ({ client, assert }) => {
    const ctx = await setup()
    const future = await client
      .post('/api/v1/admin/expenses')
      .json({
        categoryId: ctx.fuel.id,
        description: 'Fuel',
        amount: 1000,
        paidVia: 'cash',
        paidAt: DateTime.now().plus({ days: 3 }).toISODate(),
      })
      .loginAs(ctx.owner)
    future.assertStatus(422)
    const noCategory = await client
      .post('/api/v1/admin/expenses')
      .json({
        categoryId: 'nope',
        description: 'Fuel',
        amount: 1000,
        paidVia: 'cash',
        paidAt: today(),
      })
      .loginAs(ctx.owner)
    noCategory.assertStatus(422)

    const options = await client.get('/api/v1/admin/expenses/options').loginAs(ctx.reader)
    options.assertStatus(200)
    assert.isTrue(json(options).data.categories.some((row: any) => row.slug === 'fuel'))
    assert.equal(json(options).data.cars[0].registrationNo, 'GR 1234-22')

    await client
      .post('/api/v1/admin/expenses')
      .json({
        categoryId: ctx.fuel.id,
        carId: ctx.car.id,
        description: 'Fuel, "full tank"',
        amount: 12_345,
        paidVia: 'cash',
        paidAt: today(),
      })
      .loginAs(ctx.owner)
    const csv = await client
      .get('/api/v1/admin/exports/expenses')
      .qs({ format: 'csv', dateFrom: today(), dateTo: today() })
      .loginAs(ctx.owner)
    csv.assertStatus(200)
    const text = csv.text()
    assert.include(text, 'Paid,Category,Description')
    assert.include(text, '"Fuel, ""full tank"""')
    assert.include(text, '123.45')
  })
})
