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

    // The prefix comes from the business profile (new references only)
    const owner = await User.findByOrFail('email', 'owner@wynk.test')
    await expectStatus(
      client.put('/api/v1/admin/business').json({ documentPrefix: 'acr' }).loginAs(owner),
      200
    )
    const renamed = await client
      .post(url)
      .json(
        booking(customer.id, car.id, { pickupAt: '2030-05-06T09:00', returnAt: '2030-05-07T09:00' })
      )
      .loginAs(desk)
    assert.match(json(renamed).data.reference, /^ACR-\d{4}-00003$/)
    await expectStatus(
      client.put('/api/v1/admin/business').json({ documentPrefix: 'W-1' }).loginAs(owner),
      422
    )

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
    // Expired: not upcoming any more
    const upcoming = await client
      .get('/api/v1/admin/bookings')
      .qs({ customerId: customer.id, upcoming: true })
      .loginAs(desk)
    assert.lengthOf(json(upcoming).data, 0)

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

test.group('changes and drivers', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test("extend at today's rates, refuse a clash, change dates, swap the car", async ({
    client,
    assert,
  }) => {
    const { car, customer, desk } = await setup()
    const url = '/api/v1/admin/bookings'
    const created = await client
      .post(url)
      .json(booking(customer.id, car.id, { confirm: true }))
      .loginAs(desk)
    const id = json(created).data.id
    const change = (body: Record<string, unknown>, preview = false) =>
      client
        .post(`${url}/${id}/modifications${preview ? '/preview' : ''}`)
        .json(body)
        .loginAs(desk)

    // One more day (Thu -> Fri) at GHS 450, added to the agreed GHS 1,350
    const preview = await change({ type: 'extend', returnAt: '2030-03-08T09:00' }, true)
    preview.assertStatus(200)
    assert.equal(json(preview).data.priceDifference, 45_000)
    const extended = await change({ type: 'extend', returnAt: '2030-03-08T09:00' })
    extended.assertStatus(200)
    assert.equal(json(extended).data.totalAmount, 180_000)
    assert.equal(json(extended).data.modifications[0].type, 'extend')
    const allocation = await CarAllocation.findByOrFail('booking_id', id)
    assert.equal(
      allocation.endsAt.toISO(),
      DateTime.fromISO('2030-03-08T09:00', { zone: 'Africa/Accra' }).toISO()
    )

    // Someone books the car from Saturday; extending into it is refused
    const other = await Customer.create({
      branchId: customer.branchId,
      fullName: 'Kojo',
      phone: '+233241111112',
    })
    await expectStatus(
      client
        .post(url)
        .json(
          booking(other.id, car.id, { pickupAt: '2030-03-09T12:00', returnAt: '2030-03-10T12:00' })
        )
        .loginAs(desk),
      201
    )
    await expectStatus(change({ type: 'extend', returnAt: '2030-03-09T13:00' }), 409)

    // New dates, re-priced as a whole (4 days)
    const moved = await change({
      type: 'change_dates',
      pickupAt: '2030-04-01T09:00',
      returnAt: '2030-04-05T09:00',
    })
    moved.assertStatus(200)
    assert.equal(json(moved).data.totalAmount, 180_000)
    assert.equal(json(moved).data.quote.rentalDays, 4)

    // Swap to another car at the agreed price; a reason is required
    const second = await Car.create({
      branchId: car.branchId,
      categoryId: car.categoryId,
      make: 'Kia',
      model: 'Rio',
      year: 2023,
      colour: 'Red',
      registrationNo: 'GR 5555-23',
      vinChassisNo: 'VINSWAP0001XYZ',
      transmission: 'auto',
      fuelType: 'petrol',
      seats: 5,
      doors: 4,
      luggage: 2,
      currentOdometerKm: 10,
      status: 'active',
    })
    await expectStatus(change({ type: 'swap_car', carId: second.id }), 422)
    const swapped = await change({
      type: 'swap_car',
      carId: second.id,
      reason: 'Corolla needs a repair',
    })
    swapped.assertStatus(200)
    assert.equal(json(swapped).data.car.id, second.id)
    assert.equal(json(swapped).data.totalAmount, 180_000)
    await allocation.refresh()
    assert.equal(allocation.carId, second.id)

    // Early return only for a car out on rent (check-out is Phase 4)
    await expectStatus(change({ type: 'early_return' }), 422)
  })

  test('drivers: one booking at a time, freed on cancel, licence must cover the trip', async ({
    client,
    assert,
  }) => {
    const { car, customer, desk, owner } = await setup()
    await RatePlan.create({
      categoryId: car.categoryId,
      driveType: 'chauffeur',
      dailyAmount: 80_000,
      mileageMode: 'default',
      fuelIncluded: false,
      active: true,
    })
    const second = await Car.create({
      branchId: car.branchId,
      categoryId: car.categoryId,
      make: 'Kia',
      model: 'Rio',
      year: 2023,
      colour: 'Red',
      registrationNo: 'GR 6666-23',
      vinChassisNo: 'VINDRIVER001XYZ',
      transmission: 'auto',
      fuelType: 'petrol',
      seats: 5,
      doors: 4,
      luggage: 2,
      currentOdometerKm: 10,
      status: 'active',
    })
    const created = await client
      .post('/api/v1/admin/drivers')
      .json({
        fullName: 'Yaw Driver',
        phone: '024 555 0001',
        licenceNo: 'dl-777',
        licenceExpiresOn: '2031-01-01',
      })
      .loginAs(owner)
    created.assertStatus(201)
    const driverId = json(created).data.id

    const chauffeur = { driveType: 'chauffeur' }
    const first = await client
      .post('/api/v1/admin/bookings')
      .json(booking(customer.id, car.id, chauffeur))
      .loginAs(desk)
    const secondBooking = await client
      .post('/api/v1/admin/bookings')
      .json(booking(customer.id, second.id, chauffeur))
      .loginAs(desk)
    const assign = (bookingId: string, id: string | null) =>
      client.put(`/api/v1/admin/bookings/${bookingId}/driver`).json({ driverId: id }).loginAs(owner)

    await expectStatus(assign(json(first).data.id, driverId), 200)
    await expectStatus(assign(json(secondBooking).data.id, driverId), 409)
    // Free drivers for that time: none
    const free = await client
      .get('/api/v1/admin/drivers')
      .qs({ availableFrom: '2030-03-04T09:00', availableTo: '2030-03-07T09:00' })
      .loginAs(owner)
    assert.lengthOf(json(free).data, 0)

    await expectStatus(
      client
        .post(`/api/v1/admin/bookings/${json(first).data.id}/cancel`)
        .json({ reason: 'Trip off' })
        .loginAs(owner),
      200
    )
    await expectStatus(assign(json(secondBooking).data.id, driverId), 200)

    // A licence that runs out before the return can't be assigned
    const expiring = await client
      .post('/api/v1/admin/drivers')
      .json({
        fullName: 'Ama Driver',
        phone: '024 555 0002',
        licenceNo: 'DL-888',
        licenceExpiresOn: '2030-03-05',
      })
      .loginAs(owner)
    await expectStatus(assign(json(secondBooking).data.id, json(expiring).data.id), 422)
    // Self-drive bookings don't get drivers
    const selfDrive = await client
      .post('/api/v1/admin/bookings')
      .json(
        booking(customer.id, car.id, { pickupAt: '2030-06-03T09:00', returnAt: '2030-06-04T09:00' })
      )
      .loginAs(desk)
    await expectStatus(assign(json(selfDrive).data.id, driverId), 422)
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
