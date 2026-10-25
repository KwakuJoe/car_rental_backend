import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import Role from '#models/role'
import Permission from '#models/permission'
import User from '#models/user'
import Branch from '#models/branch'
import Business from '#models/business'
import Category from '#models/category'
import Car from '#models/car'
import RatePlan from '#models/rate_plan'
import AuditLog from '#models/audit_log'
import RateService from '#services/pricing/rate_service'

const json = (response: { body(): unknown }) => response.body() as Record<string, any>

let seq = 0
async function makeCar(branchId: string, categoryId: string) {
  seq++
  return Car.create({
    branchId,
    categoryId,
    make: 'Toyota',
    model: 'Corolla',
    year: 2022,
    colour: 'Silver',
    registrationNo: `GR ${1000 + seq}-22`,
    vinChassisNo: `VINRATE${seq}XYZ`,
    transmission: 'auto',
    fuelType: 'petrol',
    seats: 5,
    doors: 4,
    luggage: 2,
    currentOdometerKm: 1000,
  })
}

async function setup() {
  const business = await Business.create({ name: 'Wynk Car Rentals', email: 'admin@wynk.test' })
  const branch = await Branch.create({
    businessId: business.id,
    name: 'Main Branch',
    code: 'MAIN',
    isMain: true,
  })

  const ownerRole = await Role.create({ name: 'Owner', slug: 'owner', isSuperAdmin: true })
  const pricingView = await Permission.create({
    name: 'View pricing',
    slug: 'pricing.view',
    group: 'pricing',
  })
  await Permission.create({ name: 'Manage pricing', slug: 'pricing.manage', group: 'pricing' })
  const deskRole = await Role.create({ name: 'Front Desk', slug: 'front-desk' })
  await deskRole.related('permissions').attach([pricingView.id])
  const driverRole = await Role.create({ name: 'Driver', slug: 'driver' })

  const owner = await User.create({
    email: 'owner@wynk.test',
    password: 'Password123!',
    roleId: ownerRole.id,
  })
  const desk = await User.create({
    email: 'desk@wynk.test',
    password: 'Password123!',
    roleId: deskRole.id,
  })
  const driver = await User.create({
    email: 'driver@wynk.test',
    password: 'Password123!',
    roleId: driverRole.id,
  })

  const economy = await Category.create({ name: 'Economy', slug: 'economy', seats: 5 })
  const executive = await Category.create({
    name: 'Executive',
    slug: 'executive',
    seats: 5,
    selfDriveAllowed: false,
  })
  const car = await makeCar(branch.id, economy.id)

  return { owner, desk, driver, branch, economy, executive, car }
}

const base = (categoryId: string, extra: Record<string, unknown> = {}) => ({
  categoryId,
  driveType: 'self_drive',
  dailyAmount: 45000, // GHS 450
  weeklyAmount: 280000, // GHS 2,800 per 7 days
  monthlyAmount: 1050000,
  ...extra,
})

