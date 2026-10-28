import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import Branch from '#models/branch'
import Business from '#models/business'
import Car from '#models/car'
import Category from '#models/category'
import Customer from '#models/customer'
import AlertRecipient from '#models/alert_recipient'
import Expense from '#models/expense'
import ExpenseCategory from '#models/expense_category'
import OutboundMessage from '#models/outbound_message'
import Booking from '#models/booking'
import CarDamage from '#models/car_damage'
import Incident from '#models/incident'
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
    vinChassisNo: 'VININCID0001XYZ',
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
  const opsRole = await role('ops', ['incidents.view', 'incidents.manage'])
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
    vinChassisNo: 'VININCID0002XYZ',
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
    ['Fines & penalties', 'fines'],
  ]) {
    await ExpenseCategory.firstOrCreate({ slug }, { name, slug, sortOrder: 1, active: true })
  }
  return { car, second, category, customer, owner, viewer, desk }
}

const accra = () => DateTime.now().setZone('Africa/Accra')
const at = (offsetDays: number, time = '09:00') =>
  `${accra().plus({ days: offsetDays }).toISODate()}T${time}`

/** A rental that already happened: booked through the API, then moved into the past and returned. */
async function pastRental(client: any, ctx: Awaited<ReturnType<typeof setup>>) {
  const created = await client
    .post('/api/v1/admin/bookings')
    .json({
      customerId: ctx.customer.id,
      carId: ctx.car.id,
      pickupAt: at(30),
      returnAt: at(33),
      driveType: 'self_drive',
      source: 'phone',
      confirm: true,
    })
    .loginAs(ctx.owner)
  created.assertStatus(201)
  const booking = await Booking.findOrFail(json(created).data.id)
  booking.merge({
    status: 'closed',
    pickupAt: accra().minus({ days: 10 }).set({ hour: 9, minute: 0 }),
    returnAt: accra().minus({ days: 7 }).set({ hour: 9, minute: 0 }),
    actualPickupAt: accra().minus({ days: 10 }).set({ hour: 9, minute: 30 }),
    actualReturnAt: accra().minus({ days: 7 }).set({ hour: 8, minute: 0 }),
    paidAmount: booking.totalAmount,
    balanceAmount: 0,
  })
  await booking.save()
  return booking
}

