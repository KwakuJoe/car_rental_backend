import type { HttpContext } from '@adonisjs/core/http'
import type { Infer } from '@vinejs/vine/types'
import { DateTime } from 'luxon'
import type Booking from '#models/booking'
import type Car from '#models/car'
import CarDamage from '#models/car_damage'
import Incident from '#models/incident'
import TrafficFine from '#models/traffic_fine'
import AuditService from '#services/audit_service'
import { BookingError } from '#services/bookings/booking_service'
import IncidentService from '#services/incidents/incident_service'
import { currentBusiness } from '#services/memo'
import StaffAlerts from '#services/messages/staff_alerts'
import { formatMoney } from '#helpers/money'
import {
  chargeIncidentValidator,
  fineValidator,
  incidentValidator,
  listDamagesValidator,
  listFinesValidator,
  listIncidentsValidator,
  matchBookingValidator,
  payFineValidator,
  reasonValidator,
  resolveDamageValidator,
} from '#validators/incident'

const fail = (response: HttpContext['response'], error: BookingError) =>
  response.status(error.status).send({
    message: error.message,
    code: error.code,
    errors: [{ field: error.field, rule: 'incident', message: error.message }],
  })

async function attempt<T>(response: HttpContext['response'], action: () => Promise<T>) {
  try {
    return { ok: true as const, value: await action() }
  } catch (error) {
    if (error instanceof BookingError) return { ok: false as const, reply: fail(response, error) }
    throw error
  }
}

async function zone() {
  const business = await currentBusiness()
  return business?.timezone || 'Africa/Accra'
}

/** "YYYY-MM-DDTHH:mm" in the business time zone */
function when(value: string, tz: string, field: string) {
  const parsed = DateTime.fromISO(value, { zone: tz })
  if (!parsed.isValid) throw new BookingError(field, 'Enter a valid date and time.')
  if (parsed > DateTime.now().plus({ minutes: 5 }))
    throw new BookingError(field, 'It can’t be in the future.')
  return parsed
}

const carJson = (car: Car | null | undefined) =>
  car
    ? {
        id: car.id,
        name: car.publicTitle || `${car.make} ${car.model}`,
        registrationNo: car.registrationNo,
      }
    : null

const bookingJson = (booking: Booking | null | undefined) =>
  booking
    ? {
        id: booking.id,
        reference: booking.reference,
        status: booking.status,
        customerName: booking.customer?.fullName ?? null,
        customerPhone: booking.customer?.phone ?? null,
        pickupAt: (booking.actualPickupAt ?? booking.pickupAt).toISO(),
        returnAt: (booking.actualReturnAt ?? booking.returnAt).toISO(),
        excessAmount: booking.priceSnapshot?.protection?.excessAmount ?? null,
        depositHeldAmount: booking.depositHeldAmount,
      }
    : null

const incidentJson = (incident: Incident) => ({
  id: incident.id,
  number: incident.number,
  carId: incident.carId,
  car: carJson(incident.car),
  bookingId: incident.bookingId,
  booking: bookingJson(incident.booking),
  type: incident.type,
  status: incident.status,
  occurredAt: incident.occurredAt.toISO(),
  location: incident.location,
  description: incident.description,
  driverName: incident.driverName,
  policeReportNo: incident.policeReportNo,
  thirdParty: incident.thirdParty,
  claimNo: incident.claimNo,
  claimStatus: incident.claimStatus,
  claimAmount: incident.claimAmount,
  repairEstimateAmount: incident.repairEstimateAmount,
  charged: incident.charge
    ? { amount: incident.charge.amount, label: incident.charge.label }
    : null,
  photoFileIds: incident.photoFileIds,
  notes: incident.notes,
  closedAt: incident.closedAt?.toISO() ?? null,
  createdBy: incident.creator ? incident.creator.fullName || incident.creator.email : null,
  createdAt: incident.createdAt.toISO(),
})

const fineJson = (fine: TrafficFine) => ({
  id: fine.id,
  carId: fine.carId,
  car: carJson(fine.car),
  bookingId: fine.bookingId,
  booking: bookingJson(fine.booking),
  offence: fine.offence,
  reference: fine.reference,
  location: fine.location,
  issuedAt: fine.issuedAt.toISO(),
  amount: fine.amount,
  adminFeeAmount: fine.adminFeeAmount,
  status: fine.status,
  expenseId: fine.expenseId,
  fileId: fine.fileId,
  file: fine.file
    ? { id: fine.file.id, name: fine.file.originalName, mimeType: fine.file.mime }
    : null,
  notes: fine.notes,
  cancelReason: fine.cancelReason,
  createdAt: fine.createdAt.toISO(),
})

