import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import Branch from '#models/branch'
import Business from '#models/business'
import Car from '#models/car'
import Category from '#models/category'
import Customer from '#models/customer'
import OutboundMessage from '#models/outbound_message'
import Setting from '#models/setting'
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
    vinChassisNo: 'VINCONFIRM01XYZ',
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
    email: 'ama@example.test',
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

const confirmations = (bookingId: string) =>
  OutboundMessage.query().where('booking_id', bookingId).where('kind', 'staff_booking_confirmed')

test.group('booking confirmation for staff bookings', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  const book = (client: any, ctx: Awaited<ReturnType<typeof setup>>, confirm: boolean, days = 30) =>
    client
      .post('/api/v1/admin/bookings')
      .json({
        customerId: ctx.customer.id,
        carId: ctx.car.id,
        pickupAt: DateTime.now()
          .plus({ days })
          .set({ hour: 9, minute: 0 })
          .toFormat("yyyy-MM-dd'T'HH:mm"),
        returnAt: DateTime.now()
          .plus({ days: days + 3 })
          .set({ hour: 9, minute: 0 })
          .toFormat("yyyy-MM-dd'T'HH:mm"),
        driveType: 'self_drive',
        source: 'phone',
        confirm,
      })
      .loginAs(ctx.owner)

  test('booked and confirmed at once: SMS and email with the details, once', async ({
    client,
    assert,
  }) => {
    const ctx = await setup()
    const created = await book(client, ctx, true)
    created.assertStatus(201)
    const booking = json(created).data
    const sent = await confirmations(booking.id)
    assert.sameMembers(
      sent.map((message) => `${message.channel}:${message.to}`),
      ['sms:+233241234567', 'email:ama@example.test']
    )
    const sms = sent.find((message) => message.channel === 'sms')!
    assert.include(sms.body, booking.reference)
    assert.include(sms.body, 'confirmed')
    assert.include(sms.body, 'driving licence')
    assert.equal(
      sent.find((message) => message.channel === 'email')!.subject,
      `Booking confirmed - ${booking.reference}`
    )
  })

  test('held first, confirmed later (button or reservation fee): sent then, not twice', async ({
    client,
    assert,
  }) => {
    const ctx = await setup()
    const held = json(await book(client, ctx, false)).data
    assert.lengthOf(await confirmations(held.id), 0)
    const confirmed = await client
      .post(`/api/v1/admin/bookings/${held.id}/confirm`)
      .loginAs(ctx.owner)
    confirmed.assertStatus(200)
    assert.lengthOf(await confirmations(held.id), 2)

    // Confirmed by a payment covering the reservation fee
    const other = json(await book(client, ctx, false, 40)).data
    const paid = await client
      .post(`/api/v1/admin/bookings/${other.id}/payments`)
      .json({ type: 'rental', method: 'cash', amount: other.totalAmount })
      .loginAs(ctx.owner)
    paid.assertStatus(201)
    assert.lengthOf(await confirmations(other.id), 2)
    const afterPayment = await confirmations(other.id)
    const paidSms = afterPayment.find((message) => message.channel === 'sms')!
    assert.notInclude(paidSms.body, 'Balance')
  })

  test('switched off in Settings: nothing sent', async ({ client, assert }) => {
    const ctx = await setup()
    await Setting.create({
      key: 'reminders.staff_booking_confirmation',
      value: false,
      branchId: null,
    })
    const booking = json(await book(client, ctx, true)).data
    assert.lengthOf(await confirmations(booking.id), 0)
  })
})
