import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import BlacklistEntry from '#models/blacklist_entry'
import Booking from '#models/booking'
import Branch from '#models/branch'
import Business from '#models/business'
import Car from '#models/car'
import Category from '#models/category'
import Customer from '#models/customer'
import Extra from '#models/extra'
import Notification from '#models/notification'
import OutboundMessage from '#models/outbound_message'
import Payment from '#models/payment'
import RatePlan from '#models/rate_plan'
import Role from '#models/role'
import User from '#models/user'
import BookingService from '#services/bookings/booking_service'

const json = (response: { body(): unknown }) => response.body() as Record<string, any>

async function setup() {
  const business = await Business.create({
    name: 'Wynk',
    email: 'admin@wynk.test',
    timezone: 'Africa/Accra',
    momoNumber: '+233241234567',
    momoName: 'Wynk Car Rentals',
    momoNetwork: 'mtn',
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
    defaultDepositAmount: 50_000,
  })
  const car = (listed: boolean, plate: string) =>
    Car.create({
      branchId: branch.id,
      categoryId: category.id,
      make: 'Toyota',
      model: listed ? 'Yaris' : 'Hidden',
      year: 2023,
      colour: 'White',
      registrationNo: plate,
      vinChassisNo: `VIN${plate.replace(/\W/g, '')}PUBLIC`,
      transmission: 'auto',
      fuelType: 'petrol',
      seats: 5,
      doors: 4,
      luggage: 2,
      currentOdometerKm: 1000,
      status: 'active',
      isListedOnline: listed,
    })
  const listed = await car(true, 'GR 1001-23')
  const hidden = await car(false, 'GR 1002-23')
  await RatePlan.create({
    categoryId: category.id,
    driveType: 'self_drive',
    dailyAmount: 40_000,
    mileageMode: 'default',
    fuelIncluded: false,
    active: true,
  })
  const ownerRole = await Role.create({ name: 'Owner', slug: 'owner', isSuperAdmin: true })
  const owner = await User.create({
    email: 'owner@wynk.test',
    password: 'Password123!',
    roleId: ownerRole.id,
  })
  return { listed, hidden, owner }
}

const trip = (carId: string) => ({
  carId,
  pickupAt: '2030-03-04T09:00',
  returnAt: '2030-03-07T09:00',
  driveType: 'self_drive' as const,
})

const booking = (carId: string, phone = '0241112233', extra: Record<string, unknown> = {}) => ({
  ...trip(carId),
  paymentPlan: 'deposit' as const,
  acceptTerms: true as const,
  customer: { fullName: 'Esi Mensah', phone, email: 'esi@example.com', dateOfBirth: '1990-04-04' },
  ...extra,
})

