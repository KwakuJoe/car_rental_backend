import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import Role from '#models/role'
import Permission from '#models/permission'
import User from '#models/user'
import Business from '#models/business'
import Branch from '#models/branch'
import OpeningHour from '#models/opening_hour'
import ClosureDate from '#models/closure_date'
import Category from '#models/category'
import Car from '#models/car'
import CarAllocation from '#models/car_allocation'
import RatePlan from '#models/rate_plan'
import PricingRule from '#models/pricing_rule'
import Extra from '#models/extra'
import ProtectionPlan from '#models/protection_plan'
import DeliveryZone from '#models/delivery_zone'
import Tax from '#models/tax'
import PricingService, { QuoteError, type QuoteInput } from '#services/pricing/pricing_service'
import SettingsService from '#services/settings/settings_service'

const json = (response: { body(): unknown }) => response.body() as Record<string, any>
const at = (iso: string) => DateTime.fromISO(iso, { zone: 'Africa/Accra' })

let seq = 0
async function makeCar(branchId: string, categoryId: string, extra: Partial<Car> = {}) {
  seq++
  return Car.create({
    branchId,
    categoryId,
    make: 'Toyota',
    model: 'Corolla',
    year: 2022,
    colour: 'Silver',
    registrationNo: `GR ${2000 + seq}-22`,
    vinChassisNo: `VINQUOTE${seq}XYZ`,
    transmission: 'auto',
    fuelType: 'petrol',
    seats: 5,
    doors: 4,
    luggage: 2,
    currentOdometerKm: 1000,
    status: 'active',
    ...extra,
  })
}

/** Business open Mon-Sat 08:00-18:00, closed Sunday. Economy: GHS 450/day, 2,800/week, 10,500/month. */
async function setup() {
  const business = await Business.create({
    name: 'Wynk Car Rentals',
    email: 'admin@wynk.test',
    timezone: 'Africa/Accra',
    vatRegistered: false,
  })
  const branch = await Branch.create({
    businessId: business.id,
    name: 'Main',
    code: 'MAIN',
    isMain: true,
  })
  for (let weekday = 0; weekday <= 6; weekday++) {
    await OpeningHour.create({
      branchId: branch.id,
      weekday,
      isClosed: weekday === 0,
      opensAt: weekday === 0 ? null : '08:00',
      closesAt: weekday === 0 ? null : '18:00',
    })
  }
  const economy = await Category.create({
    name: 'Economy',
    slug: 'economy',
    seats: 5,
    defaultDepositAmount: 100_000,
  })
  const car = await makeCar(branch.id, economy.id)
  await RatePlan.create({
    categoryId: economy.id,
    driveType: 'self_drive',
    dailyAmount: 45_000,
    weeklyAmount: 280_000,
    monthlyAmount: 1_050_000,
    mileageMode: 'default',
    fuelIncluded: false,
    active: true,
  })
  return { business, branch, economy, car }
}

const base = (carId: string, extra: Partial<QuoteInput> = {}): QuoteInput => ({
  carId,
  // Monday 09:00 -> Thursday 09:00: three days, all within opening hours
  pickupAt: at('2030-03-04T09:00'),
  returnAt: at('2030-03-07T09:00'),
  driveType: 'self_drive',
  ...extra,
})

