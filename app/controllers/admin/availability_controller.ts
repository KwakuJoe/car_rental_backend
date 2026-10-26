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
    const cars = await AvailabilityService.getAvailableCars(from, to.plus({ minutes: buffer }), {
      categoryId: payload.categoryId,
    })
    const term = payload.search?.toLowerCase()

    const data = cars
      .filter((car) => payload.driveType !== 'self_drive' || car.category.selfDriveAllowed)
      .filter(
        (car) =>
          !term || `${car.make} ${car.model} ${car.registrationNo}`.toLowerCase().includes(term)
      )
      .map((car) => {
        const photos = car.photos ?? []
        const cover = photos.find((photo) => photo.isCover) ?? photos[0]
        return {
          id: car.id,
          name: `${car.make} ${car.model} ${car.year}`,
          registrationNo: car.registrationNo,
          transmission: car.transmission,
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
      .sort(
        (a, b) => a.category.name.localeCompare(b.category.name) || a.name.localeCompare(b.name)
      )

    return response.ok({ message: 'Available cars', data })
  }
}
