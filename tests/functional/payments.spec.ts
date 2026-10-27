import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import Booking from '#models/booking'
import Branch from '#models/branch'
import Business from '#models/business'
import Car from '#models/car'
import Category from '#models/category'
import Customer from '#models/customer'
import Permission from '#models/permission'
import RatePlan from '#models/rate_plan'
import Role from '#models/role'
import User from '#models/user'
import BookingService from '#services/bookings/booking_service'

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
  const business = await Business.create({ name: 'Wynk', email: 'admin@wynk.test' })
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
    vinChassisNo: 'VINPAYMENTS01XYZ',
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
  const owner = await User.create({
    email: 'owner@wynk.test',
    password: 'Password123!',
    roleId: ownerRole.id,
  })
  const deskRole = await role('front-desk', [
    'bookings.view',
    'payments.view',
    'payments.record',
    'payments.refund',
  ])
  const accountantRole = await role('accountant', [
    'payments.view',
    'payments.verify',
    'payments.void',
  ])
  const desk = await User.create({
    email: 'desk@wynk.test',
    fullName: 'Kofi Desk',
    password: 'Password123!',
    roleId: deskRole.id,
  })
  const accountant = await User.create({
    email: 'accounts@wynk.test',
    password: 'Password123!',
    roleId: accountantRole.id,
  })
  return { car, customer, owner, desk, accountant }
}

/** A booking made by the owner; `confirm: false` leaves it pending (held). */
async function book(client: any, ctx: Awaited<ReturnType<typeof setup>>, confirm = true) {
  const created = await client
    .post('/api/v1/admin/bookings')
    .json({
      customerId: ctx.customer.id,
      carId: ctx.car.id,
      pickupAt: '2030-03-04T09:00',
      returnAt: '2030-03-07T09:00',
      driveType: 'self_drive',
      source: 'phone',
      confirm,
    })
    .loginAs(ctx.owner)
  created.assertStatus(201)
  return `/api/v1/admin/bookings/${json(created).data.id}`
}