const damageJson = (damage: CarDamage) => ({
  id: damage.id,
  carId: damage.carId,
  car: carJson(damage.car),
  zone: damage.zone,
  type: damage.type,
  severity: damage.severity,
  note: damage.note,
  photoFileId: damage.photoFileId,
  booking: damage.inspection?.booking
    ? { id: damage.inspection.booking.id, reference: damage.inspection.booking.reference }
    : null,
  foundAt:
    damage.inspection?.type === 'check_in' ? 'check-in' : damage.inspection ? 'check-out' : null,
  resolution: damage.resolution,
  resolutionNote: damage.resolutionNote,
  repairedAt: damage.repairedAt?.toISO() ?? null,
  repairedJobCardId: damage.repairedJobCardId,
  createdAt: damage.createdAt.toISO(),
})

const incidents = () =>
  Incident.query()
    .preload('car')
    .preload('booking', (q) => q.preload('customer'))
    .preload('charge')
    .preload('creator')
const fines = () =>
  TrafficFine.query()
    .preload('car')
    .preload('booking', (q) => q.preload('customer'))
    .preload('file')

function incidentInput(payload: Infer<typeof incidentValidator>, tz: string) {
  const third = payload.thirdParty
  const hasThird = third && Object.values(third).some(Boolean)
  return {
    carId: payload.carId,
    bookingId: payload.bookingId ?? null,
    type: payload.type,
    occurredAt: when(payload.occurredAt, tz, 'occurredAt'),
    location: payload.location ?? null,
    description: payload.description,
    driverName: payload.driverName ?? null,
    policeReportNo: payload.policeReportNo ?? null,
    thirdParty: hasThird
      ? {
          name: third.name ?? null,
          phone: third.phone ?? null,
          vehicleReg: third.vehicleReg ?? null,
          insurer: third.insurer ?? null,
          policyNo: third.policyNo ?? null,
        }
      : null,
    claimNo: payload.claimNo ?? null,
    claimStatus: payload.claimStatus ?? 'not_filed',
    claimAmount: payload.claimAmount ?? null,
    repairEstimateAmount: payload.repairEstimateAmount ?? null,
    photoFileIds: [...new Set(payload.photoFileIds ?? [])],
    notes: payload.notes ?? null,
  }
}

function fineInput(payload: Infer<typeof fineValidator>, tz: string) {
  return {
    carId: payload.carId,
    bookingId: payload.bookingId ?? null,
    offence: payload.offence,
    reference: payload.reference ?? null,
    location: payload.location ?? null,
    issuedAt: when(payload.issuedAt, tz, 'issuedAt'),
    amount: payload.amount,
    adminFeeAmount: payload.adminFeeAmount ?? 0,
    fileId: payload.fileId ?? null,
    notes: payload.notes ?? null,
  }
}

const LABEL: Record<Incident['type'], string> = {
  accident: 'Accident',
  theft: 'Theft',
  breakdown: 'Breakdown',
  police_stop: 'Police stop',
  other: 'Incident',
}

/**
 * Damage, accidents and traffic fines (M8.2): incidents.view to see,
 * incidents.manage to record and charge.
 */
export default class IncidentsController {
  /** Who had the car then - for the forms to show before saving */
  async match({ request, response }: HttpContext) {
    const payload = await request.validateUsing(matchBookingValidator)
    if (!payload.carId || !payload.at) return response.ok({ message: 'No match', data: null })
    const at = DateTime.fromISO(payload.at, { zone: await zone() })
    if (!at.isValid) return response.ok({ message: 'No match', data: null })
    const booking = await IncidentService.whoHadTheCar(payload.carId, at)
    return response.ok({
      message: booking ? 'Matched' : 'No booking then',
      data: bookingJson(booking),
    })
  }

  // ── Incidents ──────────────────────────────────────────────────────

