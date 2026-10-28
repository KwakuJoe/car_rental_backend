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
import Fee from '#models/fee'
import Booking from '#models/booking'
import HandoverPdfService from '#services/handover/handover_pdf_service'

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
    // Money: the balance and the deposit, recorded as payments
    const bookingUrl = `/api/v1/admin/bookings/${json(created).data.id}`
    const money = json(await client.get(`${bookingUrl}/payments`).loginAs(owner)).data.summary
    for (const [type, amount] of [
      ['rental', money.balance],
      ['deposit', money.depositDue],
    ]) {
      const paid = await client
        .post(`${bookingUrl}/payments`)
        .json({ type, method: 'cash', amount })
        .loginAs(owner)
      paid.assertStatus(201)
    }
    const saved = await client.put(url).json({ odometerKm: 1500, fuelLevel: 6 }).loginAs(owner)
    assert.deepEqual(failing(json(saved).data), [])
    assert.isTrue(json(saved).data.ready)

    // A scratch marked on the diagram goes on the car's register
    const marked = await client
      .post(`${url}/damages`)
      .json({ zone: 'left_front_door', x: 40, y: 55, type: 'scratch', severity: 'minor' })
      .loginAs(owner)
    marked.assertStatus(200)
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

  test('photos saved at the same moment are all kept (one angle per save)', async ({
    client,
    assert,
  }) => {
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
    const url = `/api/v1/admin/bookings/${json(created).data.id}/check-out`
    await client.get(url).loginAs(owner)
    const angles = ['front', 'rear', 'left', 'right', 'odometer', 'fuel_gauge']
    const files: File[] = []
    for (const angle of angles) {
      files.push(
        await File.create({
          disk: 'cloudinary',
          path: `wynk/inspection_photo/${angle}`,
          url: `https://res.cloudinary.com/test/${angle}.png`,
          originalName: `${angle}.png`,
          mime: 'image/png',
          size: 1000,
          purpose: 'inspection_photo',
          isPrivate: false,
          metadata: {},
        })
      )
    }
    // Six tiles finishing their uploads together
    await Promise.all(
      angles.map((angle, index) =>
        client
          .put(url)
          .json({ photo: { angle, fileId: files[index].id } })
          .loginAs(owner)
      )
    )
    let screen = json(await client.get(url).loginAs(owner)).data
    assert.sameMembers(
      screen.inspection.photos.map((photo: { angle: string }) => photo.angle),
      angles
    )

    // Removing one leaves the others
    await client
      .put(url)
      .json({ photo: { angle: 'rear', fileId: null } })
      .loginAs(owner)
    screen = json(await client.get(url).loginAs(owner)).data
    assert.lengthOf(screen.inspection.photos, 5)
    assert.notInclude(
      screen.inspection.photos.map((photo: { angle: string }) => photo.angle),
      'rear'
    )
  })
})

/** A confirmed booking, checked out at 1,500 km with a full tank (verified customer, valid papers). */
async function checkedOut(client: any, ctx: Awaited<ReturnType<typeof setup>>) {
  const { car, customer, owner } = ctx
  customer.verificationStatus = 'verified'
  await customer.save()
  for (const type of ['roadworthy', 'insurance']) {
    await VehicleDocument.create({
      carId: car.id,
      type,
      expiresOn: DateTime.now().plus({ years: 1 }),
    })
  }
  const created = await client
    .post('/api/v1/admin/bookings')
    .json({
      customerId: customer.id,
      carId: car.id,
      pickupAt: '2030-03-04T09:00',
      returnAt: '2030-03-07T09:00',
      driveType: 'self_drive',
      source: 'phone',
      protectionPlanId: null,
      confirm: true,
    })
    .loginAs(owner)
  const id = json(created).data.id
  await client
    .put(`/api/v1/admin/bookings/${id}/check-out`)
    // Unpaid on purpose (charges at return are added to the balance)
    .json({
      odometerKm: 1500,
      fuelLevel: 8,
      paymentConfirmed: true,
      paymentOverrideReason: 'Pays on return',
    })
    .loginAs(owner)
  // No drawn signature: the typed name is enough while signature uploads are off
  const done = await client
    .post(`/api/v1/admin/bookings/${id}/check-out/complete`)
    .json({ signedName: 'Ama Owusu' })
    .loginAs(owner)
  done.assertStatus(200)
  return { id, total: json(created).data.totalAmount as number }
}