test.group('payments', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('cash rent and deposit count at once, with receipts; overpaying is refused', async ({
    client,
    assert,
  }) => {
    const ctx = await setup()
    const url = await book(client, ctx)
    const money = json(await client.get(`${url}/payments`).loginAs(ctx.desk))
    const { balance, depositDue } = money.data.summary
    assert.isAbove(balance, 0)
    assert.equal(depositDue, 100_000)

    const tooMuch = await client
      .post(`${url}/payments`)
      .json({ type: 'rental', method: 'cash', amount: balance + 1 })
      .loginAs(ctx.desk)
    tooMuch.assertStatus(422)

    const rent = await client
      .post(`${url}/payments`)
      .json({ type: 'rental', method: 'cash', amount: balance })
      .loginAs(ctx.desk)
    rent.assertStatus(201)
    assert.equal(json(rent).data.status, 'completed')
    assert.match(json(rent).data.number, /^RCT-\d{4}-00001$/)
    assert.equal(json(rent).data.recordedBy.name, 'Kofi Desk')
    await client
      .post(`${url}/payments`)
      .json({ type: 'deposit', method: 'cash', amount: depositDue })
      .loginAs(ctx.desk)

    const after = json(await client.get(`${url}/payments`).loginAs(ctx.desk)).data.summary
    assert.equal(after.balance, 0)
    assert.equal(after.depositHeld, 100_000)
    const booking = json(await client.get(url).loginAs(ctx.owner)).data
    assert.equal(booking.paidAmount, balance)
    assert.equal(booking.depositHeldAmount, 100_000)

    const receipt = await client
      .get(`/api/v1/admin/payments/${json(rent).data.id}/receipt.pdf`)
      .loginAs(ctx.desk)
    receipt.assertStatus(200)
    assert.include(receipt.header('content-type'), 'application/pdf')
  })

  test('MoMo waits for verification; a transaction ID is used once; reject frees it', async ({
    client,
    assert,
  }) => {
    const ctx = await setup()
    const url = await book(client, ctx)
    const momo = (ref: string, amount = 10_000) =>
      client
        .post(`${url}/payments`)
        .json({ type: 'rental', method: 'momo', amount, transactionRef: ref, payerName: 'Ama O' })
        .loginAs(ctx.desk)

    const noRef = await client
      .post(`${url}/payments`)
      .json({ type: 'rental', method: 'momo', amount: 10_000 })
      .loginAs(ctx.desk)
    noRef.assertStatus(422)

    const first = await momo('5123 456 789')
    first.assertStatus(201)
    assert.equal(json(first).data.status, 'pending_verification')
    assert.isNull(json(first).data.number)
    assert.equal(json(first).data.transactionRef, '5123456789')
    // Not counted yet
    let summary = json(await client.get(`${url}/payments`).loginAs(ctx.desk)).data.summary
    assert.equal(summary.paid, 0)
    assert.equal(summary.pendingRental, 10_000)

    // The same transaction typed differently is still the same transaction
    const again = await momo('5123456789')
    again.assertStatus(422)
    assert.include(json(again).message, 'already recorded')

    // The desk can't verify; the queue shows it to the accountant
    const deskVerify = await client
      .post(`/api/v1/admin/payments/${json(first).data.id}/verify`)
      .loginAs(ctx.desk)
    deskVerify.assertStatus(403)
    const queue = json(
      await client.get('/api/v1/admin/payments?status=pending_verification').loginAs(ctx.accountant)
    )
    assert.equal(queue.meta.pendingCount, 1)
    assert.equal(queue.data[0].booking.reference.length > 0, true)

    const verified = await client
      .post(`/api/v1/admin/payments/${json(first).data.id}/verify`)
      .loginAs(ctx.accountant)
    verified.assertStatus(200)
    assert.match(json(verified).data.number, /^RCT-/)
    summary = json(await client.get(`${url}/payments`).loginAs(ctx.desk)).data.summary
    assert.equal(summary.paid, 10_000)

    // A second MoMo payment that never arrived: rejected, and its ID can be used again
    const second = await momo('ABC-777', 5_000)
    const rejected = await client
      .post(`/api/v1/admin/payments/${json(second).data.id}/reject`)
      .json({ reason: 'Not in the MoMo statement' })
      .loginAs(ctx.accountant)
    assert.equal(json(rejected).data.status, 'rejected')
    const reused = await momo('ABC-777', 5_000)
    reused.assertStatus(201)
  })

  test('the reservation fee confirms a pending booking; a held MoMo payment stops it expiring', async ({
    client,
    assert,
  }) => {
    const ctx = await setup()
    const url = await book(client, ctx, false)
    const id = url.split('/').pop()!
    const summary = json(await client.get(`${url}/payments`).loginAs(ctx.desk)).data.summary
    assert.isAbove(summary.reservationFee, 0)

    // Waiting for verification: the hold runs out but the car is kept
    await client
      .post(`${url}/payments`)
      .json({
        type: 'rental',
        method: 'momo',
        amount: summary.reservationFee,
        transactionRef: 'HOLD-1',
      })
      .loginAs(ctx.desk)
    await BookingService.expireHolds(DateTime.now().plus({ days: 3 }))
    const held = await Booking.findOrFail(id)
    assert.equal(held.status, 'pending')

    // Cash for the fee: confirmed straight away
    const paid = await client
      .post(`${url}/payments`)
      .json({ type: 'rental', method: 'cash', amount: summary.reservationFee })
      .loginAs(ctx.desk)
    paid.assertStatus(201)
    await held.refresh()
    assert.equal(held.status, 'confirmed')
  })

  test('void puts the balance back; refunds after cancelling are capped by the fee', async ({
    client,
    assert,
  }) => {
    const ctx = await setup()
    const url = await book(client, ctx)
    const paid = await client
      .post(`${url}/payments`)
      .json({ type: 'rental', method: 'cash', amount: 50_000 })
      .loginAs(ctx.desk)

    const deskVoid = await client
      .post(`/api/v1/admin/payments/${json(paid).data.id}/void`)
      .json({ reason: 'Typed the wrong amount' })
      .loginAs(ctx.desk)
    deskVoid.assertStatus(403)
    const voided = await client
      .post(`/api/v1/admin/payments/${json(paid).data.id}/void`)
      .json({ reason: 'Typed the wrong amount' })
      .loginAs(ctx.accountant)
    assert.equal(json(voided).data.status, 'void')
    let summary = json(await client.get(`${url}/payments`).loginAs(ctx.desk)).data.summary
    assert.equal(summary.paid, 0)

    // Pay again, cancel (far ahead: free), refund in full but not more
    await client
      .post(`${url}/payments`)
      .json({ type: 'rental', method: 'cash', amount: 50_000 })
      .loginAs(ctx.desk)
    await client.post(`${url}/cancel`).json({ reason: 'Plans changed' }).loginAs(ctx.owner)
    summary = json(await client.get(`${url}/payments`).loginAs(ctx.desk)).data.summary
    assert.equal(summary.refundable, 50_000)
    const tooMuch = await client
      .post(`${url}/payments`)
      .json({ type: 'refund', method: 'cash', amount: 50_001 })
      .loginAs(ctx.desk)
    tooMuch.assertStatus(422)
    const refund = await client
      .post(`${url}/payments`)
      .json({ type: 'refund', method: 'momo', amount: 50_000, transactionRef: 'OUT-1' })
      .loginAs(ctx.desk)
    refund.assertStatus(201)
    assert.match(json(refund).data.number, /^RFD-/)
    summary = json(await client.get(`${url}/payments`).loginAs(ctx.desk)).data.summary
    assert.equal(summary.paid, 0)
  })

  test('after return the deposit is kept against charges and the rest paid back; the booking closes', async ({
    client,
    assert,
  }) => {
    const ctx = await setup()
    const url = await book(client, ctx)
    const id = url.split('/').pop()!
    const start = json(await client.get(`${url}/payments`).loginAs(ctx.desk)).data.summary
    await client
      .post(`${url}/payments`)
      .json({ type: 'rental', method: 'cash', amount: start.balance })
      .loginAs(ctx.desk)
    await client
      .post(`${url}/payments`)
      .json({ type: 'deposit', method: 'cash', amount: 100_000 })
      .loginAs(ctx.desk)

    // Came back with GHS 300 of charges (what check-in does to the booking)
    const booking = await Booking.findOrFail(id)
    booking.merge({
      status: 'returned',
      totalAmount: booking.totalAmount + 30_000,
      balanceAmount: 30_000,
    })
    await booking.save()

    const wrongSum = await client
      .post(`${url}/deposit/settle`)
      .json({ applyAmount: 30_000, refundAmount: 60_000, method: 'cash' })
      .loginAs(ctx.desk)
    wrongSum.assertStatus(422)
    const settled = await client
      .post(`${url}/deposit/settle`)
      .json({ applyAmount: 30_000, refundAmount: 70_000, method: 'cash' })
      .loginAs(ctx.desk)
    settled.assertStatus(200)

    await booking.refresh()
    assert.equal(booking.balanceAmount, 0)
    assert.equal(booking.depositHeldAmount, 0)
    assert.equal(booking.status, 'closed')
  })
})
