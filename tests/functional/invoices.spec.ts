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
    vinChassisNo: 'VININVOICE01XYZ',
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
  const opsRole = await role('ops', ['invoices.view', 'bookings.view'])
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
const inDays = (days: number) => DateTime.now().setZone('Africa/Accra').plus({ days }).toISODate()!

test.group('invoices & credit notes', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('issue, part-pay, cancel with a credit note, issue again', async ({ client, assert }) => {
    const ctx = await setup()
    const created = await client
      .post('/api/v1/admin/bookings')
      .json({
        customerId: ctx.customer.id,
        carId: ctx.car.id,
        pickupAt: '2030-03-04T09:00',
        returnAt: '2030-03-07T09:00',
        driveType: 'self_drive',
        source: 'phone',
        confirm: true,
      })
      .loginAs(ctx.owner)
    created.assertStatus(201)
    const booking = json(created).data

    // What a new invoice would say: lines add up to the booking total
    const before = json(
      await client.get(`/api/v1/admin/bookings/${booking.id}/invoices`).loginAs(ctx.viewer)
    ).data
    assert.lengthOf(before.invoices, 0)
    assert.equal(before.draft.total, booking.totalAmount)
    assert.equal(
      before.draft.lines.reduce(
        (total: number, line: { amount: number }) => total + line.amount,
        0
      ),
      before.draft.subtotal
    )
    assert.equal(before.draft.billTo.name, 'Ama Owusu')

    // Someone with only invoices.view can't issue one
    const billTo = { name: 'Ama Owusu', company: 'Acme Ghana Ltd', tin: 'C0012345678' }
    const denied = await client
      .post(`/api/v1/admin/bookings/${booking.id}/invoices`)
      .json({ billTo, dueOn: inDays(7) })
      .loginAs(ctx.viewer)
    denied.assertStatus(403)

    const issued = await client
      .post(`/api/v1/admin/bookings/${booking.id}/invoices`)
      .json({ billTo, dueOn: inDays(7), notes: 'PO 4471' })
      .loginAs(ctx.owner)
    issued.assertStatus(201)
    const invoice = json(issued).data
    const year = DateTime.now().setZone('Africa/Accra').year
    assert.equal(invoice.number, `INV-${year}-00001`)
    assert.equal(invoice.totalAmount, booking.totalAmount)
    assert.equal(invoice.billTo.company, 'Acme Ghana Ltd')
    assert.equal(invoice.standing.state, 'unpaid')
    assert.equal(invoice.standing.balance, booking.totalAmount)

    // Only one live invoice per booking
    const twice = await client
      .post(`/api/v1/admin/bookings/${booking.id}/invoices`)
      .json({ billTo, dueOn: inDays(7) })
      .loginAs(ctx.owner)
    twice.assertStatus(409)

    // Paid on the booking - the invoice follows
    const paid = await client
      .post(`/api/v1/admin/bookings/${booking.id}/payments`)
      .json({ type: 'rental', method: 'cash', amount: 45_000 })
      .loginAs(ctx.owner)
    paid.assertStatus(201)
    const listed = json(await client.get('/api/v1/admin/invoices').loginAs(ctx.viewer))
    assert.equal(listed.data[0].standing.state, 'part_paid')
    assert.equal(listed.data[0].standing.paid, 45_000)
    assert.equal(listed.meta.outstanding.count, 1)
    assert.equal(listed.meta.outstanding.amount, booking.totalAmount - 45_000)

    // The PDF
    const pdf = await client
      .get(`/api/v1/admin/invoices/${invoice.id}/invoice.pdf`)
      .loginAs(ctx.viewer)
    pdf.assertStatus(200)
    pdf.assertHeader('content-type', 'application/pdf')

    // Cancel with a credit note; it can't be cancelled twice
    const credited = await client
      .post(`/api/v1/admin/invoices/${invoice.id}/credit-note`)
      .json({ reason: 'Wrong company name' })
      .loginAs(ctx.owner)
    credited.assertStatus(200)
    const cancelled = json(credited).data
    assert.equal(cancelled.status, 'credited')
    assert.equal(cancelled.creditNote.number, `CN-${year}-00001`)
    assert.equal(cancelled.standing.state, 'credited')
    const again = await client
      .post(`/api/v1/admin/invoices/${invoice.id}/credit-note`)
      .json({ reason: 'Again' })
      .loginAs(ctx.owner)
    again.assertStatus(409)
    const notePdf = await client
      .get(`/api/v1/admin/credit-notes/${cancelled.creditNote.id}/credit-note.pdf`)
      .loginAs(ctx.viewer)
    notePdf.assertStatus(200)

    // A new invoice, the next number; the list filters
    const reissued = await client
      .post(`/api/v1/admin/bookings/${booking.id}/invoices`)
      .json({ billTo: { ...billTo, company: 'Acme Ghana Limited' }, dueOn: today() })
      .loginAs(ctx.owner)
    reissued.assertStatus(201)
    assert.equal(json(reissued).data.number, `INV-${year}-00002`)
    const open = json(
      await client.get('/api/v1/admin/invoices').qs({ status: 'open' }).loginAs(ctx.viewer)
    )
    assert.deepEqual(
      open.data.map((row: { number: string }) => row.number),
      [`INV-${year}-00002`]
    )
    const creditedList = json(
      await client.get('/api/v1/admin/invoices').qs({ status: 'credited' }).loginAs(ctx.viewer)
    )
    assert.lengthOf(creditedList.data, 1)
    const searched = json(
      await client.get('/api/v1/admin/invoices').qs({ search: 'limited' }).loginAs(ctx.viewer)
    )
    assert.lengthOf(searched.data, 1)

    // No invoices.view: refused
    const refused = await client.get('/api/v1/admin/invoices').loginAs(ctx.desk)
    refused.assertStatus(403)
  })

  test('rules: due date, cancelled bookings', async ({ client }) => {
    const ctx = await setup()
    const created = await client
      .post('/api/v1/admin/bookings')
      .json({
        customerId: ctx.customer.id,
        carId: ctx.car.id,
        pickupAt: '2030-05-04T09:00',
        returnAt: '2030-05-06T09:00',
        driveType: 'self_drive',
        source: 'phone',
        confirm: true,
      })
      .loginAs(ctx.owner)
    const booking = json(created).data
    const late = await client
      .post(`/api/v1/admin/bookings/${booking.id}/invoices`)
      .json({ billTo: { name: 'Ama Owusu' }, dueOn: inDays(-2) })
      .loginAs(ctx.owner)
    late.assertStatus(422)

    await client
      .post(`/api/v1/admin/bookings/${booking.id}/cancel`)
      .json({ reason: 'Plans changed' })
      .loginAs(ctx.owner)
    const cancelled = await client
      .post(`/api/v1/admin/bookings/${booking.id}/invoices`)
      .json({ billTo: { name: 'Ama Owusu' }, dueOn: inDays(7) })
      .loginAs(ctx.owner)
    cancelled.assertStatus(422)
  })
})
