import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import Business from '#models/business'
import Driver from '#models/driver'
import AuditService from '#services/audit_service'
import DriverService from '#services/bookings/driver_service'
import { driverToJson } from '#transformers/driver_transformer'
import { normalizePhone } from '#helpers/phone'
import { driverFilterValidator, driverValidator } from '#validators/booking'

const fail = (response: HttpContext['response'], field: string, message: string) =>
  response.unprocessableEntity({ message, errors: [{ field, rule: 'driver', message }] })

const AUDITED = [
  'fullName',
  'phone',
  'licenceNo',
  'licenceClass',
  'licenceExpiresOn',
  'status',
  'dailyRateAmount',
  'userId',
] as const

/** Chauffeur drivers (M3.9). Never deleted - set inactive. */
export default class DriversController {
  async index({ request, response }: HttpContext) {
    const payload = await request.validateUsing(driverFilterValidator)
    const query = Driver.query()

    if (payload.availableFrom && payload.availableTo) {
      const business = await Business.query().first()
      const zone = business?.timezone || 'Africa/Accra'
      const from = DateTime.fromISO(payload.availableFrom, { zone })
      const to = DateTime.fromISO(payload.availableTo, { zone })
      if (!from.isValid || !to.isValid || to <= from) {
        return fail(response, 'availableTo', 'Enter a valid period.')
      }
      const free = await DriverService.available(from, to, payload.excludeBookingId)
      query.whereIn(
        'id',
        free.map((driver) => driver.id)
      )
    }
    if (payload.status) query.where('status', payload.status)
    const search = payload.search
    if (search) {
      const phone = normalizePhone(search)
      query.where((q) => {
        q.whereILike('full_name', `%${search}%`).orWhereILike('licence_no', `%${search}%`)
        if (phone) q.orWhere('phone', phone)
      })
    }
    const drivers = await query
      .orderBy('full_name', 'asc')
      .paginate(payload.page ?? 1, payload.limit ?? 20)
    return response.ok({
      message: 'Drivers fetched successfully',
      data: drivers.all().map(driverToJson),
      meta: drivers.getMeta(),
    })
  }

  async show({ params, response }: HttpContext) {
    const driver = await Driver.findOrFail(params.id)
    return response.ok({ message: 'Driver fetched successfully', data: driverToJson(driver) })
  }

  async store(ctx: HttpContext) {
    const { request, response } = ctx
    const payload = await request.validateUsing(driverValidator)
    const phone = normalizePhone(payload.phone)
    if (!phone) return fail(response, 'phone', 'Enter a valid phone number, e.g. 024 123 4567.')
    const driver = await Driver.create({
      ...payload,
      phone,
      licenceClass: payload.licenceClass ?? null,
      userId: payload.userId ?? null,
      notes: payload.notes ?? null,
      status: payload.status ?? 'active',
      dailyRateAmount: payload.dailyRateAmount ?? 0,
    })
    await AuditService.record(ctx, {
      action: 'driver.created',
      subject: { type: 'driver', id: driver.id, label: driver.fullName },
      after: AuditService.pick(driver, [...AUDITED]),
    })
    return response.created({ message: 'Driver added', data: driverToJson(driver) })
  }

  async update(ctx: HttpContext) {
    const { params, request, response } = ctx
    const driver = await Driver.findOrFail(params.id)
    const payload = await request.validateUsing(driverValidator)
    const phone = normalizePhone(payload.phone)
    if (!phone) return fail(response, 'phone', 'Enter a valid phone number, e.g. 024 123 4567.')
    const before = AuditService.pick(driver, [...AUDITED])
    driver.merge({
      ...payload,
      phone,
      licenceClass: payload.licenceClass ?? null,
      userId: payload.userId ?? null,
      notes: payload.notes ?? null,
      status: payload.status ?? driver.status,
      dailyRateAmount: payload.dailyRateAmount ?? driver.dailyRateAmount,
    })
    await driver.save()
    await AuditService.record(ctx, {
      action: 'driver.updated',
      subject: { type: 'driver', id: driver.id, label: driver.fullName },
      before,
      after: AuditService.pick(driver, [...AUDITED]),
    })
    return response.ok({ message: 'Driver updated', data: driverToJson(driver) })
  }
}
