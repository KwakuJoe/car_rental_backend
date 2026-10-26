import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import Business from '#models/business'
import AvailabilityService from '#services/availability_service'
import SettingsService from '#services/settings/settings_service'
import { availabilityValidator } from '#validators/booking'

const fail = (response: HttpContext['response'], field: string, message: string) =>
  response.unprocessableEntity({ message, errors: [{ field, rule: 'availability', message }] })

export default class AvailabilityController {
  /**
   * Cars free for the whole period, including the turnaround time after the
   * return (M3.4). The booking itself is still checked by the exclusion
   * constraint - this list can be out of date a moment later.
   */
  async index({ request, response }: HttpContext) {
    const payload = await request.validateUsing(availabilityValidator)
    const business = await Business.query().first()
    const zone = business?.timezone || 'Africa/Accra'
    const from = payload.from
      ? DateTime.fromISO(payload.from, { zone })
      : DateTime.now().setZone(zone)
    const to = payload.to ? DateTime.fromISO(payload.to, { zone }) : from.plus({ days: 1 })
    if (!from.isValid) return fail(response, 'from', 'Enter a valid pickup date and time.')
    if (!to.isValid || to <= from) return fail(response, 'to', 'Return must be after pickup.')

    const buffer = await SettingsService.get('booking.turnaround_buffer_minutes')
    const query = AvailabilityService.getAvailableCars(from, to.plus({ minutes: buffer }), {
      categoryId: payload.categoryId,
    })
    if (payload.driveType === 'self_drive') {
      query.whereHas('category', (category) => category.where('self_drive_allowed', true))
    }
    if (payload.transmission) query.where('transmission', payload.transmission)
    if (payload.fuelType) query.where('fuel_type', payload.fuelType)
    const search = payload.search
    if (search) {
      const term = `%${search}%`
      query.where((q) =>
        q
          .whereILike('make', term)
          .orWhereILike('model', term)
          .orWhereRaw("replace(registration_no, ' ', '') ilike ?", [
            `%${search.replace(/\s+/g, '')}%`,
          ])
      )
    }
    const cars = await query
      .orderBy('make', 'asc')
      .orderBy('model', 'asc')
      .paginate(payload.page ?? 1, payload.limit ?? 12)

    const data = cars.all().map((car) => {
      const photos = car.photos ?? []
      const cover = photos.find((photo) => photo.isCover) ?? photos[0]
      return {
        id: car.id,
        name: `${car.make} ${car.model} ${car.year}`,
        registrationNo: car.registrationNo,
        transmission: car.transmission,
        fuelType: car.fuelType,
        seats: car.seats,
        colour: car.colour,
        coverUrl: cover?.file?.url ?? null,
        category: {
          id: car.category.id,
          name: car.category.name,
          selfDriveAllowed: Boolean(car.category.selfDriveAllowed),
        },
      }
    })

    return response.ok({ message: 'Available cars', data, meta: cars.getMeta() })
  }
}
