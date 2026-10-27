import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import type Booking from '#models/booking'
import BookingCharge, { type ChargeCode } from '#models/booking_charge'
import Car from '#models/car'
import CarAllocation from '#models/car_allocation'
import CarDamage from '#models/car_damage'
import DriverAllocation from '#models/driver_allocation'
import Fee from '#models/fee'
import Inspection from '#models/inspection'
import OdometerLog from '#models/odometer_log'
import type User from '#models/user'
import AuditService from '#services/audit_service'
import { BookingError } from '#services/bookings/booking_service'
import type { Requirement } from '#services/handover/check_out_service'
import TaxService from '#services/pricing/tax_service'
import PaymentService from '#services/payments/payment_service'
import SettingsService from '#services/settings/settings_service'
import { userCan } from '#helpers/permissions'

/** A charge the system proposes; staff accept, edit or waive it. */
export type ProposedCharge = {
  code: ChargeCode
  label: string
  quantity: number
  unitAmount: number
  amount: number
  taxable: boolean
  /** Why it's proposed (shown under the line) */
  basis: string
  /** Damage: staff enter the amount (capped at the plan's excess) */
  needsAmount: boolean
}

export type Comparison = {
  checkOut: { odometerKm: number | null; fuelLevel: number | null; at: string | null }
  checkIn: { odometerKm: number | null; fuelLevel: number | null; at: string }
  kmDriven: number | null
  includedKm: number | null
  lateMinutes: number
  proposed: ProposedCharge[]
  /** Customer pays at most this for damage (protection plan excess), null = no plan: no cap */
  damageCap: number | null
}

export type FinalCharge = {
  code: ChargeCode
  label: string
  quantity: number
  unitAmount: number
  amount: number
  taxable: boolean
  waived: boolean
  waiveReason?: string | null
}

/**
 * Check-in (M4.3): the same inspection as check-out, then a comparison with
 * it that proposes charges from the fee schedule. Staff accept, edit or
 * waive each line; the accepted ones are added to the booking. The booking
 * becomes "returned" and the car is free again after its cleaning time.
 */
export default class CheckInService {
  static async draft(booking: Booking, user: User) {
    const existing = await Inspection.query()
      .where('booking_id', booking.id)
      .where('type', 'check_in')
      .first()
    if (existing) return existing
    if (booking.status !== 'on_rent') {
      throw new BookingError('status', 'Only a car that is out on rent can be checked in.')
    }
    // Start from what went out: same checklist, all assumed back
    const out = await this.checkOut(booking)
    const created = await Inspection.create({
      bookingId: booking.id,
      carId: booking.carId,
      type: 'check_in',
      status: 'draft',
      checklist: (out?.checklist ?? []).map((item) => ({
        ...item,
        result: item.result,
        note: null,
      })),
      inspectedBy: user.id,
    })
    await created.refresh()
    return created
  }

  static checkOut(booking: Booking) {
    return Inspection.query().where('booking_id', booking.id).where('type', 'check_out').first()
  }

  static async requirements(booking: Booking, inspection: Inspection): Promise<Requirement[]> {
    const out = await this.checkOut(booking)
    const minKm = out?.odometerKm ?? 0
    const rule = (code: string, label: string, ok: boolean, message: string) => ({
      code,
      label,
      ok,
      message: ok ? null : message,
    })
    return [
      rule(
        'on_rent',
        'Car out on rent',
        booking.status === 'on_rent',
        `The booking is ${booking.status.replaceAll('_', ' ')}.`
      ),
      rule(
        'odometer',
        'Odometer reading',
        inspection.odometerKm !== null && inspection.odometerKm >= minKm,
        inspection.odometerKm === null
          ? 'Enter the odometer reading.'
          : `The reading can’t be below the one at pickup (${minKm.toLocaleString()} km).`
      ),
      rule('fuel', 'Fuel level', inspection.fuelLevel !== null, 'Record the fuel level.'),
    ]
  }

