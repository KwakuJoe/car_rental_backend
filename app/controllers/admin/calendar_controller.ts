import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import Business from '#models/business'
import Car from '#models/car'
import { calendarValidator } from '#validators/booking'

const fail = (response: HttpContext['response'], field: string, message: string) =>
  response.unprocessableEntity({ message, errors: [{ field, rule: 'calendar', message }] })

export default class CalendarController {
  /**
   * The booking calendar (M3.7): one row per car with everything holding it
   * in the period - bookings, holds, blocks - including the cleaning time
   * after each return (endsAtWithBuffer). Cars are paginated; a car with
   * nothing booked still gets its (empty) row, so staff see free cars too.
   */
  async index({ request, response }: HttpContext) {
    const payload = await request.validateUsing(calendarValidator)
    const business = await Business.query().first()
    const zone = business?.timezone || 'Africa/Accra'
    const from = (
      payload.from
        ? payload.from.setZone(zone, { keepLocalTime: true })
        : DateTime.now().setZone(zone)
    ).startOf('day')
    const to = (
      payload.to ? payload.to.setZone(zone, { keepLocalTime: true }) : from.plus({ days: 13 })
    ).endOf('day')
    if (to < from) return fail(response, 'to', 'The end date must be after the start date.')
    if (to.diff(from, 'days').days > 62) {
      return fail(response, 'to', 'Show at most two months at a time.')
    }

    const query = Car.query()
      .whereNull('archived_at')
      .whereNot('status', 'retired')
      .preload('category')
      .preload('photos', (photos) => photos.preload('file').orderBy('sort_order', 'asc'))
      .preload('allocations', (allocations) =>
        allocations
          .where('active', true)
          .where('starts_at', '<', to.toSQL()!)
          .where('ends_at_with_buffer', '>', from.toSQL()!)
          .preload('booking', (booking) => booking.preload('customer'))
          .orderBy('starts_at', 'asc')
      )
    if (payload.categoryId) query.where('category_id', payload.categoryId)
    const search = payload.search
    if (search) {
      query.where((q) =>
        q
          .whereILike('make', `%${search}%`)
          .orWhereILike('model', `%${search}%`)
          .orWhereRaw("replace(registration_no, ' ', '') ilike ?", [
            `%${search.replace(/\s+/g, '')}%`,
          ])
      )
    }
    const cars = await query
      .orderBy('make', 'asc')
      .orderBy('model', 'asc')
      .orderBy('registration_no', 'asc')
      .paginate(payload.page ?? 1, payload.limit ?? 20)

    const data = cars.all().map((car) => {
      const photos = car.photos ?? []
      const cover = photos.find((photo) => photo.isCover) ?? photos[0]
      return {
        car: {
          id: car.id,
          name: `${car.make} ${car.model} ${car.year}`,
          registrationNo: car.registrationNo,
          status: car.status,
          categoryName: car.category.name,
          coverUrl: cover?.file?.url ?? null,
        },
        items: car.allocations.map((allocation) => {
          const booking = allocation.booking
          return {
            id: allocation.id,
            source: allocation.source,
            startsAt: allocation.startsAt.toISO(),
            endsAt: allocation.endsAt.toISO(),
            endsAtWithBuffer: allocation.endsAtWithBuffer.toISO(),
            reason: allocation.reason,
            booking: booking
              ? {
                  id: booking.id,
                  reference: booking.reference,
                  status: booking.status,
                  driveType: booking.driveType,
                  customerName: booking.customer?.fullName ?? null,
                }
              : null,
          }
        }),
      }
    })

    return response.ok({
      message: 'Calendar',
      data,
      meta: { ...cars.getMeta(), from: from.toISODate(), to: to.toISODate() },
    })
  }
}
