import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'
import Booking from '#models/booking'
import BookingCharge, { type ChargeCode } from '#models/booking_charge'
import Car from '#models/car'
import CarDamage, { type DamageResolution } from '#models/car_damage'
import Expense, { type ExpensePaidVia } from '#models/expense'
import ExpenseCategory from '#models/expense_category'
import Incident, { type ClaimStatus, type IncidentType, type ThirdParty } from '#models/incident'
import TrafficFine from '#models/traffic_fine'
import type User from '#models/user'
import { BookingError } from '#services/bookings/booking_service'
import FileService from '#services/file_service'
import NumberingService from '#services/numbering_service'
import { userCan } from '#helpers/permissions'

/** Bookings where the car actually went out */
const WENT_OUT = ['on_rent', 'returned', 'closed']
/**
 * Staff can also pick a confirmed booking by hand: the car was handed over
 * but never checked out in the app.
 */
const CHARGEABLE = ['confirmed', ...WENT_OUT]

export type FineInput = {
  carId: string
  /** null = match by when (whoever had the car); a booking id = that one */
  bookingId: string | null
  offence: string
  reference: string | null
  location: string | null
  issuedAt: DateTime
  amount: number
  adminFeeAmount: number
  fileId: string | null
  notes: string | null
}

export type IncidentInput = {
  carId: string
  bookingId: string | null
  type: IncidentType
  occurredAt: DateTime
  location: string | null
  description: string
  driverName: string | null
  policeReportNo: string | null
  thirdParty: ThirdParty | null
  claimNo: string | null
  claimStatus: ClaimStatus
  claimAmount: number | null
  repairEstimateAmount: number | null
  photoFileIds: string[]
  notes: string | null
}

/**
 * Damage, accidents and traffic fines (M8.2). Fines and incidents are
 * matched to the booking that had the car at the time (actual pick-up /
 * return when known). Charging the customer adds a charge to that booking
 * - after the rental too: a closed booking goes back to "returned" until
 * the money is in, and the deposit can still be kept against it.
 */
export default class IncidentService {
  /** The rental that had the car at that moment (actual times when known) */
  static async whoHadTheCar(carId: string, at: DateTime, trx?: TransactionClientContract) {
    const when = at.toSQL({ includeOffset: true })!
    return Booking.query(trx ? { client: trx } : undefined)
      .where('car_id', carId)
      .whereIn('status', WENT_OUT)
      .whereRaw('coalesce(actual_pickup_at, pickup_at) <= ?', [when])
      .whereRaw(
        "coalesce(actual_return_at, case when status = 'on_rent' then now() + interval '100 years' else return_at end) >= ?",
        [when]
      )
      .orderBy('pickup_at', 'desc')
      .preload('customer')
      .first()
  }

  /** A charge on a booking after (or during) the rental; reopens a closed booking. */
  static async chargeBooking(
    trx: TransactionClientContract,
    bookingId: string,
    charge: { code: ChargeCode; label: string; amount: number },
    user: User
  ) {
    const booking = await Booking.query({ client: trx })
      .where('id', bookingId)
      .forUpdate()
      .firstOrFail()
    if (!CHARGEABLE.includes(booking.status)) {
      throw new BookingError('bookingId', 'Only a confirmed or rented booking can be charged.')
    }
    const row = await BookingCharge.create(
      {
        bookingId: booking.id,
        inspectionId: null,
        code: charge.code,
        label: charge.label.slice(0, 200),
        quantity: '1',
        unitAmount: charge.amount,
        amount: charge.amount,
        taxable: false,
        taxAmount: 0,
        status: 'accepted',
        waiveReason: null,
        createdBy: user.id,
      },
      { client: trx }
    )
    booking.useTransaction(trx)
    booking.merge({
      subtotalAmount: booking.subtotalAmount + charge.amount,
      totalAmount: booking.totalAmount + charge.amount,
      status: booking.status === 'closed' ? 'returned' : booking.status,
    })
    booking.balanceAmount = booking.totalAmount - booking.paidAmount
    await booking.save()
    return { charge: row, booking }
  }

  private static async carOrFail(trx: TransactionClientContract, carId: string) {
    const car = await Car.find(carId, { client: trx })
    if (!car) throw new BookingError('carId', 'Choose the car.')
    return car
  }

  private static async matched(
    trx: TransactionClientContract,
    carId: string,
    bookingId: string | null,
    at: DateTime
  ) {
    if (!bookingId) {
      const match = await this.whoHadTheCar(carId, at, trx)
      return match?.id ?? null
    }
    const booking = await Booking.find(bookingId, { client: trx })
    if (!booking || booking.carId !== carId) {
      throw new BookingError('bookingId', 'That booking wasn’t for this car.')
    }
    if (!CHARGEABLE.includes(booking.status)) {
      throw new BookingError('bookingId', 'Choose a booking where the car was handed over.')
    }
    return booking.id
  }

  // ── Traffic fines ──────────────────────────────────────────────────