test.group('public website', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('site and cars: only listed cars, priced for the dates, nothing private', async ({
    client,
    assert,
  }) => {
    const { listed } = await setup()
    const site = json(await client.get('/api/v1/public/site')).data
    assert.equal(site.business.name, 'Wynk')
    assert.isTrue(site.rules.onlineBookings)
    assert.notProperty(site.business, 'tin')

    const undated = json(await client.get('/api/v1/public/cars')).data
    assert.lengthOf(undated, 1)
    assert.equal(undated[0].id, listed.id)
    assert.equal(undated[0].fromPerDay, 40_000)
    assert.notProperty(undated[0], 'registrationNo')

    const dated = json(
      await client
        .get('/api/v1/public/cars')
        .qs({ pickupAt: '2030-03-04T09:00', returnAt: '2030-03-07T09:00' })
    ).data
    assert.equal(dated[0].price.rentalDays, 3)
    assert.equal(dated[0].price.perDay, 40_000)

    const car = await client.get(`/api/v1/public/cars/${listed.id}`).qs(trip(listed.id))
    car.assertStatus(200)
    assert.notProperty(json(car).data.quote, 'car') // no registration number in the quote
  })

  test('book, follow the private link, say "I’ve paid"; staff verify and it is confirmed', async ({
    client,
    assert,
  }) => {
    const { listed, owner } = await setup()
    const made = await client.post('/api/v1/public/bookings').json(booking(listed.id))
    made.assertStatus(201)
    const { reference, token } = json(made).data

    const saved = await Booking.findByOrFail('reference', reference)
    assert.equal(saved.status, 'pending')
    assert.equal(saved.source, 'website')
    assert.isNull(saved.createdBy)
    assert.notEqual(saved.publicTokenHash, token) // only the hash is stored
    const holdHours = saved.holdExpiresAt!.diff(DateTime.now(), 'hours').hours
    assert.closeTo(holdHours, 24, 0.1)
    const customer = await Customer.findOrFail(saved.customerId)
    assert.equal(customer.phone, '+233241112233')
    assert.equal(customer.source, 'website')
    const alerts = await Notification.query().where('type', 'booking.online')
    assert.isAbove(alerts.length, 0)

    const page = json(await client.get(`/api/v1/public/bookings/${token}`)).data
    assert.equal(page.status, 'pending')
    assert.equal(page.payTo.momo.number, '+233241234567')
    assert.equal(page.owedNow, saved.reservationFeeAmount)
    assert.equal(page.customerFirstName, 'Esi')
    assert.notProperty(page, 'customer')

    // A second unpaid booking on the same phone is refused
    const again = await client.post('/api/v1/public/bookings').json(booking(listed.id))
    again.assertStatus(422)

    // "I've paid" - waits for staff, keeps the car
    const paid = await client
      .post(`/api/v1/public/bookings/${token}/payments`)
      .json({ method: 'momo', transactionRef: '5512 3456 78', payerName: 'Esi M' })
    paid.assertStatus(201)
    assert.equal(json(paid).data.pendingAmount, saved.reservationFeeAmount)
    const payment = await Payment.findByOrFail('booking_id', saved.id)
    assert.equal(payment.status, 'pending_verification')
    assert.isNull(payment.recordedBy)
    await BookingService.expireHolds(DateTime.now().plus({ days: 2 }))
    await saved.refresh()
    assert.equal(saved.status, 'pending')

    const verified = await client.post(`/api/v1/admin/payments/${payment.id}/verify`).loginAs(owner)
    verified.assertStatus(200)
    const after = json(await client.get(`/api/v1/public/bookings/${token}`)).data
    assert.equal(after.status, 'confirmed')
    assert.equal(after.owedNow, 0)

    const wrong = await client.get('/api/v1/public/bookings/not-a-real-token-at-all-xx')
    wrong.assertStatus(404)

    // Messages: recorded for SMS and email, never sent from tests; the link works
    const messages = await OutboundMessage.query()
      .where('booking_id', saved.id)
      .orderBy('created_at')
    const kinds = messages.map((message) => `${message.channel}:${message.kind}`)
    assert.includeMembers(kinds, [
      'sms:booking_received',
      'email:booking_received',
      'sms:booking_confirmed',
      'email:booking_confirmed',
    ])
    const received = messages.find((message) => message.kind === 'booking_received')!
    assert.include(received.body, reference)
    assert.include(received.body, `/booking/${token}`)
    assert.include(received.body, '0241234567') // where to pay, as people dial it

    // "Find my booking": the same answer whether or not it matches; a match texts the link
    for (const phone of ['0241112233', '0200000000']) {
      const lookup = await client.post('/api/v1/public/bookings/lookup').json({ reference, phone })
      lookup.assertStatus(200)
      assert.include(json(lookup).message, 'If those details match')
    }
    const links = await OutboundMessage.query()
      .where('booking_id', saved.id)
      .where('kind', 'booking_link')
    assert.lengthOf(
      links.filter((message) => message.channel === 'sms'),
      1
    )
    assert.include(links[0].body, `/booking/${token}`)
  })

  test('refused: an existing customer is matched (not overwritten); blacklist, short notice, offline extras, bots', async ({
    client,
    assert,
  }) => {
    const { listed } = await setup()
    const branch = await Branch.query().firstOrFail()
    const known = await Customer.create({
      branchId: branch.id,
      fullName: 'Kofi Known',
      phone: '+233209998877',
      verificationStatus: 'unverified',
    })
    const made = await client
      .post('/api/v1/public/bookings')
      .json(booking(listed.id, '020 999 8877', { paymentPlan: 'full' }))
    made.assertStatus(201)
    await known.refresh()
    assert.equal(known.fullName, 'Kofi Known')
    assert.equal(known.email, 'esi@example.com') // gap filled
    const page = json(await client.get(`/api/v1/public/bookings/${json(made).data.token}`)).data
    assert.equal(page.owedNow, page.total) // paying in full

    // Blacklisted: refused without saying why
    await BlacklistEntry.create({
      phone: '+233207776655',
      reason: 'unpaid_balance',
      severity: 'block',
    })
    const blocked = await client.post('/api/v1/public/bookings').json(
      booking(listed.id, '0207776655', {
        pickupAt: '2030-04-01T09:00',
        returnAt: '2030-04-03T09:00',
      })
    )
    blocked.assertStatus(422)
    assert.include(json(blocked).message, 'can’t take this booking online')
    assert.notInclude(json(blocked).message, 'blacklist')

    // Less than the notice period (3 hours by default)
    const soon = DateTime.now().setZone('Africa/Accra').plus({ hours: 1 })
    const short = await client.post('/api/v1/public/bookings').json(
      booking(listed.id, '0245556677', {
        pickupAt: soon.toFormat("yyyy-LL-dd'T'HH:mm"),
        returnAt: soon.plus({ days: 2 }).toFormat("yyyy-LL-dd'T'HH:mm"),
      })
    )
    short.assertStatus(422)

    // An extra that isn't offered online
    const offline = await Extra.create({
      name: 'Staff-only extra',
      chargeType: 'per_rental',
      amount: 1000,
      active: true,
      availableOnline: false,
    })
    const withExtra = await client
      .post('/api/v1/public/bookings')
      .json(booking(listed.id, '0245556688', { extras: [{ extraId: offline.id, quantity: 1 }] }))
    withExtra.assertStatus(422)

    // The hidden field filled in: a bot
    const bot = await client
      .post('/api/v1/public/bookings')
      .json(booking(listed.id, '0245556699', { website: 'https://spam.example' }))
    bot.assertStatus(422)
  })

  test('online booking can be switched off', async ({ client, assert }) => {
    const { listed, owner } = await setup()
    await client
      .put('/api/v1/admin/settings')
      .json({ values: { 'booking.online_bookings_enabled': false } })
      .loginAs(owner)
    const paused = await client
      .post('/api/v1/public/bookings')
      .json(booking(listed.id, '0245556600'))
    paused.assertStatus(422)
    assert.include(json(paused).message, 'paused')
  })
})