test.group('rate plans', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('creates a category rate and audits it', async ({ client, assert }) => {
    const { owner, economy } = await setup()

    const response = await client
      .post('/api/v1/admin/rate-plans')
      .json(base(economy.id))
      .loginAs(owner)

    response.assertStatus(201)
    const data = json(response).data
    assert.equal(data.dailyAmount, 45000)
    assert.equal(data.weeklyAmount, 280000)
    assert.equal(data.mileageMode, 'default')
    assert.isNull(data.carId)
    assert.equal(data.category.name, 'Economy')

    const audit = await AuditLog.findByOrFail('action', 'rate_plan.created')
    assert.equal(audit.subjectId, data.id)
  })

  test('self-drive plans never keep chauffeur or unused mileage values', async ({
    client,
    assert,
  }) => {
    const { owner, economy } = await setup()

    const response = await client
      .post('/api/v1/admin/rate-plans')
      .json(
        base(economy.id, {
          driverOvernightAmount: 20000,
          fuelIncluded: true,
          mileageMode: 'unlimited',
          includedKmPerDay: 200,
        })
      )
      .loginAs(owner)

    response.assertStatus(201)
    const data = json(response).data
    assert.isNull(data.driverOvernightAmount)
    assert.isFalse(data.fuelIncluded)
    assert.isNull(data.includedKmPerDay)
  })

  test('chauffeur plans keep their driver and fuel terms', async ({ client, assert }) => {
    const { owner, executive } = await setup()

    const response = await client
      .post('/api/v1/admin/rate-plans')
      .json(
        base(executive.id, {
          driveType: 'chauffeur',
          outOfTownDailyAmount: 90000,
          driverOvernightAmount: 20000,
          driverHoursPerDay: 12,
          driverOvertimeHourAmount: 5000,
          fuelIncluded: false,
        })
      )
      .loginAs(owner)

    response.assertStatus(201)
    const data = json(response).data
    assert.equal(data.outOfTownDailyAmount, 90000)
    assert.equal(data.driverHoursPerDay, 12)
  })

  test('explains rule violations', async ({ client, assert }) => {
    const { owner, economy, executive, branch } = await setup()
    const executiveCar = await makeCar(branch.id, executive.id)

    const chauffeurOnly = await client
      .post('/api/v1/admin/rate-plans')
      .json(base(executive.id))
      .loginAs(owner)
    chauffeurOnly.assertStatus(422)
    assert.include(json(chauffeurOnly).message, 'chauffeur-only')

    const wrongCategory = await client
      .post('/api/v1/admin/rate-plans')
      .json(base(economy.id, { carId: executiveCar.id }))
      .loginAs(owner)
    wrongCategory.assertStatus(422)
    assert.include(json(wrongCategory).message, 'another category')

    const limitedWithoutKm = await client
      .post('/api/v1/admin/rate-plans')
      .json(base(economy.id, { mileageMode: 'limited' }))
      .loginAs(owner)
    limitedWithoutKm.assertStatus(422)

    const endsBeforeStart = await client
      .post('/api/v1/admin/rate-plans')
      .json(base(economy.id, { effectiveFrom: '2026-12-10', effectiveTo: '2026-12-01' }))
      .loginAs(owner)
    endsBeforeStart.assertStatus(422)
  })

  test('refuses two active rates for the same dates, allows a scheduled change', async ({
    client,
    assert,
  }) => {
    const { owner, economy } = await setup()

    const current = await client
      .post('/api/v1/admin/rate-plans')
      .json(base(economy.id))
      .loginAs(owner)
    current.assertStatus(201)

    const clash = await client
      .post('/api/v1/admin/rate-plans')
      .json(base(economy.id, { dailyAmount: 50000 }))
      .loginAs(owner)
    clash.assertStatus(409)
    assert.equal(json(clash).code, 'E_RATE_OVERLAP')

    // End the current rate on 31 Dec, schedule the new one from 1 Jan
    const ended = await client
      .put(`/api/v1/admin/rate-plans/${json(current).data.id}`)
      .json(base(economy.id, { effectiveTo: '2026-12-31' }))
      .loginAs(owner)
    ended.assertStatus(200)

    const next = await client
      .post('/api/v1/admin/rate-plans')
      .json(base(economy.id, { dailyAmount: 50000, effectiveFrom: '2027-01-01' }))
      .loginAs(owner)
    next.assertStatus(201)

    // A chauffeur rate for the same category is a separate slot
    const chauffeur = await client
      .post('/api/v1/admin/rate-plans')
      .json(base(economy.id, { driveType: 'chauffeur' }))
      .loginAs(owner)
    chauffeur.assertStatus(201)
  })

  test('front desk can view rates but not change them; drivers see nothing', async ({ client }) => {
    const { desk, driver, economy } = await setup()

    const list = await client.get('/api/v1/admin/rate-plans').loginAs(desk)
    list.assertStatus(200)

    const create = await client
      .post('/api/v1/admin/rate-plans')
      .json(base(economy.id))
      .loginAs(desk)
    create.assertStatus(403)

    const driverList = await client.get('/api/v1/admin/rate-plans').loginAs(driver)
    driverList.assertStatus(403)
  })
})

test.group('RateService.resolve', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('a car override beats the category rate; dates pick the right plan', async ({ assert }) => {
    const { economy, car, branch } = await setup()
    const otherCar = await makeCar(branch.id, economy.id)

    await RatePlan.create({
      categoryId: economy.id,
      driveType: 'self_drive',
      dailyAmount: 45000,
      effectiveTo: DateTime.fromISO('2026-12-31'),
    })
    await RatePlan.create({
      categoryId: economy.id,
      driveType: 'self_drive',
      dailyAmount: 50000,
      effectiveFrom: DateTime.fromISO('2027-01-01'),
    })
    await RatePlan.create({
      categoryId: economy.id,
      carId: car.id,
      driveType: 'self_drive',
      dailyAmount: 60000,
    })

    const resolve = (carId: string | null, day: string) =>
      RateService.resolve({
        categoryId: economy.id,
        carId,
        driveType: 'self_drive',
        on: DateTime.fromISO(day),
      })

    assert.equal((await resolve(car.id, '2026-11-01'))?.dailyAmount, 60000)
    assert.equal((await resolve(otherCar.id, '2026-11-01'))?.dailyAmount, 45000)
    assert.equal((await resolve(otherCar.id, '2027-02-01'))?.dailyAmount, 50000)
    assert.equal((await resolve(null, '2026-12-31'))?.dailyAmount, 45000)
    assert.isNull(
      await RateService.resolve({
        categoryId: economy.id,
        driveType: 'chauffeur',
        on: DateTime.fromISO('2026-11-01'),
      })
    )
  })

  test('inactive plans are ignored', async ({ assert }) => {
    const { economy } = await setup()
    await RatePlan.create({
      categoryId: economy.id,
      driveType: 'self_drive',
      dailyAmount: 45000,
      active: false,
    })
    const plan = await RateService.resolve({
      categoryId: economy.id,
      driveType: 'self_drive',
      on: DateTime.now(),
    })
    assert.isNull(plan)
  })
})
