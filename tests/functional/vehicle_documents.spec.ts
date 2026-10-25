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
import File from '#models/file'
import VehicleDocument from '#models/vehicle_document'
import AuditLog from '#models/audit_log'
import Notification from '#models/notification'
import DocumentComplianceService from '#services/document_compliance_service'

const json = (response: { body(): unknown }) => response.body() as Record<string, any>

test.group('fleet / vehicle documents & expiry alerts (M2.4)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  async function setupFixture() {
    const business = await Business.create({
      name: 'Wynk Car Rentals',
      email: `admin-${Date.now()}@wynk.test`,
    })

    const branch = await Branch.create({
      businessId: business.id,
      name: 'Airport Branch',
      code: `AP${Date.now().toString().slice(-4)}`,
      isMain: true,
      isActive: true,
    })

    const category = await Category.create({
      name: `SUV Class ${Date.now()}`,
      slug: `suv-${Date.now()}`,
      seats: 5,
      sortOrder: 1,
      active: true,
    })

    const car = await Car.create({
      branchId: branch.id,
      categoryId: category.id,
      make: 'Toyota',
      model: 'RAV4',
      year: 2023,
      colour: 'Pearl White',
      registrationNo: `GW-${Date.now().toString().slice(-6)}`,
      vinChassisNo: `VIN-${Date.now()}-DOC`,
      transmission: 'auto',
      fuelType: 'petrol',
      seats: 5,
      doors: 4,
      luggage: 3,
      currentOdometerKm: 15000,
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

    const fleetRole = await Role.create({ name: 'Fleet Officer', slug: `fleet-${Date.now()}` })
    await fleetRole.related('permissions').attach([fleetViewPerm.id, fleetManagePerm.id])

    const fleetOfficer = await User.create({
      fullName: 'Fleet Officer',
      email: `fleet-doc-${Date.now()}@wynk.test`,
      password: 'password123',
      roleId: fleetRole.id,
      isActive: true,
      mustResetPassword: false,
    })

    const frontDeskRole = await Role.create({ name: 'Front Desk', slug: `desk-${Date.now()}` })
    await frontDeskRole.related('permissions').attach([fleetViewPerm.id])

    const frontDesk = await User.create({
      fullName: 'Front Desk',
      email: `desk-doc-${Date.now()}@wynk.test`,
      password: 'password123',
      roleId: frontDeskRole.id,
      isActive: true,
      mustResetPassword: false,
    })

    const sampleFile = await File.create({
      disk: 'cloudinary',
      path: `wynk/vehicle_document/sample-${Date.now()}`,
      url: 'https://res.cloudinary.com/demo/image/upload/sample.pdf',
      originalName: 'roadworthy_cert.pdf',
      mime: 'application/pdf',
      size: 102400,
      purpose: 'vehicle_document',
      isPrivate: true,
    })

    return { car, fleetOfficer, frontDesk, sampleFile }
  }

  test('fleet officer can create, show, update and delete a vehicle document with audit logging', async ({
    client,
    assert,
  }) => {
    const { car, fleetOfficer, sampleFile } = await setupFixture()

    const issuedOn = DateTime.now().minus({ months: 6 }).toISODate()!
    const expiresOn = DateTime.now().plus({ months: 6 }).toISODate()!

    // Create document
    const createRes = await client
      .post(`/api/v1/admin/cars/${car.id}/documents`)
      .loginAs(fleetOfficer)
      .json({
        type: 'roadworthy',
        documentNumber: 'RW-2026-99881',
        provider: 'Driver and Vehicle Licensing Authority (DVLA)',
        issuedOn,
        expiresOn,
        fileId: sampleFile.id,
        notes: 'Passed safety and emissions inspection at 37 Military Hospital DVLA station',
      })

    createRes.assertStatus(201)
    const createdBody = json(createRes).data
    assert.equal(createdBody.carId, car.id)
    assert.equal(createdBody.type, 'roadworthy')
    assert.equal(createdBody.documentNumber, 'RW-2026-99881')
    assert.isNotNull(createdBody.signedUrl)

    const docId = createdBody.id

    // Audit log for create
    const createAudit = await AuditLog.query()
      .where('action', 'car.document_added')
      .where('subject_id', car.id)
      .first()
    assert.isNotNull(createAudit)

    // Show document
    const showRes = await client
      .get(`/api/v1/admin/cars/${car.id}/documents/${docId}`)
      .loginAs(fleetOfficer)
    showRes.assertStatus(200)
    assert.equal(json(showRes).data.id, docId)

    // Update document
    const updateRes = await client
      .put(`/api/v1/admin/cars/${car.id}/documents/${docId}`)
      .loginAs(fleetOfficer)
      .json({
        provider: 'DVLA Accra Central',
        notes: 'Updated notes after decal verification',
      })
    updateRes.assertStatus(200)
    assert.equal(json(updateRes).data.provider, 'DVLA Accra Central')

    // Delete document
    const delRes = await client
      .delete(`/api/v1/admin/cars/${car.id}/documents/${docId}`)
      .loginAs(fleetOfficer)
    delRes.assertStatus(200)

    const found = await VehicleDocument.find(docId)
    assert.isNull(found)
  })

  test('dynamically computes car compliance status: missing, ok, expiring_soon, expired', async ({
    client,
    assert,
  }) => {
    const { car, fleetOfficer } = await setupFixture()

    // 1. Initial state: no documents -> missing
    const initialRes = await client
      .get(`/api/v1/admin/cars/${car.id}/documents`)
      .loginAs(fleetOfficer)
    initialRes.assertStatus(200)
    assert.equal(json(initialRes).compliance.status, 'missing')
    assert.isFalse(json(initialRes).compliance.hasRoadworthy)
    assert.isFalse(json(initialRes).compliance.hasInsurance)

    // 2. Add roadworthy and insurance with validity > 30 days -> status is ok
    await VehicleDocument.create({
      carId: car.id,
      type: 'roadworthy',
      documentNumber: 'RW-OK-1',
      expiresOn: DateTime.now().plus({ months: 8 }) as any,
    })
    const insuranceDoc = await VehicleDocument.create({
      carId: car.id,
      type: 'insurance',
      documentNumber: 'INS-OK-1',
      provider: 'Enterprise Insurance',
      coverType: 'Comprehensive',
      expiresOn: DateTime.now().plus({ months: 8 }) as any,
    })

    const okRes = await client.get(`/api/v1/admin/cars/${car.id}/documents`).loginAs(fleetOfficer)
    assert.equal(json(okRes).compliance.status, 'ok')
    assert.isTrue(json(okRes).compliance.hasRoadworthy)
    assert.isTrue(json(okRes).compliance.hasInsurance)

    // 3. Update insurance to expire in 10 days -> status is expiring_soon
    insuranceDoc.expiresOn = DateTime.now().plus({ days: 10 }) as any
    await insuranceDoc.save()

    const expiringRes = await client
      .get(`/api/v1/admin/cars/${car.id}/documents`)
      .loginAs(fleetOfficer)
    assert.equal(json(expiringRes).compliance.status, 'expiring_soon')

    // 4. Update insurance to have expired 2 days ago -> status is expired
    insuranceDoc.expiresOn = DateTime.now().minus({ days: 2 }) as any
    await insuranceDoc.save()

    const expiredRes = await client
      .get(`/api/v1/admin/cars/${car.id}/documents`)
      .loginAs(fleetOfficer)
    assert.equal(json(expiredRes).compliance.status, 'expired')
  })

  test('GET /admin/documents/expiring returns vehicles with expiring or expired documents', async ({
    client,
    assert,
  }) => {
    const { car, fleetOfficer } = await setupFixture()

    await VehicleDocument.create({
      carId: car.id,
      type: 'insurance',
      documentNumber: 'INS-EXP-TEST',
      provider: 'Star Assurance',
      expiresOn: DateTime.now().plus({ days: 14 }) as any,
    })

    const res = await client.get('/api/v1/admin/documents/expiring?days=30').loginAs(fleetOfficer)

    res.assertStatus(200)
    const list = json(res).data
    assert.isAtLeast(list.length, 1)
    const match = list.find((d: any) => d.carId === car.id)
    assert.isNotNull(match)
    assert.equal(match.documentNumber, 'INS-EXP-TEST')
  })

  test('DocumentComplianceService.checkAndAlertExpiringDocuments sends notification to fleet officers', async ({
    assert,
  }) => {
    const { car, fleetOfficer } = await setupFixture()

    // Add insurance expiring in exactly 14 days (milestone)
    await VehicleDocument.create({
      carId: car.id,
      type: 'insurance',
      documentNumber: 'INS-ALERT-14',
      provider: 'GLICO General',
      expiresOn: DateTime.now().plus({ days: 14 }) as any,
    })

    const result = await DocumentComplianceService.checkAndAlertExpiringDocuments([14])
    assert.isAtLeast(result.alertsCreated, 1)

    const notification = await Notification.query()
      .where('user_id', fleetOfficer.id)
      .where('type', 'document_expiring')
      .first()

    assert.isNotNull(notification)
    assert.include(notification!.title, car.registrationNo)
    assert.include(notification!.body, 'insurance')
  })

  test('staff without fleet.manage cannot create or delete vehicle documents', async ({
    client,
  }) => {
    const { car, frontDesk } = await setupFixture()

    const res = await client
      .post(`/api/v1/admin/cars/${car.id}/documents`)
      .loginAs(frontDesk)
      .json({
        type: 'roadworthy',
        documentNumber: 'RW-UNAUTHORIZED',
      })

    res.assertStatus(403)
  })
  test('expiry alerts: a renewed document stops the old one alerting', async ({ assert }) => {
    const { car } = await setupFixture()
    // Old policy expired 14 days ago... and its renewal expires in 14 days.
    await VehicleDocument.create({
      carId: car.id,
      type: 'insurance',
      documentNumber: 'INS-OLD',
      expiresOn: DateTime.now().minus({ days: 14 }) as any,
    })
    await VehicleDocument.create({
      carId: car.id,
      type: 'insurance',
      documentNumber: 'INS-NEW',
      expiresOn: DateTime.now().plus({ days: 14 }) as any,
    })

    const result = await DocumentComplianceService.checkAndAlertExpiringDocuments()
    assert.equal(result.alertsCreated, 1)
    const keys = await Notification.query().distinct('dedupe_key').whereNotNull('dedupe_key')
    assert.lengthOf(keys, 1)
    assert.match(keys[0].dedupeKey!, /:expires-in-14$/)
  })

  test('expiry alerts: two documents of one car on the same day both alert', async ({ assert }) => {
    const { car } = await setupFixture()
    for (const type of ['insurance', 'roadworthy'] as const) {
      await VehicleDocument.create({
        carId: car.id,
        type,
        documentNumber: `${type}-7`,
        expiresOn: DateTime.now().plus({ days: 7 }) as any,
      })
    }

    const result = await DocumentComplianceService.checkAndAlertExpiringDocuments()
    assert.equal(result.alertsCreated, 2)
  })

  test('expiry alerts: running twice the same day sends nothing new', async ({ assert }) => {
    const { car } = await setupFixture()
    await VehicleDocument.create({
      carId: car.id,
      type: 'roadworthy',
      documentNumber: 'RW-1',
      expiresOn: DateTime.now().plus({ days: 1 }) as any,
    })

    const first = await DocumentComplianceService.checkAndAlertExpiringDocuments()
    const second = await DocumentComplianceService.checkAndAlertExpiringDocuments()
    assert.equal(first.alertsCreated, 1)
    assert.equal(second.alertsCreated, 0)
  })

  test('expiry alerts: only milestones fire - not every day after expiry', async ({ assert }) => {
    const { car } = await setupFixture()
    await VehicleDocument.create({
      carId: car.id,
      type: 'insurance',
      documentNumber: 'INS-EXPIRED-3',
      expiresOn: DateTime.now().minus({ days: 3 }) as any,
    })
    await VehicleDocument.create({
      carId: car.id,
      type: 'roadworthy',
      documentNumber: 'RW-TODAY',
      expiresOn: DateTime.now() as any,
    })

    const result = await DocumentComplianceService.checkAndAlertExpiringDocuments()
    assert.equal(result.alertsCreated, 1) // the expires-today one only
    const notification = await Notification.query().whereNotNull('dedupe_key').firstOrFail()
    assert.equal(notification.link, `/dashboard/cars/${car.id}?tab=documents`)
    assert.include(notification.title, 'expires today')
  })
  test('a document can be recorded without a file or dates', async ({ client, assert }) => {
    const { car, fleetOfficer } = await setupFixture()

    const response = await client
      .post(`/api/v1/admin/cars/${car.id}/documents`)
      .loginAs(fleetOfficer)
      .json({ type: 'registration', documentNumber: 'REG-NO-FILE' })

    response.assertStatus(201)
    assert.equal(json(response).data.documentNumber, 'REG-NO-FILE')
    assert.isNull(json(response).data.file)
    assert.isNull(json(response).data.expiresOn)
  })
})
