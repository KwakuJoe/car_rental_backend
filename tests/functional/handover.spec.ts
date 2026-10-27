import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import Role from '#models/role'
import User from '#models/user'
import Business from '#models/business'
import Branch from '#models/branch'
import Category from '#models/category'
import Car from '#models/car'
import Customer from '#models/customer'
import RatePlan from '#models/rate_plan'
import VehicleDocument from '#models/vehicle_document'
import File from '#models/file'
import OdometerLog from '#models/odometer_log'
import ChecklistItem from '#models/checklist_item'
import TermsVersion from '#models/terms_version'

const json = (response: { body(): unknown }) => response.body() as Record<string, any>

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
    vinChassisNo: 'VINHANDOVER01XYZ',
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
  await ChecklistItem.createMany([
    { name: 'Spare tyre', sortOrder: 0, active: true },
    { name: 'Jack', sortOrder: 1, active: true },
  ])
  await TermsVersion.create({ version: 1, body: 'Draft terms for the test. '.repeat(3) })
  const ownerRole = await Role.create({ name: 'Owner', slug: 'owner', isSuperAdmin: true })
  const owner = await User.create({
    email: 'owner@wynk.test',
    password: 'Password123!',
    roleId: ownerRole.id,
  })
  return { car, customer, owner }
}

test.group('check-out', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('requirements, damage, signature: the car goes on rent', async ({ client, assert }) => {
    const { car, customer, owner } = await setup()
    const created = await client
      .post('/api/v1/admin/bookings')
      .json({
        customerId: customer.id,
        carId: car.id,
        pickupAt: '2030-03-04T09:00',
        returnAt: '2030-03-07T09:00',
        driveType: 'self_drive',
        source: 'phone',
        confirm: true,
      })
      .loginAs(owner)
    created.assertStatus(201)
    const url = `/api/v1/admin/bookings/${json(created).data.id}/check-out`

    // First open: a draft with the checklist ready; most requirements not met yet
    let screen = json(await client.get(url).loginAs(owner)).data
    assert.equal(screen.inspection.status, 'draft')
    assert.deepEqual(
      screen.inspection.checklist.map((item: any) => item.name),
      ['Spare tyre', 'Jack']
    )
    const failing = (data: any) =>
      data.requirements.filter((item: any) => !item.ok).map((item: any) => item.code)
    assert.includeMembers(failing(screen), [
      'verified',
      'car_documents',
      'odometer',
      'fuel',
      'payment',
    ])
    assert.isFalse(screen.ready)

    // The desk fixes each one
    customer.verificationStatus = 'verified'
    await customer.save()
    for (const type of ['roadworthy', 'insurance']) {
      await VehicleDocument.create({
        carId: car.id,
        type,
        expiresOn: DateTime.now().plus({ years: 1 }),
      })
    }
    const below = await client.put(url).json({ odometerKm: 900 }).loginAs(owner)
    assert.include(failing(json(below).data), 'odometer') // below the last reading (1,000)
    const saved = await client
      .put(url)
      .json({ odometerKm: 1500, fuelLevel: 6, paymentConfirmed: true })
      .loginAs(owner)
    assert.deepEqual(failing(json(saved).data), [])
    assert.isTrue(json(saved).data.ready)

    // A scratch marked on the diagram goes on the car's register
    const marked = await client
      .post(`${url}/damages`)
      .json({ zone: 'left_front_door', x: 40, y: 55, type: 'scratch', severity: 'minor' })
      .loginAs(owner)
    marked.assertStatus(201)
    assert.lengthOf(json(marked).data.damages, 1)
    assert.isFalse(json(marked).data.damages[0].preexisting)

    // Signing without a signature is refused; with one, the car goes out
    const missing = await client
      .post(`${url}/complete`)
      .json({ signatureFileId: 'nope', signedName: 'Ama' })
      .loginAs(owner)
    missing.assertStatus(422)
    const signature = await File.create({
      disk: 'cloudinary',
      path: 'wynk/signature/1',
      url: 'https://res.cloudinary.com/test/signature/1.png',
      originalName: 'signature.png',
      mime: 'image/png',
      size: 1000,
      purpose: 'signature',
      isPrivate: true,
      metadata: {},
    })
    const done = await client
      .post(`${url}/complete`)
      .json({ signatureFileId: signature.id, signedName: 'Ama Owusu' })
      .loginAs(owner)
    done.assertStatus(200)
    assert.equal(json(done).data.inspection.status, 'completed')
    assert.match(json(done).data.inspection.agreementHash, /^[0-9a-f]{64}$/)

    const booking = json(
      await client.get(`/api/v1/admin/bookings/${json(created).data.id}`).loginAs(owner)
    ).data
    assert.equal(booking.status, 'on_rent')
    await car.refresh()
    assert.equal(car.currentOdometerKm, 1500)
    const log = await OdometerLog.query().where('car_id', car.id).firstOrFail()
    assert.equal(log.source, 'check_out')

    // Done is done
    const again = await client.put(url).json({ fuelLevel: 2 }).loginAs(owner)
    again.assertStatus(422)
  })

  test('terms are versioned; the checklist is editable', async ({ client, assert }) => {
    const { owner } = await setup()
    const body = 'New terms of rental for Wynk Car Rentals, effective immediately, version two.'
    const saved = await client.post('/api/v1/admin/terms').json({ body }).loginAs(owner)
    saved.assertStatus(201)
    assert.equal(json(saved).data.version, 2)
    const current = await client.get('/api/v1/admin/terms').loginAs(owner)
    assert.equal(json(current).data.version, 2)

    const list = json(await client.get('/api/v1/admin/checklist-items').loginAs(owner)).data
    const updated = await client
      .put('/api/v1/admin/checklist-items')
      .json({
        items: [
          { id: list[1].id, name: 'Jack and spanner', active: true },
          { name: 'Umbrella', active: true },
        ],
      })
      .loginAs(owner)
    assert.deepEqual(
      json(updated).data.map((item: any) => item.name),
      ['Jack and spanner', 'Umbrella']
    )
  })
})
