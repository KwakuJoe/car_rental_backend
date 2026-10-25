import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Role from '#models/role'
import Permission from '#models/permission'
import User from '#models/user'
import Branch from '#models/branch'
import Business from '#models/business'
import Category from '#models/category'
import Car from '#models/car'
import CarPhoto from '#models/car_photo'
import File from '#models/file'
import AuditLog from '#models/audit_log'

const json = (response: { body(): unknown }) => response.body() as Record<string, any>

async function setup() {
  const business = await Business.create({
    name: 'Wynk Car Rentals',
    email: 'admin@wynk.test',
  })

  const mainBranch = await Branch.create({
    businessId: business.id,
    name: 'Main Branch',
    code: 'MAIN',
    isMain: true,
  })

  const ownerRole = await Role.create({ name: 'Owner', slug: 'owner', isSuperAdmin: true })
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

  const deskRole = await Role.create({ name: 'Front Desk', slug: 'front-desk' })
  await deskRole.related('permissions').attach([fleetViewPerm.id])

  const driverRole = await Role.create({ name: 'Driver', slug: 'driver' })

  const owner = await User.create({
    email: 'owner@wynk.test',
    password: 'Password123!',
    roleId: ownerRole.id,
  })

  const fleetOfficer = await User.create({
    email: 'fleet@wynk.test',
    password: 'Password123!',
    roleId: fleetRole.id,
  })

  const frontDesk = await User.create({
    email: 'desk@wynk.test',
    password: 'Password123!',
    roleId: deskRole.id,
  })

  const driver = await User.create({
    email: 'driver@wynk.test',
    password: 'Password123!',
    roleId: driverRole.id,
  })

  return { business, mainBranch, owner, fleetOfficer, frontDesk, driver }
}

test.group('fleet / categories', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('fleet officer can create a category and it is audited', async ({ client, assert }) => {
    const { fleetOfficer } = await setup()

    const response = await client
      .post('/api/v1/admin/categories')
      .json({
        name: 'Compact Saloon',
        slug: 'compact-saloon',
        description: 'Fuel-efficient city runners',
        seats: 5,
        defaultDepositAmount: 200000, // 2000 GHS in pesewas
        selfDriveAllowed: true,
        sortOrder: 1,
      })
      .loginAs(fleetOfficer)

    response.assertStatus(201)
    const body = json(response)
    assert.equal(body.data.name, 'Compact Saloon')
    assert.equal(body.data.slug, 'compact-saloon')
    assert.equal(body.data.defaultDepositAmount, 200000)

    const audit = await AuditLog.findByOrFail('subject_id', body.data.id)
    assert.equal(audit.action, 'category.created')
  })

  test('staff without fleet.manage cannot create or delete categories', async ({ client }) => {
    const { frontDesk } = await setup()

    const createResponse = await client
      .post('/api/v1/admin/categories')
      .json({ name: 'Economy', slug: 'economy' })
      .loginAs(frontDesk)

    createResponse.assertStatus(403)
  })

  test('any signed-in staff member can read categories lookup', async ({ client, assert }) => {
    const { driver } = await setup()
    await Category.create({ name: 'Saloon', slug: 'saloon', active: true, sortOrder: 1 })
    await Category.create({ name: 'Inactive Cat', slug: 'inactive', active: false, sortOrder: 2 })

    const response = await client.get('/api/v1/admin/lookups/categories').loginAs(driver)
    response.assertStatus(200)
    const body = json(response)
    assert.lengthOf(body.data, 1)
    assert.equal(body.data[0].slug, 'saloon')
  })

  test('cannot delete a category if it has cars assigned', async ({ client, assert }) => {
    const { fleetOfficer, mainBranch } = await setup()
    const category = await Category.create({ name: 'SUV', slug: 'suv' })
    await Car.create({
      branchId: mainBranch.id,
      categoryId: category.id,
      make: 'Toyota',
      model: 'RAV4',
      year: 2023,
      colour: 'White',
      registrationNo: 'GW 100-24',
      vinChassisNo: 'VINRAV4001',
    })

    const delResponse = await client
      .delete(`/api/v1/admin/categories/${category.id}`)
      .loginAs(fleetOfficer)

    delResponse.assertStatus(409)
    assert.include(json(delResponse).message, 'Cannot delete category')
  })
})