  /** Compare with check-out and propose the charges (nothing is saved). */
  static async compare(
    booking: Booking,
    inspection: Inspection,
    now = DateTime.now()
  ): Promise<Comparison> {
    const out = await this.checkOut(booking)
    const car = await Car.findOrFail(booking.carId)
    const activeFees = await Fee.query().where('active', true)
    const fees = new Map(activeFees.map((fee) => [fee.code, fee]))
    const [grace, defaultTank] = await Promise.all([
      SettingsService.get('booking.return_grace_minutes'),
      SettingsService.get('handover.default_tank_litres'),
    ])
    const snapshot = booking.priceSnapshot
    const proposed: ProposedCharge[] = []
    const add = (
      charge: Omit<ProposedCharge, 'amount' | 'needsAmount'> & { needsAmount?: boolean }
    ) =>
      proposed.push({
        ...charge,
        amount: Math.round(charge.quantity * charge.unitAmount),
        needsAmount: !!charge.needsAmount,
      })
    const fee = (code: string) => fees.get(code)

    // ── Kilometres over the allowance ─────────────────────────────
    let kmDriven: number | null = null
    if (
      out?.odometerKm !== null &&
      out?.odometerKm !== undefined &&
      inspection.odometerKm !== null
    ) {
      kmDriven = inspection.odometerKm - out.odometerKm
    }
    const includedKm = snapshot.mileage.unlimited ? null : snapshot.mileage.includedKm
    if (kmDriven !== null && includedKm !== null && kmDriven > includedKm) {
      const unit = snapshot.mileage.excessKmAmount ?? fee('excess_km')?.amount ?? 0
      add({
        code: 'excess_km',
        label: 'Kilometres over the allowance',
        quantity: kmDriven - includedKm,
        unitAmount: unit,
        taxable: true,
        basis: `${kmDriven.toLocaleString()} km driven, ${includedKm.toLocaleString()} km included`,
      })
    }

    // ── Fuel ──────────────────────────────────────────────────────
    if (out?.fuelLevel !== null && out?.fuelLevel !== undefined && inspection.fuelLevel !== null) {
      const shortEighths = out.fuelLevel - inspection.fuelLevel
      if (shortEighths > 0) {
        const tank = car.fuelCapacityL ? Number(car.fuelCapacityL) : defaultTank
        const litres = Math.ceil((shortEighths / 8) * tank)
        add({
          code: 'fuel',
          label: `Fuel (${litres} litres)`,
          quantity: litres,
          unitAmount: fee('fuel_per_litre')?.amount ?? 0,
          taxable: fee('fuel_per_litre')?.taxable ?? true,
          basis: `Out at ${out.fuelLevel}/8, back at ${inspection.fuelLevel}/8 of a ${tank} L tank`,
        })
        const service = fee('refuel_service')
        if (service) {
          add({
            code: 'refuel_service',
            label: service.name,
            quantity: 1,
            unitAmount: service.amount,
            taxable: service.taxable,
            basis: 'We refuel the car',
          })
        }
      }
    }

    // ── Late return: hourly up to a day's rate, then whole days ───
    const lateMinutes = Math.max(
      0,
      Math.floor(now.diff(booking.returnAt.plus({ minutes: grace }), 'minutes').minutes)
    )
    if (lateMinutes > 0) {
      const rental = snapshot.lines.find((line) => line.type === 'rental')?.amount ?? 0
      const dayRate = Math.round(rental / Math.max(1, snapshot.rentalDays))
      const hourly = fee('late_return_hour')?.amount ?? 0
      const hours = Math.ceil(lateMinutes / 60)
      if (hourly > 0 && hours * hourly < dayRate) {
        add({
          code: 'late_hours',
          label: `Late return (${hours} ${hours === 1 ? 'hour' : 'hours'})`,
          quantity: hours,
          unitAmount: hourly,
          taxable: true,
          basis: `Back ${hours} h after the return time and grace period`,
        })
      } else {
        const days = Math.ceil(lateMinutes / 1440)
        add({
          code: 'late_days',
          label: `Late return (${days} ${days === 1 ? 'day' : 'days'})`,
          quantity: days,
          unitAmount: dayRate,
          taxable: true,
          basis: 'Charged as whole days at the booking’s daily price',
        })
      }
    }

    // ── New damage (marked at this check-in) ──────────────────────
    const damages = await CarDamage.query().where('reported_inspection_id', inspection.id)
    for (const damage of damages) {
      add({
        code: 'damage',
        label: `Damage: ${damage.zone.replaceAll('_', ' ')} (${damage.type.replace('_', ' ')}, ${damage.severity})`,
        quantity: 1,
        unitAmount: 0,
        taxable: false,
        basis: 'Enter the repair cost',
        needsAmount: true,
      })
    }

    // ── Items that went out but didn't come back ──────────────────
    for (const item of inspection.checklist) {
      const before = out?.checklist.find((entry) => entry.itemId === item.itemId)
      if (item.result === 'missing' && before?.result !== 'missing') {
        const known = /key/i.test(item.name)
          ? fee('lost_key')
          : /document|paper/i.test(item.name)
            ? fee('lost_document')
            : undefined
        add({
          code: 'missing_item',
          label: `Missing: ${item.name}`,
          quantity: 1,
          unitAmount: known?.amount ?? 0,
          taxable: known?.taxable ?? true,
          basis: known ? known.name : 'Enter the replacement cost',
          needsAmount: !known,
        })
      }
    }

    // ── Cleaning ──────────────────────────────────────────────────
    if (inspection.interior === 'smoking' && out?.interior !== 'smoking' && fee('smoking')) {
      const smoking = fee('smoking')!
      add({
        code: 'smoking',
        label: smoking.name,
        quantity: 1,
        unitAmount: smoking.amount,
        taxable: smoking.taxable,
        basis: 'Smoked in',
      })
    } else if (
      (inspection.interior === 'dirty' && out?.interior !== 'dirty') ||
      (inspection.exterior === 'dirty' && out?.exterior !== 'dirty')
    ) {
      const cleaning = fee('cleaning_standard')
      if (cleaning) {
        add({
          code: 'cleaning',
          label: cleaning.name,
          quantity: 1,
          unitAmount: cleaning.amount,
          taxable: cleaning.taxable,
          basis: 'Came back dirtier than it went out',
        })
      }
    }

    return {
      checkOut: {
        odometerKm: out?.odometerKm ?? null,
        fuelLevel: out?.fuelLevel ?? null,
        at: out?.completedAt?.toISO() ?? null,
      },
      checkIn: {
        odometerKm: inspection.odometerKm,
        fuelLevel: inspection.fuelLevel,
        at: now.toISO()!,
      },
      kmDriven,
      includedKm,
      lateMinutes,
      proposed,
      damageCap: snapshot.protection ? snapshot.protection.excessAmount : null,
    }
  }

