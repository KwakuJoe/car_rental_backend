import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import type { PaymentType } from '#models/payment'

const DAYS = 30
/** How far ahead future bookings go (the calendar) */
const AHEAD = 30
/** Demo cars are recognised by this VIN prefix (re-run guard) */
const VIN_PREFIX = 'DEMO'

// [name, slug, seats, daily GHS, weekly GHS, deposit GHS, chauffeur daily GHS or null]
const CATEGORIES = [
  ['Economy', 'economy', 5, 350, 2100, 1000, null],
  ['Saloon', 'saloon', 5, 500, 3000, 1500, 800],
  ['SUV', 'suv', 7, 900, 5600, 3000, 1300],
  ['Executive', 'executive', 5, 1500, 9500, 5000, 2000],
] as const

// [category slug, make, model, year, colour]
const CARS = [
  ['economy', 'Toyota', 'Yaris', 2021, 'Silver'],
  ['economy', 'Toyota', 'Yaris', 2022, 'White'],
  ['economy', 'Hyundai', 'Accent', 2021, 'Grey'],
  ['economy', 'Kia', 'Rio', 2022, 'Red'],
  ['saloon', 'Toyota', 'Corolla', 2022, 'Black'],
  ['saloon', 'Toyota', 'Corolla', 2023, 'Silver'],
  ['saloon', 'Hyundai', 'Elantra', 2022, 'White'],
  ['suv', 'Toyota', 'RAV4', 2022, 'Grey'],
  ['suv', 'Hyundai', 'Santa Fe', 2021, 'Black'],
  ['suv', 'Toyota', 'Fortuner', 2023, 'White'],
  ['executive', 'Toyota', 'Land Cruiser Prado', 2023, 'Black'],
  ['executive', 'Mercedes-Benz', 'E-Class', 2022, 'Black'],
] as const

// Wikimedia Commons photos (lead images of each model's Wikipedia article), linked not uploaded
const COMMONS = 'https://upload.wikimedia.org/wikipedia/commons/thumb'
const PHOTOS: Record<string, string> = {
  'Yaris': `${COMMONS}/3/3e/2020_Toyota_Yaris_Design_HEV_CVT_1.5_Front.jpg/1280px-2020_Toyota_Yaris_Design_HEV_CVT_1.5_Front.jpg`,
  'Accent': `${COMMONS}/9/9d/2019_Hyundai_Accent_1.6L%2C_front_10.8.19.jpg/1280px-2019_Hyundai_Accent_1.6L%2C_front_10.8.19.jpg`,
  'Rio': `${COMMONS}/c/c4/2021_Kia_Rio_3_MHEV_facelift_1.0.jpg/1280px-2021_Kia_Rio_3_MHEV_facelift_1.0.jpg`,
  'Corolla': `${COMMONS}/f/fe/Toyota_Corolla_Hybrid_%28E210%29_IMG_4338.jpg/1280px-Toyota_Corolla_Hybrid_%28E210%29_IMG_4338.jpg`,
  'Elantra': `${COMMONS}/a/a4/2023_Hyundai_Elantra_Limited_in_Silver%2C_front_left%2C_04-04-2026.jpg/1280px-2023_Hyundai_Elantra_Limited_in_Silver%2C_front_left%2C_04-04-2026.jpg`,
  'RAV4': `${COMMONS}/2/2d/2024_Toyota_RAV4_Prime_XSE_Premium_in_Silver_Sky_with_Midnight_Black_roof%2C_front_left.jpg/1280px-2024_Toyota_RAV4_Prime_XSE_Premium_in_Silver_Sky_with_Midnight_Black_roof%2C_front_left.jpg`,
  'Santa Fe': `${COMMONS}/e/e6/2024_Hyundai_Santa_Fe_Luxury_AWD_in_Hampton_Grey%2C_front_left%2C_2024-06-30.jpg/1280px-2024_Hyundai_Santa_Fe_Luxury_AWD_in_Hampton_Grey%2C_front_left%2C_2024-06-30.jpg`,
  'Fortuner': `${COMMONS}/6/66/2015_Toyota_Fortuner_%28New_Zealand%29.jpg/1280px-2015_Toyota_Fortuner_%28New_Zealand%29.jpg`,
  'Land Cruiser Prado': `${COMMONS}/e/e8/2024_Toyota_Land_Cruiser_250_VX_in_Platinum_White_Pearl_Mica%2C_front_left.jpg/1280px-2024_Toyota_Land_Cruiser_250_VX_in_Platinum_White_Pearl_Mica%2C_front_left.jpg`,
  'E-Class': `${COMMONS}/f/fd/Mercedes-Benz_W214_1X7A1841.jpg/1280px-Mercedes-Benz_W214_1X7A1841.jpg`,
}

