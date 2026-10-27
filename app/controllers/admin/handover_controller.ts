import type { HttpContext } from '@adonisjs/core/http'
import Booking from '#models/booking'
import Car from '#models/car'
import CarDamage from '#models/car_damage'
import type Inspection from '#models/inspection'
import TermsVersion from '#models/terms_version'
import { BookingError } from '#services/bookings/booking_service'
import CheckOutService from '#services/handover/check_out_service'
import SettingsService from '#services/settings/settings_service'
import { damageToJson, inspectionToJson } from '#transformers/inspection_transformer'
import {
  completeCheckOutValidator,
  damageValidator,
  saveInspectionValidator,
} from '#validators/handover'

const fail = (response: HttpContext['response'], error: BookingError) => {
  const body = {
    message: error.message,
    code: error.code,
    errors: [{ field: error.field, rule: 'handover', message: error.message }],
  }
  return error.status === 409 ? response.conflict(body) : response.unprocessableEntity(body)
}

/** Check-out (M4.1/M4.2). Check-in follows the same shape in slice 2. */
export default class HandoverController {
  /** Everything the check-out screen needs, in one request. */
  private async screen(booking: Booking, inspection: Inspection) {
    await inspection.load('photos', (photos) => photos.preload('file').orderBy('created_at', 'asc'))
    const [car, damages, terms, requirements, requirePhotos] = await Promise.all([
      Car.findOrFail(booking.carId),
      CarDamage.query()
        .where('car_id', booking.carId)
        .whereNull('repaired_at')
        .preload('photo')
        .orderBy('created_at', 'asc'),
      TermsVersion.current(),
      CheckOutService.requirements(booking, inspection),
      SettingsService.get('handover.require_photos'),
    ])
    return {
      inspection: inspectionToJson(inspection),
      requirements,
      ready: requirements.every((requirement) => requirement.ok),
      damages: damages.map((damage) => damageToJson(damage, inspection.id)),
      car: { id: car.id, currentOdometerKm: car.currentOdometerKm },
      terms: terms ? { id: terms.id, version: terms.version, body: terms.body } : null,
      requirePhotos,
    }
  }

  private async load(id: string) {
    return Booking.findOrFail(id)
  }

  async showCheckOut({ auth, params, response }: HttpContext) {
    const booking = await this.load(params.id)
    const inspection = await CheckOutService.draft(booking, auth.getUserOrFail())
    return response.ok({ message: 'Check-out', data: await this.screen(booking, inspection) })
  }

  async saveCheckOut({ auth, params, request, response }: HttpContext) {
    const booking = await this.load(params.id)
    const payload = await request.validateUsing(saveInspectionValidator)
    try {
      const user = auth.getUserOrFail()
      const inspection = await CheckOutService.draft(booking, user)
      await CheckOutService.save(
        inspection,
        {
          ...payload,
          checklist: payload.checklist?.map((item) => ({ ...item, note: item.note ?? null })),
        },
        user
      )
      return response.ok({ message: 'Saved', data: await this.screen(booking, inspection) })
    } catch (error) {
      if (error instanceof BookingError) return fail(response, error)
      throw error
    }
  }

  async addDamage({ auth, params, request, response }: HttpContext) {
    const booking = await this.load(params.id)
    const payload = await request.validateUsing(damageValidator)
    try {
      const user = auth.getUserOrFail()
      const inspection = await CheckOutService.draft(booking, user)
      await CheckOutService.addDamage(inspection, payload, user)
      return response.created({
        message: 'Damage marked',
        data: await this.screen(booking, inspection),
      })
    } catch (error) {
      if (error instanceof BookingError) return fail(response, error)
      throw error
    }
  }

  async removeDamage({ auth, params, response }: HttpContext) {
    const booking = await this.load(params.id)
    try {
      const inspection = await CheckOutService.draft(booking, auth.getUserOrFail())
      await CheckOutService.removeDamage(inspection, params.damageId)
      return response.ok({
        message: 'Damage removed',
        data: await this.screen(booking, inspection),
      })
    } catch (error) {
      if (error instanceof BookingError) return fail(response, error)
      throw error
    }
  }

  async completeCheckOut(ctx: HttpContext) {
    const { auth, params, request, response } = ctx
    const booking = await this.load(params.id)
    const payload = await request.validateUsing(completeCheckOutValidator)
    try {
      const user = auth.getUserOrFail()
      const inspection = await CheckOutService.draft(booking, user)
      await CheckOutService.complete(ctx, booking, inspection, payload, user)
      await booking.refresh()
      return response.ok({
        message: 'Car checked out',
        data: await this.screen(booking, inspection),
      })
    } catch (error) {
      if (error instanceof BookingError) return fail(response, error)
      throw error
    }
  }
}