  /** The car is back: charges saved, booking returned, car free after its cleaning time. */
  static async complete(
    ctx: HttpContext,
    booking: Booking,
    inspection: Inspection,
    input: { charges: FinalCharge[]; overrideReason?: string | null },
    user: User
  ) {
    if (inspection.status === 'completed')
      throw new BookingError('status', 'This car has already been checked in.')
    const requirements = await this.requirements(booking, inspection)
    const failing = requirements.find((item) => !item.ok)
    if (failing) throw new BookingError(failing.code, failing.message!)

    for (const charge of input.charges) {
      if (charge.waived && (charge.waiveReason ?? '').trim().length < 3) {
        throw new BookingError('charges', `Say why "${charge.label}" is waived.`)
      }
    }
    const canOverride = await userCan(user, 'bookings.override')
    const needsManager = (message: string) => {
      if (!canOverride || !input.overrideReason) {
        throw new BookingError(
          'overrideReason',
          `${message} ${canOverride ? 'Give an override reason.' : 'A manager has to approve it.'}`
        )
      }
    }
    const limit = await SettingsService.get('handover.waiver_limit')
    const waived = input.charges
      .filter((charge) => charge.waived)
      .reduce((sum, charge) => sum + charge.amount, 0)
    if (waived > limit) needsManager('Waivers are above the staff limit.')
    const comparison = await this.compare(booking, inspection)
    const damage = input.charges
      .filter((charge) => charge.code === 'damage' && !charge.waived)
      .reduce((sum, charge) => sum + charge.amount, 0)
    if (comparison.damageCap !== null && damage > comparison.damageCap) {
      needsManager('Damage is above the protection plan’s excess (only for negligence).')
    }

    const accepted = input.charges.filter((charge) => !charge.waived && charge.amount > 0)
    const tax = await TaxService.forLines(
      accepted.map((charge) => ({
        chargeType: 'fees' as const,
        amount: charge.amount,
        taxable: charge.taxable,
      })),
      DateTime.now()
    )
    const buffer = await SettingsService.get('booking.turnaround_buffer_minutes')
    const now = DateTime.now()

    await db.transaction(async (trx) => {
      for (const charge of input.charges) {
        if (charge.amount <= 0 && !charge.waived) continue
        await BookingCharge.create(
          {
            bookingId: booking.id,
            inspectionId: inspection.id,
            code: charge.code,
            label: charge.label,
            quantity: String(charge.quantity),
            unitAmount: charge.unitAmount,
            amount: charge.amount,
            taxable: charge.taxable,
            taxAmount: 0,
            status: charge.waived ? 'waived' : 'accepted',
            waiveReason: charge.waived ? charge.waiveReason!.trim() : null,
            createdBy: user.id,
          },
          { client: trx }
        )
      }

      inspection.useTransaction(trx)
      inspection.merge({ status: 'completed', completedAt: now, inspectedBy: user.id })
      await inspection.save()

      const car = await Car.findOrFail(booking.carId, { client: trx })
      if (inspection.odometerKm! > car.currentOdometerKm) {
        await OdometerLog.create(
          {
            carId: car.id,
            previousKm: car.currentOdometerKm,
            newKm: inspection.odometerKm!,
            source: 'check_in',
            reason: booking.reference,
            recordedBy: user.id,
          },
          { client: trx }
        )
        car.useTransaction(trx)
        car.currentOdometerKm = inspection.odometerKm!
        await car.save()
      }

      // Back early: free the car (after cleaning) and the driver from now
      if (now < booking.returnAt) {
        await CarAllocation.query({ client: trx })
          .where('booking_id', booking.id)
          .where('active', true)
          // Never before the hold's start (a range can't end before it begins)
          .update({
            ends_at: db.raw('GREATEST(starts_at, ?::timestamptz)', [now.toISO()!]),
            ends_at_with_buffer: db.raw(
              'GREATEST(starts_at, ?::timestamptz) + make_interval(mins => ?)',
              [now.toISO()!, buffer]
            ),
            updated_at: new Date(),
          })
        await DriverAllocation.query({ client: trx })
          .where('booking_id', booking.id)
          .where('active', true)
          .update({
            ends_at: db.raw('GREATEST(starts_at, ?::timestamptz)', [now.toISO()!]),
            updated_at: new Date(),
          })
      }

      const chargesTotal = accepted.reduce((sum, charge) => sum + charge.amount, 0)
      booking.useTransaction(trx)
      booking.merge({
        status: 'returned',
        actualReturnAt: now,
        subtotalAmount: booking.subtotalAmount + chargesTotal,
        taxAmount: booking.taxAmount + tax.total,
        totalAmount: booking.totalAmount + chargesTotal + tax.total,
      })
      booking.balanceAmount = booking.totalAmount - booking.paidAmount
      await booking.save()

      await AuditService.record(
        ctx,
        {
          action: 'booking.checked_in',
          subject: { type: 'booking', id: booking.id, label: booking.reference },
          before: { status: 'on_rent' },
          after: { status: 'returned' },
          metadata: {
            odometerKm: inspection.odometerKm,
            fuelLevel: inspection.fuelLevel,
            charges: chargesTotal + tax.total,
            waived,
            overrideReason: input.overrideReason ?? null,
          },
        },
        trx
      )
      // Paid in full and no deposit held: nothing left to settle
      await PaymentService.closeIfSettled(ctx, booking, trx)
    })
    return inspection
  }
}