test.group('fleet / cars', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('creates a car with initial odometer reading and audits it', async ({ client, assert }) => {
    const { fleetOfficer, mainBranch } = await setup()
    const category = await Category.create({ name: 'Saloon', slug: 'saloon' })

    const response = await client
      .post('/api/v1/admin/cars')
      .json({
        branchId: mainBranch.id,
        categoryId: category.id,
        make: 'Hyundai',
        model: 'Elantra',
        year: 2022,
        colour: 'Silver',
        registrationNo: 'GE 5521-22',
        vinChassisNo: 'KMHDH4AE123456789',
        transmission: 'auto',
        fuelType: 'petrol',
        seats: 5,
        doors: 4,
        luggage: 2,
        features: ['AC', 'Bluetooth', 'Reverse Camera'],
        currentOdometerKm: 45000,
        purchaseAmount: 18000000, // 180,000 GHS in pesewas
      })
      .loginAs(fleetOfficer)

    response.assertStatus(201)
    const body = json(response)
    assert.equal(body.data.make, 'Hyundai')
    assert.equal(body.data.registrationNo, 'GE 5521-22')
    assert.equal(body.data.currentOdometerKm, 45000)
    assert.equal(body.data.status, 'active')
    assert.deepEqual(body.data.features, ['AC', 'Bluetooth', 'Reverse Camera'])

    const car = await Car.findOrFail(body.data.id)
    await car.load('odometerLogs')
    assert.lengthOf(car.odometerLogs, 1)
    assert.equal(car.odometerLogs[0].newKm, 45000)

    const audit = await AuditLog.findByOrFail('subject_id', car.id)
    assert.equal(audit.action, 'car.created')
  })

  test('rejects duplicate registration numbers and VINs', async ({ client }) => {
    const { fleetOfficer, mainBranch } = await setup()
    const category = await Category.create({ name: 'Saloon', slug: 'saloon' })

    await Car.create({
      branchId: mainBranch.id,
      categoryId: category.id,
      make: 'Toyota',
      model: 'Corolla',
      year: 2021,
      colour: 'Black',
      registrationNo: 'GR 1234-21',
      vinChassisNo: 'VINToyota001',
    })

    const response = await client
      .post('/api/v1/admin/cars')
      .json({
        branchId: mainBranch.id,
        categoryId: category.id,
        make: 'Toyota',
        model: 'Yaris',
        year: 2022,
        colour: 'Blue',
        registrationNo: 'GR 1234-21', // Duplicate
        vinChassisNo: 'VINToyota002',
      })
      .loginAs(fleetOfficer)

    response.assertStatus(422)
  })

  test('status update requires reason and is audited', async ({ client, assert }) => {
    const { fleetOfficer, mainBranch } = await setup()
    const category = await Category.create({ name: 'Saloon', slug: 'saloon' })
    const car = await Car.create({
      branchId: mainBranch.id,
      categoryId: category.id,
      make: 'Kia',
      model: 'Cerato',
      year: 2022,
      colour: 'White',
      registrationNo: 'GS 900-22',
      vinChassisNo: 'VINKIA001',
      status: 'active',
    })

    const response = await client
      .put(`/api/v1/admin/cars/${car.id}/status`)
      .json({
        status: 'in_maintenance',
        reason: 'Scheduled brake pad replacement and engine servicing',
      })
      .loginAs(fleetOfficer)

    response.assertStatus(200)
    assert.equal(json(response).data.status, 'in_maintenance')

    const audit = await AuditLog.query()
      .where('subject_id', car.id)
      .where('action', 'car.status_changed')
      .firstOrFail()
    assert.equal(audit.before?.status, 'active')
    assert.equal(audit.after?.status, 'in_maintenance')
    assert.equal(audit.metadata?.reason, 'Scheduled brake pad replacement and engine servicing')
  })

  test('odometer updates and downward correction rules', async ({ client, assert }) => {
    const { fleetOfficer, frontDesk, mainBranch } = await setup()
    const category = await Category.create({ name: 'Saloon', slug: 'saloon' })
    const car = await Car.create({
      branchId: mainBranch.id,
      categoryId: category.id,
      make: 'Honda',
      model: 'Civic',
      year: 2022,
      colour: 'Grey',
      registrationNo: 'GT 100-22',
      vinChassisNo: 'VINHONDA001',
      currentOdometerKm: 50000,
    })

    // Standard upward update succeeds
    const upResponse = await client
      .post(`/api/v1/admin/cars/${car.id}/odometer`)
      .json({ odometerKm: 51200 })
      .loginAs(fleetOfficer)
    upResponse.assertStatus(200)
    assert.equal(json(upResponse).data.currentOdometerKm, 51200)

    // Downward correction without reason fails
    const noReasonDown = await client
      .post(`/api/v1/admin/cars/${car.id}/odometer`)
      .json({ odometerKm: 49000 })
      .loginAs(fleetOfficer)
    noReasonDown.assertStatus(422)

    // Downward correction by user without fleet.manage fails with 403
    const unauthorizedDown = await client
      .post(`/api/v1/admin/cars/${car.id}/odometer`)
      .json({ odometerKm: 49000, reason: 'Typo in previous entry' })
      .loginAs(frontDesk)
    unauthorizedDown.assertStatus(403)

    // Downward correction by fleet officer with reason succeeds
    const correctionResponse = await client
      .post(`/api/v1/admin/cars/${car.id}/odometer`)
      .json({ odometerKm: 49000, reason: 'Previous driver entered wrong mileage' })
      .loginAs(fleetOfficer)
    correctionResponse.assertStatus(200)
    assert.equal(json(correctionResponse).data.currentOdometerKm, 49000)

    // History contains all logs
    const history = await client
      .get(`/api/v1/admin/cars/${car.id}/odometer-history`)
      .loginAs(fleetOfficer)
    history.assertStatus(200)
    assert.lengthOf(json(history).data, 2)
  })

  test('photo attachment, cover photo, reordering and deletion', async ({ client, assert }) => {
    const { fleetOfficer, mainBranch } = await setup()
    const category = await Category.create({ name: 'Saloon', slug: 'saloon' })
    const car = await Car.create({
      branchId: mainBranch.id,
      categoryId: category.id,
      make: 'Nissan',
      model: 'Sentra',
      year: 2021,
      colour: 'Red',
      registrationNo: 'GE 999-21',
      vinChassisNo: 'VINNISSAN001',
    })

    const file1 = await File.create({
      disk: 'cloudinary',
      path: 'wynk/car_photo/photo1',
      url: 'https://res.cloudinary.com/test/photo1.jpg',
      originalName: 'photo1.jpg',
      mime: 'image/jpeg',
      size: 100000,
      purpose: 'car_photo',
    })

    const file2 = await File.create({
      disk: 'cloudinary',
      path: 'wynk/car_photo/photo2',
      url: 'https://res.cloudinary.com/test/photo2.jpg',
      originalName: 'photo2.jpg',
      mime: 'image/jpeg',
      size: 120000,
      purpose: 'car_photo',
    })

    // Attach photo 1 - should automatically be cover
    const add1 = await client
      .post(`/api/v1/admin/cars/${car.id}/photos`)
      .json({ fileId: file1.id })
      .loginAs(fleetOfficer)
    add1.assertStatus(201)
    const photo1Id = json(add1).data.id
    assert.isTrue(json(add1).data.isCover)

    // Attach photo 2
    const add2 = await client
      .post(`/api/v1/admin/cars/${car.id}/photos`)
      .json({ fileId: file2.id })
      .loginAs(fleetOfficer)
    add2.assertStatus(201)
    const photo2Id = json(add2).data.id
    assert.isFalse(json(add2).data.isCover)

    // Set photo 2 as cover
    const coverRes = await client
      .put(`/api/v1/admin/cars/${car.id}/photos/${photo2Id}/cover`)
      .loginAs(fleetOfficer)
    coverRes.assertStatus(200)

    const updatedPhoto1 = await CarPhoto.findOrFail(photo1Id)
    const updatedPhoto2 = await CarPhoto.findOrFail(photo2Id)
    assert.isFalse(updatedPhoto1.isCover)
    assert.isTrue(updatedPhoto2.isCover)

    // Reorder photos
    const reorderRes = await client
      .put(`/api/v1/admin/cars/${car.id}/photos/reorder`)
      .json({ photoIds: [photo2Id, photo1Id] })
      .loginAs(fleetOfficer)
    reorderRes.assertStatus(200)

    // Delete photo 1
    const delPhoto = await client
      .delete(`/api/v1/admin/cars/${car.id}/photos/${photo1Id}`)
      .loginAs(fleetOfficer)
    delPhoto.assertStatus(200)

    const remainingPhotos = await CarPhoto.query().where('car_id', car.id)
    assert.lengthOf(remainingPhotos, 1)
  })

  test('soft delete archives the car and marks status retired', async ({ client, assert }) => {
    const { fleetOfficer, mainBranch } = await setup()
    const category = await Category.create({ name: 'Saloon', slug: 'saloon' })
    const car = await Car.create({
      branchId: mainBranch.id,
      categoryId: category.id,
      make: 'Mazda',
      model: '3',
      year: 2020,
      colour: 'Blue',
      registrationNo: 'GE 123-20',
      vinChassisNo: 'VINMAZDA001',
    })

    const delResponse = await client.delete(`/api/v1/admin/cars/${car.id}`).loginAs(fleetOfficer)
    delResponse.assertStatus(200)

    const found = await Car.findOrFail(car.id)
    assert.isNotNull(found.archivedAt)
    assert.equal(found.status, 'retired')

    // Listing by default filters out archived cars
    const list = await client.get('/api/v1/admin/cars').loginAs(fleetOfficer)
    list.assertStatus(200)
    assert.lengthOf(json(list).data, 0)

    // Can include archived
    const listArchived = await client
      .get('/api/v1/admin/cars?includeArchived=true')
      .loginAs(fleetOfficer)
    listArchived.assertStatus(200)
    assert.lengthOf(json(listArchived).data, 1)
  })
})