test.group('damage, accidents & traffic fines', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('a fine finds who had the car; charging it reopens their closed booking', async ({
    client,
    assert,
  }) => {
    const ctx = await setup()
    const booking = await pastRental(client, ctx)

    // Who had it - shown before saving
    const match = await client
      .get('/api/v1/admin/incidents/match')
      .qs({ carId: ctx.car.id, at: at(-8, '14:20') })
      .loginAs(ctx.viewer)
    assert.equal(json(match).data.reference, booking.reference)
    assert.equal(json(match).data.customerName, 'Ama Owusu')

    const recorded = await client
      .post('/api/v1/admin/traffic-fines')
      .json({
        carId: ctx.car.id,
        offence: 'Speeding - 92 km/h in a 50 zone',
        reference: 'MTTD-77812',
        issuedAt: at(-8, '14:20'),
        amount: 30_000,
        adminFeeAmount: 5_000,
      })
      .loginAs(ctx.viewer)
    recorded.assertStatus(201)
    const fine = json(recorded).data
    assert.equal(fine.bookingId, booking.id)
    assert.include(json(recorded).message, 'Ama Owusu')

    const charged = await client
      .post(`/api/v1/admin/traffic-fines/${fine.id}/charge`)
      .loginAs(ctx.viewer)
    charged.assertStatus(200)
    assert.equal(json(charged).data.status, 'charged_to_customer')
    await booking.refresh()
    assert.equal(booking.status, 'returned')
    assert.equal(booking.balanceAmount, 35_000)
    const again = await client
      .post(`/api/v1/admin/traffic-fines/${fine.id}/charge`)
      .loginAs(ctx.viewer)
    again.assertStatus(409)

    // Nobody had the car: can't be charged; the business pays it (an expense) or it's cancelled
    const loose = json(
      await client
        .post('/api/v1/admin/traffic-fines')
        .json({ carId: ctx.car.id, offence: 'Parking', issuedAt: at(-2, '10:00'), amount: 10_000 })
        .loginAs(ctx.viewer)
    ).data
    assert.isNull(loose.bookingId)
    const noBooking = await client
      .post(`/api/v1/admin/traffic-fines/${loose.id}/charge`)
      .loginAs(ctx.viewer)
    noBooking.assertStatus(422)
    const paid = await client
      .post(`/api/v1/admin/traffic-fines/${loose.id}/pay`)
      .json({ paidVia: 'momo' })
      .loginAs(ctx.owner)
    paid.assertStatus(200)
    const expense = await Expense.findOrFail(json(paid).data.expenseId)
    assert.equal(expense.amount, 10_000)
    assert.equal(expense.carId, ctx.car.id)

    const list = json(await client.get('/api/v1/admin/traffic-fines').loginAs(ctx.viewer))
    assert.lengthOf(list.data, 2)
    assert.equal(list.meta.unpaid.count, 0)

    // Future dates are refused
    const future = await client
      .post('/api/v1/admin/traffic-fines')
      .json({ carId: ctx.car.id, offence: 'Parking', issuedAt: at(2), amount: 10_000 })
      .loginAs(ctx.viewer)
    future.assertStatus(422)
  })

  test('an accident: matched booking, team alert, charged up to the excess', async ({
    client,
    assert,
  }) => {
    const ctx = await setup()
    const booking = await pastRental(client, ctx)
    await AlertRecipient.create({
      name: 'Fleet lead',
      phone: '+233201112222',
      email: 'fleet@wynk.test',
      alerts: { incident_reported: ['sms', 'email'] },
      active: true,
    })

    const reported = await client
      .post('/api/v1/admin/incidents')
      .json({
        carId: ctx.car.id,
        type: 'accident',
        occurredAt: at(-9, '18:45'),
        location: 'Spintex Road',
        description: 'Rear-ended at the traffic light. Rear bumper and boot lid dented.',
        policeReportNo: 'GPS/ACC/2231',
        thirdParty: { name: 'Kojo Asante', vehicleReg: 'GT 4521-19', insurer: 'Enterprise' },
        repairEstimateAmount: 450_000,
      })
      .loginAs(ctx.viewer)
    reported.assertStatus(201)
    const incident = json(reported).data
    assert.match(incident.number, /^INC-\d{4}-00001$/)
    assert.equal(incident.bookingId, booking.id)
    assert.equal(incident.thirdParty.vehicleReg, 'GT 4521-19')
    const alerts = await OutboundMessage.query().where('kind', 'staff_incident_reported')
    assert.lengthOf(alerts, 2)

    // The excess from the booking's protection (none in this setup) - any amount is fine
    const charged = await client
      .post(`/api/v1/admin/incidents/${incident.id}/charge`)
      .json({ amount: 150_000 })
      .loginAs(ctx.viewer)
    charged.assertStatus(200)
    assert.equal(json(charged).data.charged.amount, 150_000)
    await booking.refresh()
    assert.equal(booking.balanceAmount, 150_000)
    const twice = await client
      .post(`/api/v1/admin/incidents/${incident.id}/charge`)
      .json({ amount: 1_000 })
      .loginAs(ctx.viewer)
    twice.assertStatus(409)

    const closed = await client
      .post(`/api/v1/admin/incidents/${incident.id}/close`)
      .loginAs(ctx.viewer)
    assert.equal(json(closed).data.status, 'closed')
    const desk = await client.get('/api/v1/admin/incidents').loginAs(ctx.desk)
    desk.assertStatus(403)
  })

  test('above the excess needs a manager and a reason', async ({ client }) => {
    const ctx = await setup()
    const booking = await pastRental(client, ctx)
    booking.priceSnapshot = {
      ...booking.priceSnapshot,
      protection: { id: 'x', name: 'Standard', excessAmount: 200_000 },
    }
    await booking.save()
    const incident = await Incident.create({
      number: 'INC-2026-09999',
      branchId: booking.branchId,
      carId: ctx.car.id,
      bookingId: booking.id,
      type: 'accident',
      status: 'open',
      occurredAt: accra().minus({ days: 9 }),
      description: 'Side swipe',
      claimStatus: 'not_filed',
      photoFileIds: [],
    })
    const tooMuch = await client
      .post(`/api/v1/admin/incidents/${incident.id}/charge`)
      .json({ amount: 300_000 })
      .loginAs(ctx.viewer)
    tooMuch.assertStatus(422)
    const noReason = await client
      .post(`/api/v1/admin/incidents/${incident.id}/charge`)
      .json({ amount: 300_000 })
      .loginAs(ctx.owner)
    noReason.assertStatus(422)
    const ok = await client
      .post(`/api/v1/admin/incidents/${incident.id}/charge`)
      .json({ amount: 300_000, overExcessReason: 'Driving under the influence - cover void' })
      .loginAs(ctx.owner)
    ok.assertStatus(200)
  })

  test('damage register: open marks, a job card that repairs them, fair wear', async ({
    client,
    assert,
  }) => {
    const ctx = await setup()
    const dent = await CarDamage.create({
      carId: ctx.car.id,
      zone: 'rear_bumper',
      x: 50,
      y: 90,
      type: 'dent',
      severity: 'moderate',
      note: 'From the Spintex accident',
    })
    const scratch = await CarDamage.create({
      carId: ctx.car.id,
      zone: 'left_front_door',
      x: 20,
      y: 40,
      type: 'scratch',
      severity: 'minor',
    })
    const open = json(
      await client.get('/api/v1/admin/damages').qs({ carId: ctx.car.id }).loginAs(ctx.viewer)
    )
    assert.lengthOf(open.data, 2)

    // A job card that repairs the dent marks it repaired when completed
    const job = json(
      await client
        .post('/api/v1/admin/job-cards')
        .json({
          carId: ctx.car.id,
          type: 'accident',
          title: 'Rear bumper',
          doneBy: 'garage',
          garageName: 'Body Shop',
          openedAt: at(0, '08:00'),
          damageIds: [dent.id],
          lines: [{ kind: 'part', description: 'Bumper', quantity: 1, unitAmount: 200_000 }],
        })
        .loginAs(ctx.owner)
    ).data
    const completed = await client
      .post(`/api/v1/admin/job-cards/${job.id}/complete`)
      .json({ paidVia: 'cash' })
      .loginAs(ctx.owner)
    completed.assertStatus(200)
    await dent.refresh()
    assert.equal(dent.resolution, 'repaired')
    assert.equal(dent.repairedJobCardId, job.id)

    // The scratch: fair wear
    const wear = await client
      .post(`/api/v1/admin/damages/${scratch.id}/resolve`)
      .json({ resolution: 'accepted_wear', note: 'Light, not worth fixing' })
      .loginAs(ctx.viewer)
    wear.assertStatus(200)
    const left = json(
      await client.get('/api/v1/admin/damages').qs({ carId: ctx.car.id }).loginAs(ctx.viewer)
    )
    assert.lengthOf(left.data, 0)
    assert.equal(left.meta.openCount, 0)
  })
})
