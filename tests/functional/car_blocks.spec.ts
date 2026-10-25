import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import Role from '#models/role'
import Permission from '#models/permission'
import User from '#models/user'
import Business from '#models/business'
import Branch from '#models/branch'
import Category from '#models/category'
import Car from '#models/car'
import CarAllocation from '#models/car_allocation'
import AuditLog from '#models/audit_log'

const json = (response: { body(): unknown }) => response.body() as Record<string, any>

test.group('fleet / car blocks (availability & exclusion constraint)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  async function setupFixture() {
    const business = await Business.create({
      name: 'Wynk Car Rentals',
      email: `admin-${Date.now()}@wynk.test`,
    })

    const branch = await Branch.create({
      businessId: business.id,
      name: 'Main Branch',
      code: `MB${Date.now().toString().slice(-4)}`,
      isMain: true,
      isActive: true,
    })

    const category = await Category.create({
      name: `Category ${Date.now()}`,
      slug: `cat-${Date.now()}`,
      seats: 5,
      sortOrder: 1,
      active: true,
    })

    const carA = await Car.create({
      branchId: branch.id,
      categoryId: category.id,
      make: 'Toyota',
      model: 'Corolla',
      year: 2022,
      colour: 'Silver',
      registrationNo: `GR-${Date.now().toString().slice(-6)}`,
      vinChassisNo: `VIN-${Date.now()}-A`,
      transmission: 'auto',
      fuelType: 'petrol',
      seats: 5,
      doors: 4,
      luggage: 2,
      currentOdometerKm: 10000,
      ownership: 'company',
      status: 'active',
      isListedOnline: true,
    })

    const carB = await Car.create({
      branchId: branch.id,
      categoryId: category.id,
      make: 'Honda',
      model: 'Civic',
      year: 2021,
      colour: 'Blue',
      registrationNo: `GT-${Date.now().toString().slice(-6)}`,
      vinChassisNo: `VIN-${Date.now()}-B`,
      transmission: 'auto',
      fuelType: 'petrol',
      seats: 5,
      doors: 4,
      luggage: 2,
      currentOdometerKm: 20000,
      ownership: 'company',
      status: 'active',
      isListedOnline: true,
    })

    const fleetManagePerm = await Permission.create({
      name: 'Manage fleet',
      slug: 'fleet.manage',
      group: 'fleet',
    })
    const fleetViewPerm = await Permission.create({
      name: 'View fleet',
      slug: 'fleet.view',
      group: 'fleet',
    })

    const fleetRole = await Role.create({ name: 'Fleet Officer', slug: 'fleet' })
    await fleetRole.related('permissions').attach([fleetViewPerm.id, fleetManagePerm.id])

    const fleetOfficer = await User.create({
      fullName: 'Fleet Officer',
      email: `fleet-${Date.now()}@wynk.test`,
      password: 'password123',
      roleId: fleetRole.id,
      isActive: true,
      mustResetPassword: false,
    })

    const frontDeskRole = await Role.create({ name: 'Front Desk', slug: 'front-desk' })
    await frontDeskRole.related('permissions').attach([fleetViewPerm.id])

    const frontDesk = await User.create({
      fullName: 'Front Desk',
      email: `frontdesk-${Date.now()}@wynk.test`,
      password: 'password123',
      roleId: frontDeskRole.id,
      isActive: true,
      mustResetPassword: false,
    })

    return { branch, category, carA, carB, fleetOfficer, frontDesk }
  }

  test('fleet officer can create an availability block and it is audited', async ({
    client,
    assert,
  }) => {
    const { carA, fleetOfficer } = await setupFixture()

    const startsAt = DateTime.now()
      .plus({ days: 1 })
      .set({ hour: 9, minute: 0, second: 0, millisecond: 0 })
    const endsAt = DateTime.now()
      .plus({ days: 3 })
      .set({ hour: 18, minute: 0, second: 0, millisecond: 0 })

    const response = await client
      .post(`/api/v1/admin/cars/${carA.id}/blocks`)
      .loginAs(fleetOfficer)
      .json({
        startsAt: startsAt.toISO(),
        endsAt: endsAt.toISO(),
        reason: 'Scheduled routine inspection and maintenance at auto shop',
        bufferMinutes: 60,
      })

    response.assertStatus(201)
    const body = json(response)
    assert.equal(body.data.carId, carA.id)
    assert.equal(body.data.source, 'block')
    assert.equal(body.data.bufferMinutes, 60)
    assert.isTrue(body.data.active)

    const allocation = await CarAllocation.findOrFail(body.data.id)
    assert.isNotNull(allocation)

    const audit = await AuditLog.query()
      .where('action', 'car.blocked')
      .where('subject_id', carA.id)
      .first()
    assert.isNotNull(audit)
  })

  test('prevents overlapping availability blocks on the same car with 409 Conflict', async ({
    client,
    assert,
  }) => {
    const { carA, fleetOfficer } = await setupFixture()

    const startsAt = DateTime.now()
      .plus({ days: 5 })
      .set({ hour: 10, minute: 0, second: 0, millisecond: 0 })
    const endsAt = DateTime.now()
      .plus({ days: 8 })
      .set({ hour: 12, minute: 0, second: 0, millisecond: 0 })

    // First block
    const first = await client
      .post(`/api/v1/admin/cars/${carA.id}/blocks`)
      .loginAs(fleetOfficer)
      .json({
        startsAt: startsAt.toISO(),
        endsAt: endsAt.toISO(),
        reason: 'Reserved for VIP wedding event',
      })
    first.assertStatus(201)

    // Overlapping block (starts inside the first block)
    const overlapResponse = await client
      .post(`/api/v1/admin/cars/${carA.id}/blocks`)
      .loginAs(fleetOfficer)
      .json({
        startsAt: startsAt.plus({ days: 1 }).toISO(),
        endsAt: endsAt.plus({ days: 2 }).toISO(),
        reason: 'Attempted conflicting block',
      })

    overlapResponse.assertStatus(409)
    const errorBody = json(overlapResponse)
    assert.equal(errorBody.code, 'E_CAR_UNAVAILABLE')
  })

  test('allows overlapping block dates on different cars without conflict', async ({ client }) => {
    const { carA, carB, fleetOfficer } = await setupFixture()

    const startsAt = DateTime.now().plus({ days: 10 }).toISO()
    const endsAt = DateTime.now().plus({ days: 12 }).toISO()

    // Block Car A
    const resA = await client
      .post(`/api/v1/admin/cars/${carA.id}/blocks`)
      .loginAs(fleetOfficer)
      .json({ startsAt, endsAt, reason: 'Car A maintenance' })
    resA.assertStatus(201)

    // Block Car B for the exact same date range
    const resB = await client
      .post(`/api/v1/admin/cars/${carB.id}/blocks`)
      .loginAs(fleetOfficer)
      .json({ startsAt, endsAt, reason: 'Car B maintenance' })
    resB.assertStatus(201)
  })

  test('releasing a block unblocks the car and permits new allocations for that range', async ({
    client,
    assert,
  }) => {
    const { carA, fleetOfficer } = await setupFixture()

    const startsAt = DateTime.now().plus({ days: 15 }).toISO()
    const endsAt = DateTime.now().plus({ days: 18 }).toISO()

    const createRes = await client
      .post(`/api/v1/admin/cars/${carA.id}/blocks`)
      .loginAs(fleetOfficer)
      .json({ startsAt, endsAt, reason: 'Temporary hold' })
    createRes.assertStatus(201)
    const blockId = json(createRes).data.id

    // Release the block
    const deleteRes = await client
      .delete(`/api/v1/admin/cars/${carA.id}/blocks/${blockId}`)
      .loginAs(fleetOfficer)
    deleteRes.assertStatus(200)

    const allocation = await CarAllocation.findOrFail(blockId)
    assert.isFalse(allocation.active)

    // Creating a new block for the exact same time now succeeds
    const recreateRes = await client
      .post(`/api/v1/admin/cars/${carA.id}/blocks`)
      .loginAs(fleetOfficer)
      .json({ startsAt, endsAt, reason: 'New booking block' })
    recreateRes.assertStatus(201)
  })

  test('staff without fleet.manage cannot create or delete blocks', async ({ client }) => {
    const { carA, frontDesk } = await setupFixture()

    const startsAt = DateTime.now().plus({ days: 20 }).toISO()
    const endsAt = DateTime.now().plus({ days: 22 }).toISO()

    const res = await client
      .post(`/api/v1/admin/cars/${carA.id}/blocks`)
      .loginAs(frontDesk)
      .json({ startsAt, endsAt, reason: 'Unauthorized block' })

    res.assertStatus(403)
  })
})
