import { DateTime } from 'luxon'
import Car from '#models/car'
import type Category from '#models/category'
import ClosureDate from '#models/closure_date'
import DeliveryZone from '#models/delivery_zone'
import Extra from '#models/extra'
import Fee from '#models/fee'
import OpeningHour from '#models/opening_hour'
import ProtectionPlan from '#models/protection_plan'
import RatePlan, { type DriveType } from '#models/rate_plan'
import type { ChargeType } from '#models/tax'
import AvailabilityService from '#services/availability_service'
import PricingRuleService from '#services/pricing/pricing_rule_service'
import TaxService, { type TaxLine } from '#services/pricing/tax_service'
import SettingsService from '#services/settings/settings_service'
import { currentBusiness, memo, PRICING_TTL } from '#services/memo'

export type QuoteInput = {
  carId: string
  /** The car already loaded with its category (a search passes the cars it found) */
  car?: Car
  /** The caller has just checked the car is free for these dates (a search) */
  knownAvailable?: boolean
  pickupAt: DateTime
  returnAt: DateTime
  driveType: DriveType
  /** Chauffeur only: the trip leaves town (uses the out-of-town day price) */
  outOfTown?: boolean
  /** Chauffeur only: nights the driver stays away (overnight allowance) */
  driverNightsAway?: number
  extras?: { extraId: string; quantity: number }[]
  /** undefined = the default plan; null = no plan */
  protectionPlanId?: string | null
  deliveryZoneId?: string | null
  collectionZoneId?: string | null
  /** Off the rental (pesewas), taxed like rental. Limits are the booking's job. */
  discountAmount?: number
  /** Re-pricing an existing booking: its own hold isn't a clash */
  excludeBookingId?: string
  /**
   * Pricing an extension (old return -> new return): the start isn't a
   * handover, so no pickup fees, lead time or minimum length apply.
   */
  extension?: boolean
}

export type QuoteDay = {
  date: string
  base: number
  adjustments: { name: string; change: number }[]
  amount: number
}

export type QuoteLine = {
  type:
    | 'rental'
    | 'driver_allowance'
    | 'extra'
    | 'protection'
    | 'delivery'
    | 'collection'
    | 'after_hours'
    | 'discount'
  label: string
  quantity: number
  unitAmount: number
  amount: number
  taxable: boolean
}

export type QuoteWarning = { code: string; message: string }

export type Quote = {
  car: { id: string; name: string; registrationNo: string; category: { id: string; name: string } }
  pickupAt: string
  returnAt: string
  rentalDays: number
  driveType: DriveType
  tier: 'daily' | 'weekly' | 'monthly' | 'out_of_town'
  days: QuoteDay[]
  lines: QuoteLine[]
  subtotal: number
  taxes: TaxLine[]
  taxTotal: number
  total: number
  deposit: number
  reservationFee: number | null
  protection: { id: string; name: string; excessAmount: number } | null
  mileage: { unlimited: boolean; includedKm: number | null; excessKmAmount: number | null }
  chauffeur: {
    fuelIncluded: boolean
    driverHoursPerDay: number | null
    overtimeHourAmount: number | null
  } | null
  displayTaxInclusive: boolean
  vatRegistered: boolean
  warnings: QuoteWarning[]
}

/** A reason the quote can't be produced at all (422, with the field to fix). */
export class QuoteError extends Error {
  constructor(
    public field: string,
    message: string
  ) {
    super(message)
  }
}

/**
 * The single price calculation (M2.11) - staff quotes now; bookings,
 * changes, check-in and the public site later. Order: rate per day ->
 * price rules -> driver / extras / protection / delivery -> taxes -> total.
 * Deposit is never taxed and never part of the total.
 */