test.group('PricingService.quote', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('three days at the daily price, with deposit and default terms', async ({ assert }) => {
    const { car } = await setup()
    const quote = await PricingService.quote(base(car.id))

    assert.equal(quote.rentalDays, 3)
    assert.equal(quote.tier, 'daily')
    assert.deepEqual(
      quote.days.map((day) => [day.date, day.amount]),
      [
        ['2030-03-04', 45_000],
        ['2030-03-05', 45_000],
        ['2030-03-06', 45_000],
      ]
    )
    assert.equal(quote.subtotal, 135_000)
    assert.equal(quote.taxTotal, 0)
    assert.equal(quote.total, 135_000)
    assert.equal(quote.deposit, 100_000) // category deposit, outside the total
    assert.equal(quote.reservationFee, 27_000) // default: 20% when paying at pickup
    assert.isTrue(quote.mileage.unlimited)
    assert.isNull(quote.protection)
    assert.deepEqual(quote.warnings, [])
  })

  test('the late-return grace period decides when an extra day starts', async ({ assert }) => {
    const { car } = await setup()
    const thirtyLate = await PricingService.quote(
      base(car.id, { returnAt: at('2030-03-07T09:30') })
    )
    assert.equal(thirtyLate.rentalDays, 3) // within the 59-minute grace
    const seventyLate = await PricingService.quote(
      base(car.id, { returnAt: at('2030-03-07T10:10') })
    )
    assert.equal(seventyLate.rentalDays, 4)
    const anHour = await PricingService.quote(
      base(car.id, { pickupAt: at('2030-03-04T09:00'), returnAt: at('2030-03-04T10:00') })
    )
    assert.equal(anHour.rentalDays, 1) // minimum one day
  })

  test('weekly and monthly prices apply from their thresholds', async ({ assert }) => {
    const { car } = await setup()
    const week = await PricingService.quote(base(car.id, { returnAt: at('2030-03-11T09:00') }))
    assert.equal(week.rentalDays, 7)
    assert.equal(week.tier, 'weekly')
    assert.equal(week.days[0].amount, 40_000) // 2,800 / 7
    assert.equal(week.subtotal, 280_000)

    const month = await PricingService.quote(base(car.id, { returnAt: at('2030-04-03T09:00') }))
    assert.equal(month.rentalDays, 30)
    assert.equal(month.tier, 'monthly')
    assert.equal(month.days[0].amount, 35_000) // 10,500 / 30
    assert.equal(month.subtotal, 1_050_000)
  })

  test('a rental crossing into a season pays the season price only on season days', async ({
    assert,
  }) => {
    const { car } = await setup()
    await PricingRule.create({
      name: 'Christmas season',
      type: 'season',
      dateFrom: DateTime.fromISO('2026-12-20'),
      dateTo: DateTime.fromISO('2027-01-05'),
      recursYearly: true,
      adjustmentType: 'percent',
      adjustmentValue: 2500,
      appliesTo: 'all',
      minRentalDays: 3,
      priority: 0,
      stackable: false,
      active: true,
    })

    // Wed 18 Dec -> Mon 23 Dec 2030
    const quote = await PricingService.quote(
      base(car.id, { pickupAt: at('2030-12-18T09:00'), returnAt: at('2030-12-23T09:00') })
    )
    assert.deepEqual(
      quote.days.map((day) => [day.date, day.amount]),
      [
        ['2030-12-18', 45_000],
        ['2030-12-19', 45_000],
        ['2030-12-20', 56_250],
        ['2030-12-21', 56_250],
        ['2030-12-22', 56_250],
      ]
    )
    assert.deepEqual(quote.days[2].adjustments, [{ name: 'Christmas season', change: 11_250 }])
    assert.isFalse(quote.warnings.some((warning) => warning.code.startsWith('rule_min_days')))

    const short = await PricingService.quote(
      base(car.id, { pickupAt: at('2030-12-24T09:00'), returnAt: at('2030-12-25T09:00') })
    )
    assert.include(
      short.warnings.map((warning) => warning.message),
      'Christmas season needs at least 3 days.'
    )
  })

  test('weekend surcharges apply on their weekdays only', async ({ assert }) => {
    const { car } = await setup()
    await PricingRule.create({
      name: 'Weekend',
      type: 'weekend',
      weekdays: [5, 6, 7],
      adjustmentType: 'fixed',
      adjustmentValue: 5_000,
      appliesTo: 'all',
      priority: 0,
      stackable: false,
      recursYearly: false,
      active: true,
    })
    // Fri 8 -> Mon 11 Mar 2030: Fri, Sat, Sun
    const quote = await PricingService.quote(
      base(car.id, { pickupAt: at('2030-03-08T09:00'), returnAt: at('2030-03-11T09:00') })
    )
    assert.deepEqual(
      quote.days.map((day) => day.amount),
      [50_000, 50_000, 50_000]
    )
  })

  test('extras per day vs per rental; protection and its deposit', async ({ assert }) => {
    const { car } = await setup()
    const seat = await Extra.create({
      name: 'Child seat',
      chargeType: 'per_day',
      amount: 3_000,
      maxQuantity: 2,
      taxable: true,
      availableOnline: true,
      sortOrder: 0,
      active: true,
    })
    const cooler = await Extra.create({
      name: 'Cooler box',
      chargeType: 'per_rental',
      amount: 5_000,
      maxQuantity: 1,
      taxable: true,
      availableOnline: true,
      sortOrder: 0,
      active: true,
    })
    await ProtectionPlan.create({
      name: 'Basic cover',
      perDayAmount: 0,
      excessAmount: 500_000,
      isDefault: true,
      taxable: true,
      availableOnline: true,
      sortOrder: 0,
      active: true,
    })
    const full = await ProtectionPlan.create({
      name: 'Full cover',
      perDayAmount: 15_000,
      excessAmount: 0,
      depositAmountOverride: 20_000,
      isDefault: false,
      taxable: true,
      availableOnline: true,
      sortOrder: 1,
      active: true,
    })

    const quote = await PricingService.quote(
      base(car.id, {
        extras: [
          { extraId: seat.id, quantity: 2 },
          { extraId: cooler.id, quantity: 1 },
        ],
        protectionPlanId: full.id,
      })
    )
    const amounts = Object.fromEntries(
      quote.lines.map((line) => [line.type + ':' + line.label, line.amount])
    )
    assert.equal(amounts['extra:Child seat × 2 (3 days)'], 18_000)
    assert.equal(amounts['extra:Cooler box'], 5_000)
    assert.equal(amounts['protection:Full cover (3 days)'], 45_000)
    assert.equal(quote.subtotal, 135_000 + 18_000 + 5_000 + 45_000)
    assert.equal(quote.deposit, 20_000) // the plan's deposit
    assert.deepEqual(quote.protection, { id: full.id, name: 'Full cover', excessAmount: 0 })

    const withDefault = await PricingService.quote(base(car.id))
    assert.equal(withDefault.protection?.name, 'Basic cover')
    const withNone = await PricingService.quote(base(car.id, { protectionPlanId: null }))
    assert.isNull(withNone.protection)

    await assert.rejects(
      () => PricingService.quote(base(car.id, { extras: [{ extraId: seat.id, quantity: 3 }] })),
      'At most 2 × Child seat per booking.'
    )
  })

  test('delivery, collection and after-hours fees; closed days', async ({ assert }) => {
    const { car } = await setup()
    const airport = await DeliveryZone.create({
      name: 'KIA',
      deliveryAmount: 15_000,
      collectionAmount: 12_000,
      afterHoursAmount: 10_000,
      availableOnline: true,
      sortOrder: 0,
      active: true,
    })

    // Delivered at 07:00 (before opening), collected at 12:00
    const delivered = await PricingService.quote(
      base(car.id, {
        pickupAt: at('2030-03-04T07:00'),
        returnAt: at('2030-03-07T07:00'),
        deliveryZoneId: airport.id,
        collectionZoneId: airport.id,
      })
    )
    const types = delivered.lines.map((line) => [line.type, line.amount])
    assert.deepInclude(types, ['delivery', 15_000])
    assert.deepInclude(types, ['collection', 12_000])
    assert.lengthOf(
      delivered.lines.filter((line) => line.type === 'after_hours'),
      2
    )

    // Office pickup out of hours: no fee set -> a warning instead
    const early = await PricingService.quote(base(car.id, { pickupAt: at('2030-03-04T07:00') }))
    assert.include(
      early.warnings.map((warning) => warning.code),
      'pickup_after_hours'
    )

    // With an office after-hours fee it is charged
    await db.transaction((trx) =>
      SettingsService.update({ 'booking.after_hours_fee': 5_000 }, null, trx)
    )
    const charged = await PricingService.quote(base(car.id, { pickupAt: at('2030-03-04T07:00') }))
    assert.deepInclude(
      charged.lines.map((line) => [line.label, line.amount]),
      ['After-hours pickup at the office', 5_000]
    )

    // Sunday is closed; a closure date too
    const sunday = await PricingService.quote(
      base(car.id, { pickupAt: at('2030-03-10T10:00'), returnAt: at('2030-03-12T10:00') })
    )
    assert.include(
      sunday.warnings.map((warning) => warning.code),
      'pickup_closure'
    )
    await ClosureDate.create({ branchId: car.branchId, date: DateTime.fromISO('2030-03-07') })
    const closure = await PricingService.quote(base(car.id))
    assert.include(
      closure.warnings.map((warning) => warning.code),
      'return_closure'
    )
  })

  test('taxes only when VAT registered; per day; exempt items skipped', async ({ assert }) => {
    const { business, car } = await setup()
    const giftBox = await Extra.create({
      name: 'Water pack',
      chargeType: 'per_rental',
      amount: 1_000,
      maxQuantity: 1,
      taxable: false,
      availableOnline: true,
      sortOrder: 0,
      active: true,
    })
    await Tax.create({
      name: 'VAT',
      rateBp: 1500,
      calculation: 'on_net',
      appliesTo: ['rental', 'extras', 'protection', 'delivery', 'fees'],
      sortOrder: 0,
      active: true,
    })
    const input = base(car.id, { extras: [{ extraId: giftBox.id, quantity: 1 }] })

    const notRegistered = await PricingService.quote(input)
    assert.equal(notRegistered.taxTotal, 0)
    assert.isFalse(notRegistered.vatRegistered)

    business.vatRegistered = true
    await business.save()
    const registered = await PricingService.quote(input)
    assert.equal(registered.taxTotal, 20_250) // 15% of 3 × 450; the exempt pack untaxed
    assert.equal(registered.total, 135_000 + 1_000 + 20_250)
    assert.equal(registered.deposit, 100_000) // never taxed
  })

  test('with a driver: out-of-town days and overnight allowance', async ({ assert }) => {
    const { branch } = await setup()
    const executive = await Category.create({
      name: 'Executive',
      slug: 'executive',
      seats: 5,
      selfDriveAllowed: false,
      defaultDepositAmount: 0,
    })
    const car = await makeCar(branch.id, executive.id)
    await RatePlan.create({
      categoryId: executive.id,
      driveType: 'chauffeur',
      dailyAmount: 65_000,
      outOfTownDailyAmount: 90_000,
      driverOvernightAmount: 20_000,
      driverHoursPerDay: 12,
      driverOvertimeHourAmount: 5_000,
      mileageMode: 'unlimited',
      fuelIncluded: false,
      active: true,
    })

    await assert.rejects(
      () => PricingService.quote(base(car.id)),
      'Executive is chauffeur-only - choose "with driver".'
    )

    const trip = await PricingService.quote(
      base(car.id, {
        driveType: 'chauffeur',
        outOfTown: true,
        driverNightsAway: 1,
        returnAt: at('2030-03-06T09:00'),
      })
    )
    assert.equal(trip.tier, 'out_of_town')
    assert.equal(trip.subtotal, 2 * 90_000 + 20_000)
    assert.deepEqual(trip.chauffeur, {
      fuelIncluded: false,
      driverHoursPerDay: 12,
      overtimeHourAmount: 5_000,
    })
  })

  test('explains why a car cannot be quoted', async ({ assert }) => {
    const { branch, car } = await setup()
    const vans = await Category.create({ name: 'Vans', slug: 'vans', seats: 12 })
    const van = await makeCar(branch.id, vans.id)

    await assert.rejects(
      () => PricingService.quote(base(van.id)),
      /There is no self-drive rate for Vans on 4 Mar 2030, 5 Mar 2030, 6 Mar 2030/
    )
    await assert.rejects(
      () => PricingService.quote(base(car.id, { returnAt: at('2030-03-04T08:00') })),
      'Return must be after pickup.'
    )
    const inGarage = await makeCar(branch.id, car.categoryId, { status: 'in_maintenance' })
    await assert.rejects(
      () => PricingService.quote(base(inGarage.id)),
      'This car is in maintenance - change its status before quoting it.'
    )

    try {
      await PricingService.quote(base(van.id))
    } catch (error) {
      assert.instanceOf(error, QuoteError)
    }
  })

  test('warns when the car is already booked or blocked', async ({ assert }) => {
    const { car } = await setup()
    await CarAllocation.create({
      carId: car.id,
      source: 'block',
      startsAt: at('2030-03-05T00:00'),
      endsAt: at('2030-03-05T23:59'),
      endsAtWithBuffer: at('2030-03-05T23:59'),
      bufferMinutes: 0,
      active: true,
    })
    const quote = await PricingService.quote(base(car.id))
    assert.include(
      quote.warnings.map((warning) => warning.code),
      'unavailable'
    )
  })
})