  async incidents({ request, response }: HttpContext) {
    const payload = await request.validateUsing(listIncidentsValidator)
    const query = incidents()
    const status = payload.status ?? 'all'
    if (status !== 'all') query.where('status', status)
    if (payload.type) query.where('type', payload.type)
    if (payload.carId) query.where('car_id', payload.carId)
    if (payload.search) {
      const term = `%${payload.search}%`
      query.where((q) =>
        q
          .whereILike('number', term)
          .orWhereILike('description', term)
          .orWhereILike('police_report_no', term)
          .orWhereILike('claim_no', term)
          .orWhereHas('car', (car) => car.whereILike('registration_no', term))
          .orWhereHas('booking', (booking) => booking.whereILike('reference', term))
      )
    }
    const page = await query
      .orderBy('occurred_at', 'desc')
      .paginate(payload.page ?? 1, payload.limit ?? 20)
    const open = await Incident.query().where('status', 'open').count('* as total')
    return response.ok({
      message: 'Incidents',
      data: page.all().map(incidentJson),
      meta: { ...page.getMeta(), openCount: Number(open[0]?.$extras.total ?? 0) },
    })
  }

  async showIncident({ params, response }: HttpContext) {
    const incident = await incidents().where('id', params.id).firstOrFail()
    return response.ok({ message: 'Incident', data: incidentJson(incident) })
  }

  async storeIncident(ctx: HttpContext) {
    const { auth, request, response } = ctx
    const payload = await request.validateUsing(incidentValidator)
    const tz = await zone()
    const result = await attempt(response, async () =>
      IncidentService.createIncident(incidentInput(payload, tz), auth.getUserOrFail())
    )
    if (!result.ok) return result.reply
    const incident = await incidents().where('id', result.value.id).firstOrFail()
    await AuditService.record(ctx, {
      action: 'incident.created',
      subject: { type: 'incident', id: incident.id, label: incident.number },
      after: { type: incident.type, carId: incident.carId, bookingId: incident.bookingId },
      metadata: { bookingChosenByHand: !!payload.bookingId },
    })
    const car = `${incident.car.make} ${incident.car.model} (${incident.car.registrationNo})`
    const happened = incident.occurredAt.setZone(tz).toFormat('ccc d LLL, HH:mm')
    await StaffAlerts.send('incident_reported', {
      sms: `${LABEL[incident.type]} recorded: ${car}, ${happened}${incident.booking ? ` (booking ${incident.booking.reference})` : ''}. ${incident.number}`,
      email: {
        subject: `${LABEL[incident.type]}: ${incident.car.registrationNo} - ${incident.number}`,
        preheader: `${car}, ${happened}.`,
        eyebrow: { text: LABEL[incident.type], color: '#fb242f' },
        heading: `${LABEL[incident.type]} with ${incident.car.registrationNo}`,
        paragraphs: [incident.description],
        details: {
          rows: [
            { label: 'Car', value: car },
            { label: 'When', value: happened },
            ...(incident.location ? [{ label: 'Where', value: incident.location }] : []),
            ...(incident.booking
              ? [
                  {
                    label: 'Booking',
                    value: `${incident.booking.reference}${incident.booking.customer ? ` - ${incident.booking.customer.fullName}` : ''}`,
                  },
                ]
              : []),
          ],
        },
        path: '/dashboard/incidents',
        buttonLabel: 'Open incidents',
      },
    })
    return response.created({
      message: `${incident.number} recorded`,
      data: incidentJson(incident),
    })
  }

  async updateIncident(ctx: HttpContext) {
    const { params, request, response } = ctx
    const payload = await request.validateUsing(incidentValidator)
    const tz = await zone()
    const result = await attempt(response, async () =>
      IncidentService.updateIncident(params.id, incidentInput(payload, tz))
    )
    if (!result.ok) return result.reply
    await AuditService.record(ctx, {
      action: 'incident.updated',
      subject: { type: 'incident', id: result.value.id, label: result.value.number },
      after: { claimStatus: result.value.claimStatus, bookingId: result.value.bookingId },
      metadata: { bookingChosenByHand: !!payload.bookingId },
    })
    const incident = await incidents().where('id', result.value.id).firstOrFail()
    return response.ok({ message: 'Incident updated', data: incidentJson(incident) })
  }

  async chargeIncident(ctx: HttpContext) {
    const { auth, params, request, response } = ctx
    const payload = await request.validateUsing(chargeIncidentValidator)
    const result = await attempt(response, () =>
      IncidentService.chargeIncident(
        params.id,
        {
          amount: payload.amount,
          label: payload.label ?? null,
          overExcessReason: payload.overExcessReason ?? null,
        },
        auth.getUserOrFail()
      )
    )
    if (!result.ok) return result.reply
    const incident = await incidents().where('id', result.value.id).firstOrFail()
    await AuditService.record(ctx, {
      action: 'incident.charged',
      subject: { type: 'incident', id: incident.id, label: incident.number },
      metadata: {
        amount: payload.amount,
        bookingId: incident.bookingId,
        overExcessReason: payload.overExcessReason,
      },
    })
    return response.ok({
      message: `${formatMoney(payload.amount)} added to booking ${incident.booking?.reference}`,
      data: incidentJson(incident),
    })
  }

