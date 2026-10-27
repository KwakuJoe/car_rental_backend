import type { HttpContext } from '@adonisjs/core/http'
import Booking from '#models/booking'
import BookingCharge from '#models/booking_charge'
import Car from '#models/car'
import CarDamage from '#models/car_damage'
import type Inspection from '#models/inspection'
import TermsVersion from '#models/terms_version'
import type User from '#models/user'
import { BookingError } from '#services/bookings/booking_service'
import CheckInService from '#services/handover/check_in_service'
import CheckOutService from '#services/handover/check_out_service'
import SettingsService from '#services/settings/settings_service'
import { damageToJson, inspectionToJson } from '#transformers/inspection_transformer'
import {
  completeCheckInValidator,
  completeCheckOutValidator,
  damageValidator,
  saveInspectionValidator,
} from '#validators/handover'

type Kind = 'check-out' | 'check-in'

const fail = (response: HttpContext['response'], error: BookingError) => {
  const body = {
    message: error.message,
    code: error.code,
    errors: [{ field: error.field, rule: 'handover', message: error.message }],
  }
  return error.status === 409 ? response.conflict(body) : response.unprocessableEntity(body)
}

/** Check-out (M4.1/M4.2) and check-in (M4.3): the same screen shape for both. */
export default class HandoverController {
  private kind(ctx: HttpContext): Kind {
    return ctx.request.url().includes('/check-in') ? 'check-in' : 'check-out'
  }

  private draft(kind: Kind, booking: Booking, user: User) {
    return kind === 'check-out'
      ? CheckOutService.draft(booking, user)
      : CheckInService.draft(booking, user)
  }

  /** Everything the screen needs, in one request. */
  private async screen(kind: Kind, booking: Booking, inspection: Inspection) {
    await inspection.load('photos', (photos) => photos.preload('file').orderBy('created_at', 'asc'))
    const [car, damages, requirePhotos] = await Promise.all([
      Car.findOrFail(booking.carId),
      CarDamage.query()
        .where('car_id', booking.carId)
        .whereNull('repaired_at')
        .preload('photo')
        .orderBy('created_at', 'asc'),
      SettingsService.get('handover.require_photos'),
    ])
    const requirements =
      kind === 'check-out'
        ? await CheckOutService.requirements(booking, inspection)
        : await CheckInService.requirements(booking, inspection)
    const base = {
      inspection: inspectionToJson(inspection),
      requirements,
      ready: requirements.every((requirement) => requirement.ok),
      damages: damages.map((damage) => damageToJson(damage, inspection.id)),
      car: { id: car.id, currentOdometerKm: car.currentOdometerKm },
      requirePhotos,
    }
    if (kind === 'check-out') {
      const terms = await TermsVersion.current()
      return {
        ...base,
        terms: terms ? { id: terms.id, version: terms.version, body: terms.body } : null,
      }
    }
    const charges = await BookingCharge.query()
      .where('booking_id', booking.id)
      .orderBy('created_at', 'asc')
    return {
      ...base,
      comparison:
        inspection.status === 'draft' ? await CheckInService.compare(booking, inspection) : null,
      charges: charges.map((charge) => ({
        id: charge.id,
        code: charge.code,
        label: charge.label,
        quantity: Number(charge.quantity),
        unitAmount: charge.unitAmount,
        amount: charge.amount,
        status: charge.status,
        waiveReason: charge.waiveReason,
      })),
    }
  }

  private async run(
    ctx: HttpContext,
    action: (booking: Booking, inspection: Inspection, user: User) => Promise<unknown>
  ) {
    const { auth, params, response } = ctx
    const kind = this.kind(ctx)
    const booking = await Booking.findOrFail(params.id)
    try {
      const user = auth.getUserOrFail()
      const inspection = await this.draft(kind, booking, user)
      await action(booking, inspection, user)
      await booking.refresh()
      await inspection.refresh()
      return response.ok({ message: 'OK', data: await this.screen(kind, booking, inspection) })
    } catch (error) {
      if (error instanceof BookingError) return fail(response, error)
      throw error
    }
  }

  async show(ctx: HttpContext) {
    return this.run(ctx, async () => {})
  }

  async save(ctx: HttpContext) {
    const payload = await ctx.request.validateUsing(saveInspectionValidator)
    return this.run(ctx, (_booking, inspection, user) =>
      CheckOutService.save(
        inspection,
        {
          ...payload,
          checklist: payload.checklist?.map((item) => ({ ...item, note: item.note ?? null })),
        },
        user
      )
    )
  }

  async addDamage(ctx: HttpContext) {
    const payload = await ctx.request.validateUsing(damageValidator)
    return this.run(ctx, (_booking, inspection, user) =>
      CheckOutService.addDamage(inspection, payload, user)
    )
  }

  async removeDamage(ctx: HttpContext) {
    return this.run(ctx, (_booking, inspection) =>
      CheckOutService.removeDamage(inspection, ctx.params.damageId)
    )
  }

  async completeCheckOut(ctx: HttpContext) {
    const payload = await ctx.request.validateUsing(completeCheckOutValidator)
    return this.run(ctx, (booking, inspection, user) =>
      CheckOutService.complete(ctx, booking, inspection, payload, user)
    )
  }

  async completeCheckIn(ctx: HttpContext) {
    const payload = await ctx.request.validateUsing(completeCheckInValidator)
    return this.run(ctx, (booking, inspection, user) =>
      CheckInService.complete(ctx, booking, inspection, payload, user)
    )
  }
}