test.group('POST /admin/quotes', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('front desk can quote; drivers cannot; errors explain themselves', async ({
    client,
    assert,
  }) => {
    const { car } = await setup()
    const view = await Permission.create({
      name: 'View pricing',
      slug: 'pricing.view',
      group: 'pricing',
    })
    const deskRole = await Role.create({ name: 'Front Desk', slug: 'front-desk' })
    await deskRole.related('permissions').attach([view.id])
    const driverRole = await Role.create({ name: 'Driver', slug: 'driver' })
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
    const body = {
      carId: car.id,
      pickupAt: '2030-03-04T09:00',
      returnAt: '2030-03-07T09:00',
      driveType: 'self_drive' as const,
    }

    const ok = await client.post('/api/v1/admin/quotes').json(body).loginAs(desk)
    ok.assertStatus(200)
    assert.equal(json(ok).data.total, 135_000)
    assert.equal(json(ok).data.pickupAt, '2030-03-04T09:00:00.000+00:00')

    const forbidden = await client.post('/api/v1/admin/quotes').json(body).loginAs(driver)
    forbidden.assertStatus(403)

    const badDate = await client
      .post('/api/v1/admin/quotes')
      .json({ ...body, pickupAt: 'next friday' })
      .loginAs(desk)
    badDate.assertStatus(422)

    const backwards = await client
      .post('/api/v1/admin/quotes')
      .json({ ...body, returnAt: '2030-03-01T09:00' })
      .loginAs(desk)
    backwards.assertStatus(422)
    assert.deepEqual(json(backwards).errors[0], {
      field: 'returnAt',
      rule: 'quote',
      message: 'Return must be after pickup.',
    })
  })
})