test.group('check-in', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('compare with check-out, propose charges, waive with a reason, car returned', async ({
    client,
    assert,
  }) => {
    const ctx = await setup()
    // 100 km a day included, GHS 2 per km over; a 40 L tank; fuel GHS 15/L + GHS 50 refuel service
    await RatePlan.query().update({
      mileage_mode: 'limited',
      included_km_per_day: 100,
      excess_km_amount: 200,
    })
    ctx.car.fuelCapacityL = 40 as any
    await ctx.car.save()
    await Fee.createMany([
      {
        code: 'fuel_per_litre',
        name: 'Fuel',
        unit: 'per_litre',
        amount: 15_00,
        taxable: true,
        active: true,
      },
      {
        code: 'refuel_service',
        name: 'Refuel service',
        unit: 'flat',
        amount: 50_00,
        taxable: true,
        active: true,
      },
    ])
    const { id, total } = await checkedOut(client, ctx)
    const url = `/api/v1/admin/bookings/${id}/check-in`

    // Back with 500 km on the clock, half a tank, no jack, a new dent
    let screen = json(await client.get(url).loginAs(ctx.owner)).data
    assert.equal(screen.inspection.type, 'check_in')
    const checklist = screen.inspection.checklist.map((item: any) =>
      item.name === 'Jack' ? { ...item, result: 'missing' } : item
    )
    await client.put(url).json({ odometerKm: 2000, fuelLevel: 4, checklist }).loginAs(ctx.owner)
    await client
      .post(`${url}/damages`)
      .json({ zone: 'rear_bumper', x: 50, y: 95, type: 'dent', severity: 'moderate' })
      .loginAs(ctx.owner)
    screen = json(await client.get(url).loginAs(ctx.owner)).data
    assert.isTrue(screen.ready)
    assert.equal(screen.comparison.kmDriven, 500)
    const proposed = Object.fromEntries(
      screen.comparison.proposed.map((charge: any) => [charge.code, charge])
    )
    assert.equal(proposed.excess_km.amount, 200 * 200) // 200 km over x GHS 2
    assert.equal(proposed.fuel.quantity, 20) // half of a 40 L tank
    assert.equal(proposed.fuel.amount, 20 * 15_00)
    assert.equal(proposed.refuel_service.amount, 50_00)
    assert.isTrue(proposed.missing_item.needsAmount)
    assert.isTrue(proposed.damage.needsAmount)

    // Accept km + refuel + damage GHS 800; waive the fuel (GHS 300 - above the GHS 200 staff limit)
    const charges = [
      { ...proposed.excess_km, waived: false },
      { ...proposed.fuel, waived: true, waiveReason: 'Customer refuelled at our station' },
      { ...proposed.refuel_service, waived: false },
      { ...proposed.damage, amount: 800_00, unitAmount: 800_00, waived: false },
      { ...proposed.missing_item, waived: false },
    ]
    // (typed client can't tell the check-in body from the check-out one by this URL)
    const tooMuch = await client
      .post(`${url}/complete`)
      .json({ charges } as any)
      .loginAs(ctx.owner)
    tooMuch.assertStatus(422)
    assert.equal(json(tooMuch).errors[0].field, 'overrideReason')
    const done = await client
      .post(`${url}/complete`)
      .json({ charges, overrideReason: 'Regular customer, manager approved' } as any)
      .loginAs(ctx.owner)
    done.assertStatus(200)
    assert.equal(json(done).data.inspection.status, 'completed')
    assert.lengthOf(json(done).data.charges, 4) // the zero missing-item line isn't saved

    const booking = await Booking.findOrFail(id)
    assert.equal(booking.status, 'returned')
    assert.equal(booking.totalAmount, total + 40_000 + 50_00 + 800_00)
    await ctx.car.refresh()
    assert.equal(ctx.car.currentOdometerKm, 2000)

    // The signed agreement and the return report, as PDFs
    for (const name of ['agreement.pdf', 'check-in-report.pdf']) {
      const pdf = await client.get(`/api/v1/admin/bookings/${id}/${name}`).loginAs(ctx.owner)
      pdf.assertStatus(200)
      assert.equal(pdf.header('content-type'), 'application/pdf')
    }
    const agreement = await HandoverPdfService.agreement(id)
    const report = await HandoverPdfService.checkInReport(id)
    assert.equal(agreement.subarray(0, 4).toString(), '%PDF')
    assert.equal(report.subarray(0, 4).toString(), '%PDF')
    // PDF_OUT=<folder> keeps a copy to look at
    if (process.env.PDF_OUT) {
      const { writeFile } = await import('node:fs/promises')
      await writeFile(`${process.env.PDF_OUT}/agreement.pdf`, agreement)
      await writeFile(`${process.env.PDF_OUT}/return-report.pdf`, report)
    }
  })

  test('no agreement before the car goes out', async ({ client }) => {
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
    const pdf = await client
      .get(`/api/v1/admin/bookings/${json(created).data.id}/agreement.pdf`)
      .loginAs(owner)
    pdf.assertStatus(422)
  })
})