  async closeIncident(ctx: HttpContext) {
    const incident = await IncidentService.setIncidentStatus(ctx.params.id, 'closed')
    await AuditService.record(ctx, {
      action: 'incident.closed',
      subject: { type: 'incident', id: incident.id, label: incident.number },
    })
    return ctx.response.ok({
      message: `${incident.number} closed`,
      data: incidentJson(await incidents().where('id', incident.id).firstOrFail()),
    })
  }

  async reopenIncident(ctx: HttpContext) {
    const incident = await IncidentService.setIncidentStatus(ctx.params.id, 'open')
    await AuditService.record(ctx, {
      action: 'incident.reopened',
      subject: { type: 'incident', id: incident.id, label: incident.number },
    })
    return ctx.response.ok({
      message: `${incident.number} reopened`,
      data: incidentJson(await incidents().where('id', incident.id).firstOrFail()),
    })
  }

  // ── Traffic fines ──────────────────────────────────────────────────

  async fines({ request, response }: HttpContext) {
    const payload = await request.validateUsing(listFinesValidator)
    const query = fines()
    const status = payload.status ?? 'all'
    if (status !== 'all') query.where('status', status)
    if (payload.carId) query.where('car_id', payload.carId)
    if (payload.search) {
      const term = `%${payload.search}%`
      query.where((q) =>
        q
          .whereILike('offence', term)
          .orWhereILike('reference', term)
          .orWhereHas('car', (car) => car.whereILike('registration_no', term))
          .orWhereHas('booking', (booking) => booking.whereILike('reference', term))
      )
    }
    const page = await query
      .orderBy('issued_at', 'desc')
      .paginate(payload.page ?? 1, payload.limit ?? 20)
    const unpaid = await TrafficFine.query()
      .where('status', 'unpaid')
      .sum('amount as amount')
      .count('* as total')
    return response.ok({
      message: 'Traffic fines',
      data: page.all().map(fineJson),
      meta: {
        ...page.getMeta(),
        unpaid: {
          count: Number(unpaid[0]?.$extras.total ?? 0),
          amount: Number(unpaid[0]?.$extras.amount ?? 0),
        },
      },
    })
  }

  async storeFine(ctx: HttpContext) {
    const { auth, request, response } = ctx
    const payload = await request.validateUsing(fineValidator)
    const tz = await zone()
    const result = await attempt(response, async () =>
      IncidentService.createFine(fineInput(payload, tz), auth.getUserOrFail())
    )
    if (!result.ok) return result.reply
    const fine = await fines().where('id', result.value.id).firstOrFail()
    await AuditService.record(ctx, {
      action: 'fine.created',
      subject: { type: 'traffic_fine', id: fine.id, label: fine.offence },
      after: { carId: fine.carId, bookingId: fine.bookingId, amount: fine.amount },
      metadata: { bookingChosenByHand: !!payload.bookingId },
    })
    return response.created({
      message: fine.booking
        ? `Fine recorded - ${fine.booking.customer?.fullName ?? fine.booking.reference} had the car`
        : 'Fine recorded - no booking had the car then',
      data: fineJson(fine),
    })
  }

  async updateFine(ctx: HttpContext) {
    const { params, request, response } = ctx
    const payload = await request.validateUsing(fineValidator)
    const tz = await zone()
    const result = await attempt(response, async () =>
      IncidentService.updateFine(params.id, fineInput(payload, tz))
    )
    if (!result.ok) return result.reply
    await AuditService.record(ctx, {
      action: 'fine.updated',
      subject: { type: 'traffic_fine', id: result.value.id, label: result.value.offence },
      after: { bookingId: result.value.bookingId, amount: result.value.amount },
      metadata: { bookingChosenByHand: !!payload.bookingId },
    })
    return response.ok({
      message: 'Fine updated',
      data: fineJson(await fines().where('id', result.value.id).firstOrFail()),
    })
  }