export class PricingService {
  static async quote(input: QuoteInput): Promise<Quote> {
    const warnings: QuoteWarning[] = []

    // ── The car ──────────────────────────────────────────────────────
    const car =
      input.car?.id === input.carId && input.car.category
        ? input.car
        : await Car.query().where('id', input.carId).preload('category').first()
    if (!car) throw new QuoteError('carId', 'That car was not found.')
    if (car.archivedAt)
      throw new QuoteError('carId', 'This car is archived and can no longer be booked.')
    if (car.status !== 'active') {
      throw new QuoteError(
        'carId',
        `This car is ${car.status.replaceAll('_', ' ')} - change its status before quoting it.`
      )
    }
    const category = car.category as Category

    if (input.driveType === 'self_drive' && !category.selfDriveAllowed) {
      throw new QuoteError(
        'driveType',
        `${category.name} is chauffeur-only - choose "with driver".`
      )
    }

    // ── Rental length ────────────────────────────────────────────────
    const business = await currentBusiness()
    const zone = business?.timezone || 'Africa/Accra'
    const pickupAt = input.pickupAt.setZone(zone)
    const returnAt = input.returnAt.setZone(zone)
    if (returnAt <= pickupAt) throw new QuoteError('returnAt', 'Return must be after pickup.')

    const grace = await SettingsService.get('booking.return_grace_minutes')
    const minutes = returnAt.diff(pickupAt, 'minutes').minutes
    const rentalDays = Math.max(1, Math.ceil((minutes - grace) / 1440))

    const [minDays, maxDays, leadHours] = await Promise.all([
      SettingsService.get('booking.min_rental_days'),
      SettingsService.get('booking.max_rental_days'),
      SettingsService.get('booking.min_lead_hours'),
    ])
    if (rentalDays < minDays && !input.extension) {
      warnings.push({ code: 'min_rental_days', message: `The minimum rental is ${minDays} days.` })
    }
    if (rentalDays > maxDays) {
      warnings.push({
        code: 'max_rental_days',
        message: `The longest single rental is ${maxDays} days - split it into more bookings.`,
      })
    }
    if (!input.extension && pickupAt < DateTime.now().plus({ hours: leadHours })) {
      warnings.push({
        code: 'lead_time',
        message:
          pickupAt < DateTime.now()
            ? 'The pickup time is in the past.'
            : `Pickups need at least ${leadHours} hours' notice.`,
      })
    }
    if (
      !input.knownAvailable &&
      !(await AvailabilityService.isCarAvailable(
        car.id,
        pickupAt,
        returnAt,
        input.excludeBookingId
      ))
    ) {
      warnings.push({
        code: 'unavailable',
        message: 'This car is already booked or blocked for some of these dates.',
      })
    }

    // ── Rate per day ─────────────────────────────────────────────────
    // The category's plans (shared by every car in a search), then this car's
    const categoryPlans = await memo(
      `pricing:plans:${category.id}:${input.driveType}`,
      PRICING_TTL,
      () =>
        RatePlan.query()
          .where('category_id', category.id)
          .where('drive_type', input.driveType)
          .where('active', true)
    )
    const plans = categoryPlans.filter((plan) => plan.carId === null || plan.carId === car.id)
    const [weeklyFrom, monthlyFrom] = await Promise.all([
      SettingsService.get('pricing.weekly_threshold_days'),
      SettingsService.get('pricing.monthly_threshold_days'),
    ])
    const rules = await PricingRuleService.activeRules()
    const target = { categoryId: category.id, carId: car.id }

    const outOfTown = input.driveType === 'chauffeur' && !!input.outOfTown
    let tier: Quote['tier'] = 'daily'
    const days: QuoteDay[] = []
    const missing: string[] = []
    let firstPlan: RatePlan | null = null

    for (let index = 0; index < rentalDays; index++) {
      const day = pickupAt.startOf('day').plus({ days: index })
      const plan = this.planOn(plans, car.id, day)
      if (!plan) {
        missing.push(day.toFormat('d LLL yyyy'))
        continue
      }
      firstPlan ??= plan

      let base = plan.dailyAmount
      if (outOfTown && plan.outOfTownDailyAmount !== null) {
        base = plan.outOfTownDailyAmount
        tier = 'out_of_town'
      } else if (rentalDays >= monthlyFrom && plan.monthlyAmount !== null) {
        base = Math.round(plan.monthlyAmount / 30)
        tier = 'monthly'
      } else if (rentalDays >= weeklyFrom && plan.weeklyAmount !== null) {
        base = Math.round(plan.weeklyAmount / 7)
        tier = 'weekly'
      }

      const adjusted = PricingRuleService.adjustDay(base, day, rules, target)
      for (const rule of adjusted.applied) {
        if (rule.minRentalDays && rentalDays < rule.minRentalDays) {
          const code = `rule_min_days:${rule.id}`
          if (!warnings.some((warning) => warning.code === code)) {
            warnings.push({
              code,
              message: `${rule.name} needs at least ${rule.minRentalDays} days.`,
            })
          }
        }
      }
      days.push({
        date: day.toISODate()!,
        base,
        adjustments: adjusted.applied.map((rule) => ({ name: rule.name, change: rule.change })),
        amount: adjusted.amount,
      })
    }

    if (missing.length) {
      const drive = input.driveType === 'chauffeur' ? 'with-driver' : 'self-drive'
      throw new QuoteError(
        'carId',
        `There is no ${drive} rate for ${category.name} on ${missing.slice(0, 3).join(', ')}${
          missing.length > 3 ? ` and ${missing.length - 3} more days` : ''
        }. Add one under Pricing > Rates.`
      )
    }
    const plan = firstPlan!

    // ── Charge lines ─────────────────────────────────────────────────
    const lines: QuoteLine[] = []
    const rentalTotal = days.reduce((sum, day) => sum + day.amount, 0)
    lines.push({
      type: 'rental',
      label: `Rental (${rentalDays} ${rentalDays === 1 ? 'day' : 'days'})`,
      quantity: rentalDays,
      unitAmount: Math.round(rentalTotal / rentalDays),
      amount: rentalTotal,
      taxable: true,
    })

    if (input.discountAmount) {
      if (input.discountAmount < 0 || input.discountAmount > rentalTotal) {
        throw new QuoteError('discountAmount', 'The discount can’t be more than the rental.')
      }
      lines.push({
        type: 'discount',
        label: 'Discount',
        quantity: 1,
        unitAmount: -input.discountAmount,
        amount: -input.discountAmount,
        taxable: true,
      })
    }

    if (input.driveType === 'chauffeur' && (input.driverNightsAway ?? 0) > 0) {
      const nights = input.driverNightsAway!
      if (plan.driverOvernightAmount === null) {
        warnings.push({
          code: 'no_overnight_allowance',
          message: 'This rate has no driver overnight allowance set - nights away are not charged.',
        })
      } else {
        lines.push({
          type: 'driver_allowance',
          label: `Driver overnight allowance (${nights} ${nights === 1 ? 'night' : 'nights'})`,
          quantity: nights,
          unitAmount: plan.driverOvernightAmount,
          amount: plan.driverOvernightAmount * nights,
          taxable: true,
        })
      }
    }

    for (const chosen of input.extras ?? []) {
      if (chosen.quantity <= 0) continue
      const extra = await Extra.find(chosen.extraId)
      if (!extra || !extra.active) {
        throw new QuoteError('extras', 'One of the extras is not available any more.')
      }
      if (chosen.quantity > extra.maxQuantity) {
        throw new QuoteError('extras', `At most ${extra.maxQuantity} × ${extra.name} per booking.`)
      }
      const perDay = extra.chargeType === 'per_day'
      lines.push({
        type: 'extra',
        label: `${extra.name}${chosen.quantity > 1 ? ` × ${chosen.quantity}` : ''}${
          perDay ? ` (${rentalDays} ${rentalDays === 1 ? 'day' : 'days'})` : ''
        }`,
        quantity: chosen.quantity * (perDay ? rentalDays : 1),
        unitAmount: extra.amount,
        amount: extra.amount * chosen.quantity * (perDay ? rentalDays : 1),
        taxable: Boolean(extra.taxable),
      })
    }

    let protection: ProtectionPlan | null = null
    if (input.protectionPlanId === undefined) {
      protection = await memo('pricing:default-protection', PRICING_TTL, () =>
        ProtectionPlan.query().where('is_default', true).where('active', true).first()
      )
    } else if (input.protectionPlanId !== null) {
      protection = await ProtectionPlan.find(input.protectionPlanId)
      if (!protection || !protection.active) {
        throw new QuoteError('protectionPlanId', 'That protection plan is not available.')
      }
    }
    if (protection) {
      lines.push({
        type: 'protection',
        label: `${protection.name} (${rentalDays} ${rentalDays === 1 ? 'day' : 'days'})`,
        quantity: rentalDays,
        unitAmount: protection.perDayAmount,
        amount: protection.perDayAmount * rentalDays,
        taxable: Boolean(protection.taxable),
      })
    }

    // ── Handovers: delivery / collection / after hours ───────────────
    const hours = await memo(`pricing:hours:${car.branchId}`, PRICING_TTL, () =>
      OpeningHour.query().where('branch_id', car.branchId)
    )
    const closures = await memo(
      `pricing:closures:${car.branchId}:${pickupAt.toISODate()}:${returnAt.toISODate()}`,
      PRICING_TTL,
      () =>
        ClosureDate.query()
          .where('branch_id', car.branchId)
          .whereBetween('date', [pickupAt.toISODate()!, returnAt.toISODate()!])
    )
    const officeAfterHoursFee = await SettingsService.get('booking.after_hours_fee')

    const handover = async (
      kind: 'pickup' | 'return',
      at: DateTime,
      zoneId: string | null | undefined
    ) => {
      const outside = this.outsideHours(at, hours, closures)
      const verb = kind === 'pickup' ? 'Pickup' : 'Return'
      if (zoneId) {
        const deliveryZone = await DeliveryZone.find(zoneId)
        if (!deliveryZone || !deliveryZone.active) {
          throw new QuoteError(
            kind === 'pickup' ? 'deliveryZoneId' : 'collectionZoneId',
            'That delivery zone is not available.'
          )
        }
        const amount =
          kind === 'pickup' ? deliveryZone.deliveryAmount : deliveryZone.collectionAmount
        lines.push({
          type: kind === 'pickup' ? 'delivery' : 'collection',
          label: `${kind === 'pickup' ? 'Delivery to' : 'Collection from'} ${deliveryZone.name}`,
          quantity: 1,
          unitAmount: amount,
          amount,
          taxable: true,
        })
        if (outside && deliveryZone.afterHoursAmount > 0) {
          lines.push({
            type: 'after_hours',
            label: `After-hours ${kind === 'pickup' ? 'delivery' : 'collection'}`,
            quantity: 1,
            unitAmount: deliveryZone.afterHoursAmount,
            amount: deliveryZone.afterHoursAmount,
            taxable: true,
          })
        }
      } else if (outside) {
        if (officeAfterHoursFee > 0) {
          lines.push({
            type: 'after_hours',
            label: `After-hours ${kind} at the office`,
            quantity: 1,
            unitAmount: officeAfterHoursFee,
            amount: officeAfterHoursFee,
            taxable: true,
          })
        } else {
          warnings.push({
            code: `${kind}_after_hours`,
            message: `${verb} is outside opening hours and after-hours handovers are not offered.`,
          })
        }
      }
      if (outside === 'closed_day') {
        warnings.push({
          code: `${kind}_closure`,
          message: `${verb} falls on a day the office is closed.`,
        })
      }
    }
    if (!input.extension) await handover('pickup', pickupAt, input.deliveryZoneId)
    await handover('return', returnAt, input.collectionZoneId)

    // ── Taxes and totals ─────────────────────────────────────────────
    const chargeTypeOf: Record<QuoteLine['type'], ChargeType> = {
      rental: 'rental',
      driver_allowance: 'rental',
      extra: 'extras',
      protection: 'protection',
      delivery: 'delivery',
      collection: 'delivery',
      after_hours: 'fees',
      discount: 'rental',
    }
    // Rental is taxed per day (each day is a line on the invoice), the rest per line
    const taxableLines = [
      ...days.map((day) => ({ chargeType: 'rental' as const, amount: day.amount, taxable: true })),
      ...lines
        .filter((line) => line.type !== 'rental')
        .map((line) => ({
          chargeType: chargeTypeOf[line.type],
          amount: line.amount,
          taxable: line.taxable,
        })),
    ]
    const vatRegistered = await TaxService.isVatRegistered()
    const tax = await TaxService.forLines(taxableLines, pickupAt)
    const subtotal = lines.reduce((sum, line) => sum + line.amount, 0)
    const total = subtotal + tax.total

    const deposit = protection?.depositAmountOverride ?? category.defaultDepositAmount
    let reservationFee: number | null = null
    if (await SettingsService.get('payment.allow_pay_at_pickup')) {
      reservationFee =
        (await SettingsService.get('payment.reservation_fee_type')) === 'fixed'
          ? Math.min(total, await SettingsService.get('payment.reservation_fee_amount'))
          : Math.round(
              (total * (await SettingsService.get('payment.reservation_fee_percent'))) / 100
            )
    }

    // ── Mileage terms ────────────────────────────────────────────────
    let mileage: Quote['mileage']
    if (plan.mileageMode === 'unlimited') {
      mileage = { unlimited: true, includedKm: null, excessKmAmount: null }
    } else if (plan.mileageMode === 'limited') {
      mileage = {
        unlimited: false,
        includedKm: plan.includedKmPerDay! * rentalDays,
        excessKmAmount: plan.excessKmAmount,
      }
    } else if ((await SettingsService.get('rental.mileage_policy')) === 'unlimited') {
      mileage = { unlimited: true, includedKm: null, excessKmAmount: null }
    } else {
      const excessFee = await memo('pricing:excess-km-fee', PRICING_TTL, () =>
        Fee.query().where('code', 'excess_km').where('active', true).first()
      )
      mileage = {
        unlimited: false,
        includedKm: (await SettingsService.get('rental.daily_km_allowance')) * rentalDays,
        excessKmAmount: excessFee?.amount ?? null,
      }
    }

    return {
      car: {
        id: car.id,
        name: `${car.make} ${car.model} ${car.year}`,
        registrationNo: car.registrationNo,
        category: { id: category.id, name: category.name },
      },
      pickupAt: pickupAt.toISO()!,
      returnAt: returnAt.toISO()!,
      rentalDays,
      driveType: input.driveType,
      tier,
      days,
      lines,
      subtotal,
      taxes: tax.lines,
      taxTotal: tax.total,
      total,
      deposit,
      reservationFee,
      protection: protection
        ? { id: protection.id, name: protection.name, excessAmount: protection.excessAmount }
        : null,
      mileage,
      chauffeur:
        input.driveType === 'chauffeur'
          ? {
              fuelIncluded: Boolean(plan.fuelIncluded),
              driverHoursPerDay: plan.driverHoursPerDay,
              overtimeHourAmount: plan.driverOvertimeHourAmount,
            }
          : null,
      displayTaxInclusive: await SettingsService.get('pricing.display_tax_inclusive'),
      vatRegistered,
      warnings,
    }
  }