  static async createFine(input: FineInput, user: User) {
    return db.transaction(async (trx) => {
      const car = await this.carOrFail(trx, input.carId)
      const bookingId = await this.matched(trx, car.id, input.bookingId, input.issuedAt)
      const fine = await TrafficFine.create(
        {
          branchId: car.branchId,
          carId: car.id,
          bookingId,
          offence: input.offence,
          reference: input.reference,
          location: input.location,
          issuedAt: input.issuedAt,
          amount: input.amount,
          adminFeeAmount: input.adminFeeAmount,
          status: 'unpaid',
          fileId: input.fileId,
          notes: input.notes,
          createdBy: user.id,
        },
        { client: trx }
      )
      if (input.fileId) await FileService.attach(input.fileId, 'traffic_fine', fine.id, trx)
      return fine
    })
  }

  static async updateFine(id: string, input: FineInput) {
    return db.transaction(async (trx) => {
      const fine = await TrafficFine.query({ client: trx })
        .where('id', id)
        .forUpdate()
        .firstOrFail()
      if (fine.status !== 'unpaid') {
        throw new BookingError('status', 'Only an unpaid fine can be changed.', 409)
      }
      const car = await this.carOrFail(trx, input.carId)
      fine.useTransaction(trx)
      fine.merge({
        branchId: car.branchId,
        carId: car.id,
        bookingId: await this.matched(trx, car.id, input.bookingId, input.issuedAt),
        offence: input.offence,
        reference: input.reference,
        location: input.location,
        issuedAt: input.issuedAt,
        amount: input.amount,
        adminFeeAmount: input.adminFeeAmount,
        fileId: input.fileId,
        notes: input.notes,
      })
      await fine.save()
      if (input.fileId) await FileService.attach(input.fileId, 'traffic_fine', fine.id, trx)
      return fine
    })
  }

  /** On the customer's booking: the fine plus the admin fee. */
  static async chargeFine(id: string, user: User) {
    return db.transaction(async (trx) => {
      const fine = await TrafficFine.query({ client: trx })
        .where('id', id)
        .forUpdate()
        .firstOrFail()
      if (fine.status !== 'unpaid') {
        throw new BookingError('status', 'This fine has already been dealt with.', 409)
      }
      if (!fine.bookingId) {
        throw new BookingError('bookingId', 'Match the fine to a booking first.')
      }
      const { charge } = await this.chargeBooking(
        trx,
        fine.bookingId,
        {
          code: 'traffic_fine',
          label: `Traffic fine: ${fine.offence}${fine.reference ? ` (${fine.reference})` : ''}${
            fine.adminFeeAmount ? ' + admin fee' : ''
          }`,
          amount: fine.amount + fine.adminFeeAmount,
        },
        user
      )
      fine.useTransaction(trx)
      fine.merge({ status: 'charged_to_customer', chargeId: charge.id })
      await fine.save()
      return fine
    })
  }

  /** The business paid it: recorded as an expense on the car. */
  static async payFine(
    id: string,
    input: { paidVia: ExpensePaidVia; paidAt: DateTime },
    user: User
  ) {
    return db.transaction(async (trx) => {
      const fine = await TrafficFine.query({ client: trx })
        .where('id', id)
        .forUpdate()
        .firstOrFail()
      if (fine.status !== 'unpaid') {
        throw new BookingError('status', 'This fine has already been dealt with.', 409)
      }
      const category =
        (await ExpenseCategory.query({ client: trx }).where('slug', 'fines').first()) ??
        (await ExpenseCategory.query({ client: trx }).where('slug', 'other').first())
      if (!category) throw new BookingError('paidVia', 'Add an expense category first.')
      const approver = await userCan(user, 'expenses.approve')
      const expense = await Expense.create(
        {
          branchId: fine.branchId,
          categoryId: category.id,
          carId: fine.carId,
          description: `Traffic fine: ${fine.offence}`.slice(0, 200),
          vendor: null,
          amount: fine.amount,
          paidVia: input.paidVia,
          paidAt: input.paidAt,
          reference: fine.reference,
          submittedBy: user.id,
          status: approver ? 'approved' : 'submitted',
          approvedBy: approver ? user.id : null,
          approvedAt: approver ? DateTime.now() : null,
        },
        { client: trx }
      )
      fine.useTransaction(trx)
      fine.merge({ status: 'paid_by_business', expenseId: expense.id })
      await fine.save()
      return fine
    })
  }

  static async cancelFine(id: string, reason: string) {
    const fine = await TrafficFine.findOrFail(id)
    if (fine.status !== 'unpaid') {
      throw new BookingError('status', 'This fine has already been dealt with.', 409)
    }
    fine.merge({ status: 'cancelled', cancelReason: reason })
    await fine.save()
    return fine
  }

  // ── Incidents ──────────────────────────────────────────────────────