  async chargeFine(ctx: HttpContext) {
    const { auth, params, response } = ctx
    const result = await attempt(response, () =>
      IncidentService.chargeFine(params.id, auth.getUserOrFail())
    )
    if (!result.ok) return result.reply
    const fine = await fines().where('id', result.value.id).firstOrFail()
    await AuditService.record(ctx, {
      action: 'fine.charged',
      subject: { type: 'traffic_fine', id: fine.id, label: fine.offence },
      metadata: { bookingId: fine.bookingId, amount: fine.amount + fine.adminFeeAmount },
    })
    return response.ok({
      message: `${formatMoney(fine.amount + fine.adminFeeAmount)} added to booking ${fine.booking?.reference}`,
      data: fineJson(fine),
    })
  }

  async payFine(ctx: HttpContext) {
    const { auth, params, request, response } = ctx
    const payload = await request.validateUsing(payFineValidator)
    const tz = await zone()
    const result = await attempt(response, () =>
      IncidentService.payFine(
        params.id,
        {
          paidVia: payload.paidVia,
          paidAt: payload.paidAt ? when(payload.paidAt, tz, 'paidAt') : DateTime.now(),
        },
        auth.getUserOrFail()
      )
    )
    if (!result.ok) return result.reply
    const fine = await fines().where('id', result.value.id).firstOrFail()
    await AuditService.record(ctx, {
      action: 'fine.paid_by_business',
      subject: { type: 'traffic_fine', id: fine.id, label: fine.offence },
      metadata: { expenseId: fine.expenseId, amount: fine.amount },
    })
    return response.ok({ message: 'Recorded as paid - it’s in Expenses', data: fineJson(fine) })
  }

  async cancelFine(ctx: HttpContext) {
    const { params, request, response } = ctx
    const { reason } = await request.validateUsing(reasonValidator)
    const result = await attempt(response, () => IncidentService.cancelFine(params.id, reason))
    if (!result.ok) return result.reply
    await AuditService.record(ctx, {
      action: 'fine.cancelled',
      subject: { type: 'traffic_fine', id: result.value.id, label: result.value.offence },
      metadata: { reason },
    })
    return response.ok({
      message: 'Fine cancelled',
      data: fineJson(await fines().where('id', result.value.id).firstOrFail()),
    })
  }

  // ── Damage register ────────────────────────────────────────────────

  async damages({ request, response }: HttpContext) {
    const payload = await request.validateUsing(listDamagesValidator)
    const query = CarDamage.query()
      .preload('car')
      .preload('inspection', (q) => q.preload('booking'))
      .whereHas('car', (car) => car.whereNull('archived_at'))
    const state = payload.state ?? 'open'
    if (state === 'open') query.whereNull('repaired_at')
    if (state === 'resolved') query.whereNotNull('repaired_at')
    if (payload.carId) query.where('car_id', payload.carId)
    if (payload.search) {
      const term = `%${payload.search}%`
      query.where((q) =>
        q
          .whereILike('note', term)
          .orWhereILike('zone', term)
          .orWhereHas('car', (car) => car.whereILike('registration_no', term))
      )
    }
    const page = await query
      .orderBy('created_at', 'desc')
      .paginate(payload.page ?? 1, payload.limit ?? 50)
    const open = await CarDamage.query()
      .whereNull('repaired_at')
      .whereHas('car', (car) => car.whereNull('archived_at'))
      .count('* as total')
    return response.ok({
      message: 'Damage',
      data: page.all().map(damageJson),
      meta: { ...page.getMeta(), openCount: Number(open[0]?.$extras.total ?? 0) },
    })
  }

  async resolveDamage(ctx: HttpContext) {
    const payload = await ctx.request.validateUsing(resolveDamageValidator)
    const damage = await IncidentService.resolveDamage(ctx.params.id, {
      resolution: payload.resolution,
      note: payload.note ?? null,
    })
    await AuditService.record(ctx, {
      action: 'damage.resolved',
      subject: { type: 'car_damage', id: damage.id, label: `${damage.zone} ${damage.type}` },
      after: { resolution: damage.resolution, carId: damage.carId },
    })
    return ctx.response.ok({
      message: payload.resolution === 'repaired' ? 'Marked repaired' : 'Marked as fair wear',
    })
  }

  async reopenDamage(ctx: HttpContext) {
    const damage = await IncidentService.reopenDamage(ctx.params.id)
    await AuditService.record(ctx, {
      action: 'damage.reopened',
      subject: { type: 'car_damage', id: damage.id, label: `${damage.zone} ${damage.type}` },
    })
    return ctx.response.ok({ message: 'Back on the open list' })
  }
}