  /** The car's own plan for the day if any, else the category plan. */
  static planOn(plans: RatePlan[], carId: string, day: DateTime): RatePlan | null {
    const date = day.toISODate()!
    const covering = plans.filter(
      (plan) =>
        (!plan.effectiveFrom || plan.effectiveFrom.toISODate()! <= date) &&
        (!plan.effectiveTo || plan.effectiveTo.toISODate()! >= date)
    )
    return (
      covering.find((plan) => plan.carId === carId) ??
      covering.find((plan) => plan.carId === null) ??
      null
    )
  }

  /**
   * Whether a handover time is outside opening hours: false, 'outside_hours',
   * or 'closed_day' (a closed weekday or a closure date). No hours set = open.
   */
  static outsideHours(
    at: DateTime,
    hours: OpeningHour[],
    closures: ClosureDate[]
  ): false | 'outside_hours' | 'closed_day' {
    const date = at.toISODate()!
    if (closures.some((closure) => closure.date.toISODate() === date)) return 'closed_day'
    // Opening hours use 0 = Sunday ... 6 = Saturday; Luxon weekday is 1 = Monday ... 7 = Sunday
    const today = hours.find((row) => row.weekday === at.weekday % 7)
    if (!today) return false
    if (today.isClosed || !today.opensAt || !today.closesAt) return 'closed_day'
    const time = at.toFormat('HH:mm')
    return time < today.opensAt.slice(0, 5) || time > today.closesAt.slice(0, 5)
      ? 'outside_hours'
      : false
  }
}

export default PricingService
