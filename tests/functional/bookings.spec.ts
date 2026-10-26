import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import Role from '#models/role'
import Permission from '#models/permission'
import User from '#models/user'
import Business from '#models/business'
import Branch from '#models/branch'
import Category from '#models/category'
import Car from '#models/car'
import CarAllocation from '#models/car_allocation'
import Customer from '#models/customer'
import RatePlan from '#models/rate_plan'
import Booking from '#models/booking'
import BookingService from '#services/bookings/booking_service'

const json = (response: { body(): unknown }) => response.body() as Record<string, any>

async function expectStatus(
  request: PromiseLike<{ assertStatus(status: number): void }>,
  status: number
) {
  const response = await request
  response.assertStatus(status)
}

/** Economy self-drive at GHS 450/day; a front-desk role and a driver role with nothing. */
async function setup() {
  const business = await Business.create({
    name: 'Wynk Car Rentals',
    email: 'admin@wynk.test',
    timezone: 'Africa/Accra',
    vatRegistered: false,
  })
  const branch = await Branch.create({
    businessId: business.id,
    name: 'Main',
    code: 'MAIN',
    isMain: true,
  })
  const economy = await Category.create({
    name: 'Economy',
    slug: 'economy',
    seats: 5,
    defaultDepositAmount: 100_000,
  })
  const car = await Car.create({
    branchId: branch.id,
    categoryId: economy.id,
    make: 'Toyota',
    model: 'Corolla',
    year: 2022,
    colour: 'Silver',
    registrationNo: 'GR 1234-22',
    vinChassisNo: 'VINBOOKING0001XYZ',
    transmission: 'auto',
    fuelType: 'petrol',
    seats: 5,
    doors: 4,
    luggage: 2,
    currentOdometerKm: 1000,
    status: 'active',
  })
  await RatePlan.create({
    categoryId: economy.id,
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

  const perms: Record<string, Permission> = {}
  for (const slug of [
    'bookings.view',
    'bookings.create',
    'bookings.update',
    'bookings.cancel',
    'bookings.override',
  ]) {
    perms[slug] = await Permission.create({ name: slug, slug, group: 'bookings' })
  }
  const ownerRole = await Role.create({ name: 'Owner', slug: 'owner', isSuperAdmin: true })
  const deskRole = await Role.create({ name: 'Front Desk', slug: 'front-desk' })
  await deskRole
    .related('permissions')
    .attach(
      ['bookings.view', 'bookings.create', 'bookings.update', 'bookings.cancel'].map(
        (slug) => perms[slug].id
      )
    )
  const driverRole = await Role.create({ name: 'Driver', slug: 'driver' })
  const user = (email: string, roleId: string) =>
    User.create({ email, password: 'Password123!', roleId })
  return {
    car,
    customer,
    owner: await user('owner@wynk.test', ownerRole.id),
    desk: await user('desk@wynk.test', deskRole.id),
    driver: await user('driver@wynk.test', driverRole.id),
  }
}

// Monday 09:00 -> Thursday 09:00 (3 days) far in the future: free cancellation tier
const booking = (customerId: string, carId: string, extra: Record<string, unknown> = {}) => ({
  customerId,
  carId,
  pickupAt: '2030-03-04T09:00',
  returnAt: '2030-03-07T09:00',
  driveType: 'self_drive',
  source: 'phone',
  ...extra,
})

test.group('bookings', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('book, refuse a clash, confirm, cancel frees the car', async ({ client, assert }) => {
    const { car, customer, desk } = await setup()
    const url = '/api/v1/admin/bookings'

    const held = await client.post(url).json(booking(customer.id, car.id)).loginAs(desk)
    held.assertStatus(201)
    const data = json(held).data
    assert.match(data.reference, /^WYK-\d{4}-00001$/)
    assert.equal(data.status, 'pending')
    assert.isNotNull(data.holdExpiresAt)
    assert.equal(data.totalAmount, 135_000) // the quote, frozen
    assert.equal(data.quote.rentalDays, 3)
    const allocation = await CarAllocation.findByOrFail('booking_id', data.id)
    assert.equal(allocation.source, 'hold')

    // Same car, overlapping (inside the turnaround time after the return)
    const clash = await client
      .post(url)
      .json(
        booking(customer.id, car.id, { pickupAt: '2030-03-07T10:00', returnAt: '2030-03-08T10:00' })
      )
      .loginAs(desk)
    clash.assertStatus(409)

    const confirmed = await client.post(`${url}/${data.id}/confirm`).loginAs(desk)
    confirmed.assertStatus(200)
    await allocation.refresh()
    assert.equal(allocation.source, 'booking')

    // The calendar shows it on the car's row, with the turnaround time after the return
    const calendar = await client
      .get('/api/v1/admin/calendar')
      .qs({ from: '2030-03-01', to: '2030-03-10' })
      .loginAs(desk)
    const [item] = json(calendar).data[0].items
    assert.equal(item.booking.reference, data.reference)
    assert.equal(item.booking.status, 'confirmed')
    assert.isAbove(Date.parse(item.endsAtWithBuffer), Date.parse(item.endsAt))

    const preview = await client.get(`${url}/${data.id}/cancellation-preview`).loginAs(desk)
    assert.equal(json(preview).data.tier, 'free')
    assert.equal(json(preview).data.feeAmount, 0)

    const cancelled = await client
      .post(`${url}/${data.id}/cancel`)
      .json({ reason: 'Customer changed plans' })
      .loginAs(desk)
    cancelled.assertStatus(200)
    assert.equal(json(cancelled).data.status, 'cancelled')
    await allocation.refresh()
    assert.isFalse(Boolean(allocation.active))

    // The car is free again; the next booking gets the next number
    const again = await client.post(url).json(booking(customer.id, car.id)).loginAs(desk)
    again.assertStatus(201)
    assert.match(json(again).data.reference, /-00002$/)

    // A cancelled booking can't be confirmed; a future one can't be a no-show yet
    await expectStatus(client.post(`${url}/${data.id}/confirm`).loginAs(desk), 422)
    await expectStatus(client.post(`${url}/${json(again).data.id}/no-show`).loginAs(desk), 422)

    const history = await client.get(`${url}/${data.id}/history`).loginAs(desk)
    assert.deepEqual(
      json(history).data.map((entry: any) => entry.action),
      ['booking.created', 'booking.confirmed', 'booking.cancelled']
    )
  })

  test('blacklist, under-age driver and big discounts need a manager', async ({
    client,
    assert,
  }) => {
    const { car, customer, desk, owner } = await setup()
    const url = '/api/v1/admin/bookings'

    // Discounts: a reason, and at most 10% (GHS 135.00 of 1,350.00) for front desk
    await expectStatus(
      client
        .post(url)
        .json(booking(customer.id, car.id, { discountAmount: 10_000 }))
        .loginAs(desk),
      422
    )
    const big = { discountAmount: 20_000, discountReason: 'Loyal customer' }
    await expectStatus(
      client
        .post(url)
        .json(booking(customer.id, car.id, big))
        .loginAs(desk),
      422
    )
    const ok = await client
      .post(url)
      .json(
        booking(customer.id, car.id, { discountAmount: 13_500, discountReason: 'Loyal customer' })
      )
      .loginAs(desk)
    ok.assertStatus(201)
    assert.equal(json(ok).data.totalAmount, 121_500)
    await Booking.query().delete()
    await CarAllocation.query().delete()

    customer.blacklistSeverity = 'block'
    await customer.save()
    await expectStatus(client.post(url).json(booking(customer.id, car.id)).loginAs(desk), 422)
    await expectStatus(client.post(url).json(booking(customer.id, car.id)).loginAs(owner), 422)
    const overridden = await client
      .post(url)
      .json(booking(customer.id, car.id, { overrideReason: 'Debt settled, owner approved' }))
      .loginAs(owner)
    overridden.assertStatus(201)
    assert.equal(json(overridden).data.overrideReason, 'Debt settled, owner approved')

    const teen = await Customer.create({
      branchId: customer.branchId,
      fullName: 'Kofi Young',
      phone: '+233241111111',
      dateOfBirth: DateTime.fromISO('2012-01-01'),
    })
    const young = await client
      .post(url)
      .json(
        booking(teen.id, car.id, { pickupAt: '2030-04-01T09:00', returnAt: '2030-04-02T09:00' })
      )
      .loginAs(desk)
    young.assertStatus(422)
    assert.equal(json(young).errors[0].field, 'customerId')
  })

  test('holds expire and free the car; permissions', async ({ client, assert }) => {
    const { car, customer, desk, driver } = await setup()
    const created = await client
      .post('/api/v1/admin/bookings')
      .json(booking(customer.id, car.id))
      .loginAs(desk)
    const held = await Booking.findOrFail(json(created).data.id)
    held.holdExpiresAt = DateTime.now().minus({ minutes: 1 })
    await held.save()

    assert.equal(await BookingService.expireHolds(), 1)
    await held.refresh()
    assert.equal(held.status, 'expired')
    const allocation = await CarAllocation.findByOrFail('booking_id', held.id)
    assert.isFalse(Boolean(allocation.active))

    await expectStatus(client.get('/api/v1/admin/bookings').loginAs(driver), 403)
    await expectStatus(
      client.post('/api/v1/admin/bookings').json(booking(customer.id, car.id)).loginAs(driver),
      403
    )
    const list = await client
      .get('/api/v1/admin/bookings')
      .qs({ customerId: customer.id })
      .loginAs(desk)
    assert.equal(json(list).data.length, 1)

    // Calendar: the car's row shows the (expired) booking only while its hold was active -
    // now released, so the row is empty but the car is still listed
    const calendar = await client
      .get('/api/v1/admin/calendar')
      .qs({ from: '2030-03-01', to: '2030-03-10' })
      .loginAs(desk)
    assert.equal(json(calendar).data[0].car.id, car.id)
    assert.lengthOf(json(calendar).data[0].items, 0)

    // The car is free again: availability finds it by plate, paginated, with filters
    const free = await client
      .get('/api/v1/admin/availability')
      .qs({
        from: '2030-03-04T09:00',
        to: '2030-03-07T09:00',
        search: 'GR1234',
        transmission: 'auto',
        limit: 12,
      })
      .loginAs(desk)
    assert.deepEqual(
      json(free).data.map((found: any) => found.id),
      [car.id]
    )
    assert.equal(json(free).meta.total, 1)
  })
})

test.group('today board', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('pickups, holds to confirm, late pickups, fleet and the week', async ({
    client,
    assert,
  }) => {
    const { car, customer, desk } = await setup()
    const pickup = DateTime.now().setZone('Africa/Accra').plus({ hours: 2 })
    // Later today, held; the customer has no checked ID yet
    const created = await client
      .post('/api/v1/admin/bookings')
      .json(
        booking(customer.id, car.id, {
          pickupAt: pickup.toFormat("yyyy-MM-dd'T'HH:mm"),
          returnAt: pickup.plus({ days: 2 }).toFormat("yyyy-MM-dd'T'HH:mm"),
        })
      )
      .loginAs(desk)
    created.assertStatus(201)
    const held = await Booking.findOrFail(json(created).data.id)
    held.holdExpiresAt = DateTime.now().plus({ hours: 1 })
    await held.save()

    let board = json(await client.get('/api/v1/admin/today').loginAs(desk)).data
    // The pickup may cross midnight when the suite runs late at night
    if (pickup.hasSame(DateTime.now().setZone('Africa/Accra'), 'day')) {
      assert.equal(board.counts.pickups, 1)
      assert.equal(board.pickups[0].reference, held.reference)
      assert.isFalse(board.pickups[0].readiness.ready)
      assert.include(board.pickups[0].readiness.issues, 'ID and driving licence not verified')
      assert.equal(board.week[0].pickups, 1)
    }
    assert.equal(board.counts.holds, 1)
    // No roadworthy or insurance on file: the car can't legally go out
    assert.equal(board.cars[0].id, car.id)
    assert.equal(board.cars[0].level, 'critical')
    assert.equal(board.fleet.total, 1)
    assert.equal(board.fleet.available, 1) // held from later today, free right now

    // Pickup time came and went yesterday: a possible no-show
    held.pickupAt = DateTime.now().minus({ days: 1 })
    await held.save()
    const allocation = await CarAllocation.findByOrFail('booking_id', held.id)
    allocation.startsAt = held.pickupAt
    await allocation.save()
    board = json(await client.get('/api/v1/admin/today').loginAs(desk)).data
    assert.equal(board.counts.latePickups, 1)
    assert.equal(board.fleet.booked, 1) // its hold now covers this moment
  })
})

// No global transaction here: the requests must really race on separate connections
test.group('bookings concurrency', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('five simultaneous bookings of one car: exactly one wins', async ({ client, assert }) => {
    const { car, customer, desk } = await setup()
    const responses = await Promise.all(
      Array.from({ length: 5 }, () =>
        client.post('/api/v1/admin/bookings').json(booking(customer.id, car.id)).loginAs(desk)
      )
    )
    const statuses = responses.map((response) => response.status()).sort()
    assert.deepEqual(statuses, [201, 409, 409, 409, 409])
    const active = await CarAllocation.query().where('car_id', car.id).where('active', true)
    assert.lengthOf(active, 1)
    assert.lengthOf(await Booking.all(), 1)
  })
})
