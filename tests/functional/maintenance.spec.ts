import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import Branch from '#models/branch'
import Business from '#models/business'
import Car from '#models/car'
import Category from '#models/category'
import Customer from '#models/customer'
import AlertRecipient from '#models/alert_recipient'
import CarAllocation from '#models/car_allocation'
import Expense from '#models/expense'
import ExpenseCategory from '#models/expense_category'
import MaintenanceSchedule from '#models/maintenance_schedule'
import Notification from '#models/notification'
import OutboundMessage from '#models/outbound_message'
import MaintenanceAlerts from '#services/maintenance/maintenance_alerts'
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
    vinChassisNo: 'VINMAINT0001XYZ',
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
  const opsRole = await role('ops', ['maintenance.view'])
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
  const second = await Car.create({
    branchId: branch.id,
    categoryId: category.id,
    make: 'Toyota',
    model: 'Yaris',
    year: 2021,
    colour: 'White',
    registrationNo: 'GR 5678-21',
    vinChassisNo: 'VINMAINT0002XYZ',
    transmission: 'auto',
    fuelType: 'petrol',
    seats: 5,
    doors: 4,
    luggage: 2,
    currentOdometerKm: 20_000,
    status: 'active',
  })
  for (const [name, slug] of [
    ['Servicing', 'servicing'],
    ['Repairs & parts', 'repairs'],
  ]) {
    await ExpenseCategory.firstOrCreate({ slug }, { name, slug, sortOrder: 1, active: true })
  }
  return { car, second, category, customer, owner, viewer, desk }
}

const accra = () => DateTime.now().setZone('Africa/Accra')
const day = (offset: number) => accra().plus({ days: offset }).toISODate()!
const at = (offset: number, time = '09:00') => `${day(offset)}T${time}`