const DRIVERS = ['Isaac Adjei', 'Emmanuel Kuffour', 'Samuel Ansah', 'Joseph Larbi', 'Prince Opoku']

const FIRST = [
  'Kwame',
  'Ama',
  'Kofi',
  'Akosua',
  'Yaw',
  'Abena',
  'Kwesi',
  'Efua',
  'Kojo',
  'Adwoa',
  'Nana',
  'Esi',
  'Fiifi',
  'Afia',
  'Selorm',
  'Dzifa',
  'Michael',
  'Grace',
  'Daniel',
  'Sarah',
]
const LAST = [
  'Mensah',
  'Owusu',
  'Boateng',
  'Asante',
  'Osei',
  'Agyeman',
  'Appiah',
  'Darko',
  'Addo',
  'Quaye',
  'Tetteh',
  'Ofori',
  'Amoah',
  'Badu',
  'Nkrumah',
]

// Weighted picks
const SOURCES = [
  'whatsapp',
  'whatsapp',
  'whatsapp',
  'phone',
  'phone',
  'walk_in',
  'walk_in',
  'website',
  'website',
  'corporate',
] as const
const METHODS = ['momo', 'momo', 'momo', 'cash', 'cash', 'bank_transfer'] as const
const LENGTHS = [1, 2, 2, 3, 3, 3, 4, 5, 7, 7, 10]
/** Statuses whose car (and driver) allocation stays active, as in the app */
const KEEPS_ALLOCATION = ['pending', 'confirmed', 'on_rent', 'returned', 'closed']

const pick = <T>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)]
const between = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1))
const chance = (p: number) => Math.random() < p

export default class DemoSeed extends BaseCommand {
  static commandName = 'demo:seed'
  static description =
    'Fill this install with demo data: 12 cars with photos, drivers, customers, a month of rentals, payments, invoices and expenses'

  static options: CommandOptions = {
    startApp: true,
  }

  @flags.boolean({ description: 'Allow running when NODE_ENV=production' })
  declare force: boolean