  static async createIncident(input: IncidentInput, user: User) {
    return db.transaction(async (trx) => {
      const car = await this.carOrFail(trx, input.carId)
      const incident = await Incident.create(
        {
          number: await NumberingService.next('incident', trx),
          branchId: car.branchId,
          carId: car.id,
          bookingId: await this.matched(trx, car.id, input.bookingId, input.occurredAt),
          status: 'open',
          ...this.incidentFields(input),
          createdBy: user.id,
        },
        { client: trx }
      )
      for (const fileId of input.photoFileIds) {
        await FileService.attach(fileId, 'incident', incident.id, trx)
      }
      return incident
    })
  }

  static async updateIncident(id: string, input: IncidentInput) {
    return db.transaction(async (trx) => {
      const incident = await Incident.query({ client: trx })
        .where('id', id)
        .forUpdate()
        .firstOrFail()
      const car = await this.carOrFail(trx, input.carId)
      if (
        incident.chargeId &&
        (car.id !== incident.carId || input.bookingId !== incident.bookingId)
      ) {
        throw new BookingError(
          'bookingId',
          'The customer has been charged - the car and booking can’t change.'
        )
      }
      incident.useTransaction(trx)
      incident.merge({
        branchId: car.branchId,
        carId: car.id,
        bookingId: incident.chargeId
          ? incident.bookingId
          : await this.matched(trx, car.id, input.bookingId, input.occurredAt),
        ...this.incidentFields(input),
      })
      await incident.save()
      for (const fileId of input.photoFileIds) {
        await FileService.attach(fileId, 'incident', incident.id, trx)
      }
      return incident
    })
  }

  private static incidentFields(input: IncidentInput) {
    return {
      type: input.type,
      occurredAt: input.occurredAt,
      location: input.location,
      description: input.description,
      driverName: input.driverName,
      policeReportNo: input.policeReportNo,
      thirdParty: input.thirdParty,
      claimNo: input.claimNo,
      claimStatus: input.claimStatus,
      claimAmount: input.claimAmount,
      repairEstimateAmount: input.repairEstimateAmount,
      photoFileIds: input.photoFileIds,
      notes: input.notes,
    }
  }

  /**
   * What the customer pays towards it, on their booking. Above the
   * protection plan's excess only with a reason (bookings.override).
   */
  static async chargeIncident(
    id: string,
    input: { amount: number; label: string | null; overExcessReason: string | null },
    user: User
  ) {
    return db.transaction(async (trx) => {
      const incident = await Incident.query({ client: trx })
        .where('id', id)
        .forUpdate()
        .firstOrFail()
      if (incident.chargeId)
        throw new BookingError('amount', 'The customer has already been charged.', 409)
      if (!incident.bookingId)
        throw new BookingError('bookingId', 'Match the incident to a booking first.')
      const booking = await Booking.query({ client: trx })
        .where('id', incident.bookingId)
        .preload('protectionPlan')
        .firstOrFail()
      const excess =
        booking.priceSnapshot?.protection?.excessAmount ?? booking.protectionPlan?.excessAmount
      if (excess !== undefined && excess !== null && input.amount > excess) {
        if (!(await userCan(user, 'bookings.override'))) {
          throw new BookingError(
            'amount',
            'That’s more than the customer’s excess - a manager has to charge it.',
            422
          )
        }
        if (!input.overExcessReason) {
          throw new BookingError(
            'overExcessReason',
            'Say why the customer pays more than their excess.'
          )
        }
      }
      const { charge } = await this.chargeBooking(
        trx,
        booking.id,
        {
          code: 'damage',
          label: input.label || `${incident.number}: ${incident.type.replaceAll('_', ' ')}`,
          amount: input.amount,
        },
        user
      )
      incident.useTransaction(trx)
      incident.chargeId = charge.id
      if (input.overExcessReason) {
        incident.notes = [incident.notes, `Charged above the excess: ${input.overExcessReason}`]
          .filter(Boolean)
          .join('\n')
      }
      await incident.save()
      return incident
    })
  }

  static async setIncidentStatus(id: string, status: 'open' | 'closed') {
    const incident = await Incident.findOrFail(id)
    incident.merge({ status, closedAt: status === 'closed' ? DateTime.now() : null })
    await incident.save()
    return incident
  }

  // ── Damage register ────────────────────────────────────────────────

  /** Repaired (optionally by a job card) or accepted as fair wear - no longer shown as open */
  static async resolveDamage(
    damageId: string,
    input: { resolution: DamageResolution; note: string | null; jobCardId?: string | null },
    trx?: TransactionClientContract
  ) {
    const damage = await CarDamage.findOrFail(damageId, trx ? { client: trx } : undefined)
    if (trx) damage.useTransaction(trx)
    damage.merge({
      resolution: input.resolution,
      resolutionNote: input.note,
      repairedAt: DateTime.now(),
      repairedJobCardId: input.jobCardId ?? null,
    })
    await damage.save()
    return damage
  }

  /** Back to open (marked by mistake) */
  static async reopenDamage(damageId: string) {
    const damage = await CarDamage.findOrFail(damageId)
    damage.merge({
      resolution: null,
      resolutionNote: null,
      repairedAt: null,
      repairedJobCardId: null,
    })
    await damage.save()
    return damage
  }
}