test.group('maintenance', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('schedules by time: every car in a category, due soon and overdue', async ({
    client,
    assert,
  }) => {
    const ctx = await setup()
    // Done 80 days ago, every 3 months: due in about 10 days
    const created = await client
      .post('/api/v1/admin/maintenance/schedules')
      .json({
        categoryId: ctx.category.id,
        task: 'Engine oil service',
        intervalMonths: 3,
        lastDoneOn: day(-80),
      })
      .loginAs(ctx.owner)
    created.assertStatus(201)
    assert.equal(json(created).data.count, 2)
    // One overdue for the second car
    await client
      .post('/api/v1/admin/maintenance/schedules')
      .json({ carIds: [ctx.second.id], task: 'Brake check', intervalMonths: 6, nextDueOn: day(-3) })
      .loginAs(ctx.owner)

    const due = json(
      await client
        .get('/api/v1/admin/maintenance/schedules')
        .qs({ state: 'due' })
        .loginAs(ctx.viewer)
    )
    assert.equal(due.meta.overdue, 1)
    assert.equal(due.meta.dueSoon, 2)
    assert.equal(due.data[0].task, 'Brake check')
    assert.equal(due.data[0].state, 'overdue')
    assert.equal(due.data[0].daysLeft, -3)
    const oil = due.data.find((row: any) => row.carId === ctx.car.id)
    assert.equal(oil.nextDueOn, DateTime.fromISO(day(-80)).plus({ months: 3 }).toISODate())

    // View only: can't add one
    const denied = await client
      .post('/api/v1/admin/maintenance/schedules')
      .json({ carIds: [ctx.car.id], task: 'AC service', intervalMonths: 12 })
      .loginAs(ctx.viewer)
    denied.assertStatus(403)
  })

  test('a job card takes the car off the road, then completing it records the cost', async ({
    client,
    assert,
  }) => {
    const ctx = await setup()
    await client
      .post('/api/v1/admin/maintenance/schedules')
      .json({
        carIds: [ctx.car.id],
        task: 'Engine oil service',
        intervalMonths: 3,
        nextDueOn: day(2),
      })
      .loginAs(ctx.owner)
    const schedule = await MaintenanceSchedule.query().where('car_id', ctx.car.id).firstOrFail()

    const opened = await client
      .post('/api/v1/admin/job-cards')
      .json({
        carId: ctx.car.id,
        type: 'service',
        title: 'Oil and filters',
        doneBy: 'garage',
        garageName: 'Kwame’s Garage',
        openedAt: at(1, '08:00'),
        expectedBackAt: at(2, '17:00'),
        lines: [
          { kind: 'part', description: 'Engine oil 4L', quantity: 1, unitAmount: 35_000 },
          { kind: 'part', description: 'Oil filter', quantity: 2, unitAmount: 5_000 },
          { kind: 'labour', description: 'Labour', quantity: 1, unitAmount: 15_000 },
        ],
        scheduleIds: [schedule.id],
      })
      .loginAs(ctx.owner)
    opened.assertStatus(201)
    const card = json(opened).data
    assert.match(card.number, /^JC-\d{4}-00001$/)
    assert.equal(card.totalAmount, 60_000)
    assert.isTrue(card.offRoad)

    // The car can't be booked while it's in
    const clash = await client
      .post('/api/v1/admin/bookings')
      .json({
        customerId: ctx.customer.id,
        carId: ctx.car.id,
        pickupAt: at(2, '09:00'),
        returnAt: at(4, '09:00'),
        driveType: 'self_drive',
        source: 'phone',
        confirm: true,
      })
      .loginAs(ctx.owner)
    assert.oneOf(clash.status(), [409, 422])

    // Completed: free again, cost recorded against the car, schedule moved on
    const completed = await client
      .post(`/api/v1/admin/job-cards/${card.id}/complete`)
      .json({ odometerKm: 1500, paidVia: 'momo' })
      .loginAs(ctx.owner)
    completed.assertStatus(200)
    assert.equal(json(completed).data.status, 'completed')
    assert.isFalse(json(completed).data.offRoad)
    const expense = await Expense.findOrFail(json(completed).data.expenseId)
    assert.equal(expense.amount, 60_000)
    assert.equal(expense.carId, ctx.car.id)
    assert.equal(expense.status, 'approved')
    await schedule.refresh()
    assert.equal(schedule.lastDoneOn?.toISODate(), accra().toISODate())
    assert.equal(schedule.nextDueOn.toISODate(), accra().plus({ months: 3 }).toISODate())
    await ctx.car.refresh()
    assert.equal(ctx.car.currentOdometerKm, 1500)

    // Closed: can't be changed or completed again
    const again = await client
      .post(`/api/v1/admin/job-cards/${card.id}/complete`)
      .json({ paidVia: 'cash' })
      .loginAs(ctx.owner)
    again.assertStatus(409)
  })

  test('a booking in the way is named; cancelling frees the car', async ({ client, assert }) => {
    const ctx = await setup()
    const booked = await client
      .post('/api/v1/admin/bookings')
      .json({
        customerId: ctx.customer.id,
        carId: ctx.car.id,
        pickupAt: at(3, '09:00'),
        returnAt: at(5, '09:00'),
        driveType: 'self_drive',
        source: 'phone',
        confirm: true,
      })
      .loginAs(ctx.owner)
    booked.assertStatus(201)
    const fields = {
      carId: ctx.car.id,
      type: 'repair',
      title: 'Brake pads',
      doneBy: 'in_house',
      mechanicName: 'Yaw',
    }
    const blocked = await client
      .post('/api/v1/admin/job-cards')
      .json({ ...fields, openedAt: at(1), expectedBackAt: at(4) })
      .loginAs(ctx.owner)
    blocked.assertStatus(409)
    assert.include(json(blocked).message, json(booked).data.reference)

    const opened = await client
      .post('/api/v1/admin/job-cards')
      .json({ ...fields, openedAt: at(1), expectedBackAt: at(2) })
      .loginAs(ctx.owner)
    opened.assertStatus(201)
    const card = json(opened).data
    // Pushing it back into the booking is refused too
    const pushed = await client
      .put(`/api/v1/admin/job-cards/${card.id}`)
      .json({ ...fields, status: 'waiting_parts', openedAt: at(1), expectedBackAt: at(4) })
      .loginAs(ctx.owner)
    pushed.assertStatus(409)

    const cancelled = await client
      .post(`/api/v1/admin/job-cards/${card.id}/cancel`)
      .json({ reason: 'Parts not available' })
      .loginAs(ctx.owner)
    cancelled.assertStatus(200)
    const allocation = await CarAllocation.query().where('source', 'maintenance').firstOrFail()
    assert.isFalse(allocation.active)

    // Open list vs all
    const open = json(await client.get('/api/v1/admin/job-cards').loginAs(ctx.viewer))
    assert.lengthOf(open.data, 0)
    const all = json(
      await client.get('/api/v1/admin/job-cards').qs({ status: 'all' }).loginAs(ctx.viewer)
    )
    assert.lengthOf(all.data, 1)
  })

  test('daily alerts: bell once per milestone, one summary to whoever has it switched on', async ({
    client,
    assert,
  }) => {
    const ctx = await setup()
    await AlertRecipient.create({
      name: 'Fleet lead',
      phone: '+233201112222',
      email: 'fleet@wynk.test',
      alerts: { maintenance_due: ['sms', 'email'] },
      active: true,
    })
    await AlertRecipient.create({
      name: 'Off',
      phone: '+233201113333',
      email: 'off@wynk.test',
      alerts: { maintenance_due: [] },
      active: true,
    })
    for (const [carId, nextDueOn] of [
      [ctx.car.id, day(0)],
      [ctx.second.id, day(-7)],
    ]) {
      await client
        .post('/api/v1/admin/maintenance/schedules')
        .json({ carIds: [carId], task: 'Engine oil service', intervalMonths: 3, nextDueOn })
        .loginAs(ctx.owner)
    }
    // Not a milestone (due in 5 days, reminded 14 ahead)
    await client
      .post('/api/v1/admin/maintenance/schedules')
      .json({ carIds: [ctx.car.id], task: 'AC service', intervalMonths: 12, nextDueOn: day(5) })
      .loginAs(ctx.owner)

    const first = await MaintenanceAlerts.check()
    assert.equal(first.alerted, 2)
    assert.equal(
      (await Notification.query()
        .where('type', 'maintenance_due')
        .count('* as n')
        .then((r) => Number(r[0].$extras.n))) > 0,
      true
    )
    const sent = await OutboundMessage.query().where('kind', 'staff_maintenance_due')
    assert.sameMembers(
      sent.map((message) => `${message.channel}:${message.to}`),
      ['sms:+233201112222', 'email:fleet@wynk.test']
    )
    assert.include(sent.find((message) => message.channel === 'sms')!.body, '2 services')

    const second = await MaintenanceAlerts.check()
    assert.equal(second.alerted, 0)
  })
})