  async run() {
    // Imported lazily, see business:create
    const { default: Business } = await import('#models/business')
    const { default: Branch } = await import('#models/branch')
    const { default: User } = await import('#models/user')
    const { default: Category } = await import('#models/category')
    const { default: RatePlan } = await import('#models/rate_plan')
    const { default: Car } = await import('#models/car')
    const { default: CarPhoto } = await import('#models/car_photo')
    const { default: File } = await import('#models/file')
    const { default: Driver } = await import('#models/driver')
    const { default: DriverAllocation } = await import('#models/driver_allocation')
    const { default: Customer } = await import('#models/customer')
    const { default: Booking } = await import('#models/booking')
    const { default: CarAllocation } = await import('#models/car_allocation')
    const { default: Payment } = await import('#models/payment')
    const { default: Invoice } = await import('#models/invoice')
    const { default: Expense } = await import('#models/expense')
    const { default: ExpenseCategory } = await import('#models/expense_category')
    const { PricingService } = await import('#services/pricing/pricing_service')
    const { default: InvoiceService } = await import('#services/invoices/invoice_service')
    const { default: NumberingService } = await import('#services/numbering_service')
    const { default: SettingsService } = await import('#services/settings/settings_service')

    if (this.app.inProduction && !this.force) {
      this.logger.error('Refusing to add demo data in production. Pass --force if you mean it.')
      this.exitCode = 1
      return
    }
    const business = await Business.first()
    const branch = await Branch.query().where('is_main', true).first()
    if (!business || !branch) {
      this.logger.error('Run `node ace business:create` first.')
      this.exitCode = 1
      return
    }
    if (await Car.query().whereLike('vin_chassis_no', `${VIN_PREFIX}%`).first()) {
      this.logger.error(
        'Demo data is already here. `node ace migration:fresh` resets the database.'
      )
      this.exitCode = 1
      return
    }

    const zone = business.timezone || 'Africa/Accra'
    const now = DateTime.now().setZone(zone)
    const start = now.minus({ days: DAYS }).startOf('day')
    const users = await User.query().select('id')
    const staff = users.map((user) => user.id)
    const buffer = await SettingsService.get('booking.turnaround_buffer_minutes')

    // ── Catalog: categories, rate plans, cars, photos, drivers, customers ──
    // Committed first: the pricing service reads on its own connection
    const { cars, drivers, customers } = await db.transaction(async (trx) => {
      const client = { client: trx }
      const addedAt = start.minus({ days: 60 })
      const categoryIds = new Map<string, string>()
      for (const [
        index,
        [name, slug, seats, daily, weekly, deposit, chauffeur],
      ] of CATEGORIES.entries()) {
        const model = CARS.find((car) => car[0] === slug)![2]
        const category = await Category.firstOrCreate(
          { slug },
          {
            name,
            seats,
            image: PHOTOS[model],
            defaultDepositAmount: deposit * 100,
            sortOrder: index,
            active: true,
          },
          client
        )
        categoryIds.set(slug, category.id)
        const plans = await RatePlan.query(client).where('category_id', category.id)
        if (!plans.some((plan) => plan.driveType === 'self_drive')) {
          await RatePlan.create(
            {
              categoryId: category.id,
              driveType: 'self_drive',
              dailyAmount: daily * 100,
              weeklyAmount: weekly * 100,
              active: true,
            },
            client
          )
        }
        if (chauffeur && !plans.some((plan) => plan.driveType === 'chauffeur')) {
          await RatePlan.create(
            {
              categoryId: category.id,
              driveType: 'chauffeur',
              dailyAmount: chauffeur * 100,
              outOfTownDailyAmount: Math.round(chauffeur * 1.4) * 100,
              driverOvernightAmount: 20000,
              driverHoursPerDay: 10,
              driverOvertimeHourAmount: 5000,
              active: true,
            },
            client
          )
        }
      }

      const newCars = []
      for (const [index, [slug, make, model, year, colour]] of CARS.entries()) {
        const car = await Car.create(
          {
            branchId: branch.id,
            categoryId: categoryIds.get(slug)!,
            make,
            model,
            year,
            colour,
            registrationNo: `GR ${2100 + index * 637}-${String(year).slice(2)}`,
            vinChassisNo: `${VIN_PREFIX}${String(index + 1).padStart(13, '0')}`,
            seats: CATEGORIES.find((category) => category[1] === slug)![2],
            currentOdometerKm: between(15000, 90000),
            purchaseDate: addedAt,
            status: 'active',
            createdAt: addedAt,
          },
          client
        )
        // disk 'url': a plain link, so deleting the car never calls Cloudinary
        const file = await File.create(
          {
            disk: 'url',
            path: PHOTOS[model],
            url: PHOTOS[model],
            originalName: `${make} ${model}.jpg`,
            mime: 'image/jpeg',
            size: 0,
            uploadedBy: staff[0] ?? null,
            attachableType: 'car',
            attachableId: car.id,
            purpose: 'car_photo',
            isPrivate: false,
          },
          client
        )
        await CarPhoto.create(
          { carId: car.id, fileId: file.id, sortOrder: 0, isCover: true },
          client
        )
        newCars.push(car)
      }

      const newDrivers = []
      for (const [index, fullName] of DRIVERS.entries()) {
        newDrivers.push(
          await Driver.create(
            {
              fullName,
              phone: `+23320${String(between(1000000, 9999999))}`,
              licenceNo: `DVLA-${between(100000, 999999)}`,
              licenceClass: 'C',
              licenceExpiresOn: now.plus({ years: between(1, 4) }).startOf('day'),
              status: index === DRIVERS.length - 1 ? 'on_leave' : 'active',
              dailyRateAmount: between(15, 25) * 1000,
            },
            client
          )
        )
      }

      const newCustomers = []
      for (let index = 0; index < 60; index++) {
        const fullName = `${pick(FIRST)} ${pick(LAST)}`
        newCustomers.push(
          await Customer.create(
            {
              branchId: branch.id,
              fullName,
              phone: `+23324${String(between(1000000, 9999999))}`,
              email: chance(0.6)
                ? `${fullName.toLowerCase().replace(' ', '.')}${index}@example.com`
                : null,
              nationality: 'GH',
              source: pick(SOURCES),
              verificationStatus: 'verified',
              createdAt: start.minus({ days: between(0, 90) }),
            },
            client
          )
        )
      }
      return {
        cars: newCars,
        drivers: newDrivers.filter((driver) => driver.status === 'active'),
        customers: newCustomers,
      }
    })

    for (const car of cars) await car.load('category')

    // ── Rentals: walk each car through the month and the weeks ahead ───
    const counts: Record<string, number> = {}
    const driverBusy = new Map<string, [DateTime, DateTime][]>()
    const freeDriver = (from: DateTime, to: DateTime) =>
      drivers.find((driver) =>
        (driverBusy.get(driver.id) ?? []).every(
          ([busyFrom, busyTo]) => to <= busyFrom || from >= busyTo
        )
      )
    const chauffeurSlugs: string[] = CATEGORIES.filter((category) => category[6]).map(
      (category) => category[1]
    )
    let invoices = 0
    let chauffeured = 0

    for (const car of cars) {
      let cursor = start.minus({ days: between(0, 4) })
      while (cursor < now.plus({ days: AHEAD })) {
        // Busy now, thinning out further ahead
        const gap =
          cursor < now
            ? between(0, 1)
            : cursor < now.plus({ days: 10 })
              ? between(0, 2)
              : between(1, 4)
        let pickupAt = cursor
          .plus({ days: gap })
          .set({ hour: between(8, 16), minute: pick([0, 15, 30, 45]) })
        if (pickupAt < cursor) pickupAt = pickupAt.plus({ days: 1 })
        const returnAt = pickupAt.plus({ days: pick(LENGTHS) })
        // Returns run up to 90 minutes late, and the allocation follows the actual return
        cursor = returnAt.plus({ minutes: 90 + buffer + 30 })

        const source = pick(SOURCES)
        const createdAt = DateTime.min(
          source === 'walk_in'
            ? pickupAt.minus({ hours: 1 })
            : pickupAt.minus({ hours: between(4, 240) }),
          now.minus({ minutes: between(5, 600) })
        )
        const status = this.statusFor(pickupAt, returnAt, createdAt, now)
        counts[status] = (counts[status] ?? 0) + 1
        const keeps = KEEPS_ALLOCATION.includes(status)

        // About a third of the bigger cars go out with a driver, when one is free
        const driver =
          chauffeurSlugs.includes(car.category.slug) && chance(0.35)
            ? freeDriver(pickupAt, returnAt)
            : undefined
        const driveType = driver ? 'chauffeur' : 'self_drive'
        if (driver) {
          chauffeured++
          if (keeps)
            driverBusy.set(driver.id, [...(driverBusy.get(driver.id) ?? []), [pickupAt, returnAt]])
        }

        const quote = await PricingService.quote({
          carId: car.id,
          car,
          knownAvailable: true,
          pickupAt,
          returnAt,
          driveType,
          protectionPlanId: null,
        })
        const total = quote.total
        const deposit = quote.deposit
        const recorder = source === 'website' ? null : pick(staff)
        const customer = pick(customers)

        const actualPickupAt = ['on_rent', 'returned', 'closed'].includes(status)
          ? pickupAt.plus({ minutes: between(-20, 45) })
          : null
        const actualReturnAt = ['returned', 'closed'].includes(status)
          ? returnAt.plus({ minutes: between(-180, 90) })
          : null
        const confirmedAt =
          status === 'pending' || status === 'expired' ? null : createdAt.plus({ minutes: 30 })
        const cancelledAt = DateTime.max(
          createdAt.plus({ hours: 1 }),
          DateTime.min(pickupAt.minus({ hours: 12 }), now)
        )

        // Money in: [type, amount, paidAt]
        const payments: [PaymentType, number, DateTime][] = []
        const upfront = Math.round(total * 0.3)
        let fee: number | null = null
        if (status === 'closed') {
          if (chance(0.5)) payments.push(['rental', total, confirmedAt!])
          else
            payments.push(
              ['rental', upfront, confirmedAt!],
              ['rental', total - upfront, actualPickupAt!]
            )
        } else if (status === 'returned') {
          // Returned with some still owed
          payments.push(
            ['rental', upfront, confirmedAt!],
            ['rental', Math.round(total * 0.4), actualPickupAt!]
          )
        } else if (status === 'on_rent') {
          payments.push(['rental', upfront, confirmedAt!])
          if (chance(0.6)) payments.push(['rental', total - upfront, actualPickupAt!])
        } else if (status === 'confirmed') {
          if (chance(0.7)) payments.push(['rental', upfront, confirmedAt!])
        } else if (status === 'cancelled' && chance(0.6)) {
          fee = Math.round(total * 0.1)
          payments.push(['rental', upfront, confirmedAt!], ['refund', upfront - fee, cancelledAt])
        } else if (status === 'no_show') {
          fee = upfront
          payments.push(['rental', upfront, confirmedAt!])
        }
        if (actualPickupAt) payments.push(['deposit', deposit, actualPickupAt])
        if (status === 'closed')
          payments.push(['deposit_refund', deposit, actualReturnAt!.plus({ minutes: 20 })])

        const amount = (type: PaymentType) =>
          payments.filter(([kind]) => kind === type).reduce((sum, [, value]) => sum + value, 0)
        const paid = amount('rental') - amount('refund')

        const booking = await db.transaction(async (trx) => {
          const client = { client: trx }
          const created = await Booking.create(
            {
              reference: await NumberingService.next('booking', trx),
              branchId: branch.id,
              customerId: customer.id,
              carId: car.id,
              categoryId: car.categoryId,
              source,
              driveType,
              driverId: driver && keeps ? driver.id : null,
              status,
              pickupAt,
              returnAt,
              actualPickupAt,
              actualReturnAt,
              holdExpiresAt:
                status === 'pending' || status === 'expired' ? createdAt.plus({ hours: 24 }) : null,
              priceSnapshot: quote,
              subtotalAmount: quote.subtotal,
              discountAmount: 0,
              taxAmount: quote.taxTotal,
              totalAmount: total,
              depositAmount: deposit,
              reservationFeeAmount: quote.reservationFee,
              paidAmount: paid,
              balanceAmount: total - paid,
              depositHeldAmount: amount('deposit') - amount('deposit_refund'),
              confirmedAt,
              confirmedBy: confirmedAt ? recorder : null,
              cancelledAt: status === 'cancelled' ? cancelledAt : null,
              cancelledBy: status === 'cancelled' ? pick(staff) : null,
              cancelReason: status === 'cancelled' ? 'Customer changed plans' : null,
              cancellationFeeAmount: fee,
              noShowAt: status === 'no_show' ? pickupAt.plus({ hours: 3 }) : null,
              createdBy: recorder,
              paymentPlan: source === 'website' ? 'deposit' : null,
              createdAt,
            },
            client
          )

          const ends = actualReturnAt ?? returnAt
          await CarAllocation.create(
            {
              carId: car.id,
              bookingId: created.id,
              source: status === 'pending' ? 'hold' : 'booking',
              startsAt: pickupAt,
              endsAt: ends,
              endsAtWithBuffer: ends.plus({ minutes: buffer }),
              bufferMinutes: buffer,
              active: keeps,
              createdBy: recorder,
              createdAt,
            },
            client
          )
          if (driver && keeps) {
            await DriverAllocation.create(
              {
                driverId: driver.id,
                bookingId: created.id,
                startsAt: pickupAt,
                endsAt: returnAt,
                active: true,
                createdAt,
              },
              client
            )
          }

          for (const [type, value, paidAt] of payments) {
            if (value <= 0) continue
            const method = pick(METHODS)
            await Payment.create(
              {
                number: await NumberingService.next(
                  type === 'refund' || type === 'deposit_refund' ? 'refund' : 'receipt',
                  trx
                ),
                bookingId: created.id,
                customerId: customer.id,
                branchId: branch.id,
                type,
                method,
                amount: value,
                transactionRef: method === 'cash' ? null : `TX${between(10000000, 99999999)}`,
                payerName: customer.fullName,
                status: 'completed',
                paidAt,
                // Online payments up front have no staff member
                recordedBy:
                  source === 'website' && paidAt === confirmedAt ? null : (recorder ?? pick(staff)),
                createdAt: paidAt,
              },
              client
            )
          }
          return created
        })

        // Invoices: always for corporate, often for finished rentals, sometimes up front
        const invoiceAt = actualReturnAt ?? confirmedAt
        const wantsInvoice =
          source === 'corporate' ||
          (['closed', 'returned'].includes(status) && chance(0.5)) ||
          (['on_rent', 'confirmed'].includes(status) && chance(0.2))
        if (invoiceAt && wantsInvoice) {
          const draft = await InvoiceService.draft(booking)
          await db.transaction(async (trx) => {
            await Invoice.create(
              {
                number: await NumberingService.next('invoice', trx),
                branchId: branch.id,
                bookingId: booking.id,
                customerId: customer.id,
                billTo: draft.billTo,
                lines: draft.lines,
                taxes: draft.taxes,
                subtotalAmount: draft.subtotal,
                taxAmount: draft.tax,
                totalAmount: draft.total,
                issuedAt: invoiceAt,
                dueOn: invoiceAt.plus({ days: source === 'corporate' ? 30 : 7 }).startOf('day'),
                notes: source === 'corporate' ? 'Payable within 30 days.' : null,
                status: 'issued',
                issuedBy: recorder ?? staff[0] ?? null,
                createdAt: invoiceAt,
              },
              { client: trx }
            )
          })
          invoices++
        }
      }
    }

    // ── Expenses ─────────────────────────────────────────────────────
    const expenseCategories = await ExpenseCategory.all()
    const categories = new Map(expenseCategories.map((category) => [category.slug, category.id]))
    const owner = staff[0] ?? null
    let expenses = 0
    const expense = async (
      slug: string,
      description: string,
      ghs: number,
      paidAt: DateTime,
      carId: string | null = null,
      vendor: string | null = null,
      status: 'approved' | 'submitted' | 'rejected' = 'approved'
    ) => {
      expenses++
      await Expense.create({
        branchId: branch.id,
        categoryId: categories.get(slug)!,
        carId,
        description,
        vendor,
        amount: ghs * 100,
        paidVia: pick(['cash', 'momo', 'bank_transfer'] as const),
        paidAt,
        reference: chance(0.7) ? `R${between(10000, 99999)}` : null,
        status,
        rejectReason: status === 'rejected' ? 'No receipt attached' : null,
        submittedBy: pick(staff),
        approvedBy: status === 'submitted' ? null : owner,
        approvedAt: status === 'submitted' ? null : paidAt.plus({ hours: 4 }),
        createdAt: paidAt,
      })
    }
    const day = (offset: number) =>
      DateTime.min(start.plus({ days: offset }).set({ hour: between(9, 17) }), now)

    for (const car of cars) {
      for (let week = 0; week < DAYS / 7; week++) {
        await expense(
          'car_wash',
          'Weekly wash',
          between(40, 80),
          day(week * 7 + between(0, 6)),
          car.id,
          'Sparkle Car Wash'
        )
        for (let fill = 0; fill < 2; fill++) {
          await expense(
            'fuel',
            'Fuel top-up',
            between(250, 600),
            day(week * 7 + between(0, 6)),
            car.id,
            pick(['GOIL', 'Shell', 'TotalEnergies', 'Star Oil'])
          )
        }
      }
    }
    for (const car of cars.filter(() => chance(0.5))) {
      await expense(
        'servicing',
        'Scheduled service: oil, filters',
        between(900, 2200),
        day(between(0, DAYS - 1)),
        car.id,
        'Toyota Ghana'
      )
    }
    for (const car of cars.filter(() => chance(0.3))) {
      await expense(
        'repairs',
        pick(['Brake pads', 'Replace side mirror', 'AC regas', 'Suspension bushes']),
        between(400, 2500),
        day(between(0, DAYS - 1)),
        car.id,
        'Abossey Okai Spares'
      )
    }
    for (const car of cars.filter(() => chance(0.2))) {
      await expense(
        'tyres',
        'Two tyres replaced',
        between(1600, 3200),
        day(between(0, DAYS - 1)),
        car.id,
        'Tyre Masters'
      )
    }
    for (const car of cars.slice(0, 3)) {
      await expense(
        'licensing',
        'Roadworthy renewal',
        between(250, 400),
        day(between(0, DAYS - 1)),
        car.id,
        'DVLA'
      )
    }
    for (let week = 0; week < DAYS / 7; week++) {
      await expense(
        'driver_allowances',
        'Driver allowances (week)',
        between(600, 1200),
        day(week * 7 + 6)
      )
      await expense(
        'other',
        pick(['Office supplies', 'Water and snacks for customers', 'Printing']),
        between(80, 300),
        day(week * 7 + between(0, 6))
      )
    }
    await expense('salaries', 'Staff salaries', 18000, day(Math.min(DAYS - 1, 25)))
    await expense('rent', 'Office and yard rent', 6500, day(1))
    await expense('utilities', 'Electricity and water', between(900, 1400), day(10), null, 'ECG')
    await expense('utilities', 'Internet', 650, day(5), null, 'MTN Business')
    await expense('marketing', 'Facebook and Instagram ads', between(800, 1500), day(3))
    await expense('marketing', 'Google ads', between(500, 900), day(17))
    await expense(
      'insurance',
      'Fleet insurance instalment',
      7200,
      day(15),
      null,
      'Enterprise Insurance'
    )
    // Waiting for approval, and one turned down
    await expense(
      'fuel',
      'Fuel for airport run',
      420,
      now.minus({ hours: 5 }),
      cars[0].id,
      'Shell',
      'submitted'
    )
    await expense(
      'repairs',
      'Wiper blades',
      180,
      now.minus({ hours: 20 }),
      cars[4].id,
      null,
      'submitted'
    )
    await expense('other', 'Team lunch', 650, now.minus({ days: 2 }), null, null, 'submitted')
    await expense(
      'car_wash',
      'Interior detailing',
      350,
      now.minus({ days: 6 }),
      cars[10].id,
      null,
      'rejected'
    )

    const total = Object.values(counts).reduce((sum, value) => sum + value, 0)
    this.logger.success(
      `Added ${cars.length} cars, ${DRIVERS.length} drivers, ${customers.length} customers, ${total} bookings (${chauffeured} with a driver), ${invoices} invoices and ${expenses} expenses`
    )
    this.logger.log(
      `  ${Object.entries(counts)
        .map(([status, count]) => `${status}: ${count}`)
        .join(', ')}`
    )
    this.logger.log(`  Reports: ${start.toISODate()} to ${now.toISODate()}`)
  }

  /** Where a booking would be by now, with some lost along the way. */
  private statusFor(pickupAt: DateTime, returnAt: DateTime, createdAt: DateTime, now: DateTime) {
    const roll = Math.random()
    if (roll < 0.06) return 'cancelled'
    if (roll < 0.09 && createdAt.plus({ hours: 24 }) < now) return 'expired'
    if (roll < 0.12 && pickupAt < now) return 'no_show'
    if (pickupAt > now)
      return roll < 0.2 && createdAt.plus({ hours: 24 }) > now ? 'pending' : 'confirmed'
    if (returnAt > now) return 'on_rent'
    return roll < 0.2 && returnAt > now.minus({ days: 5 }) ? 'returned' : 'closed'
  }
}
