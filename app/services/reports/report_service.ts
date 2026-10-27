import { DateTime } from 'luxon'
import Booking from '#models/booking'
import Business from '#models/business'
import Car from '#models/car'
import Category from '#models/category'
import Expense from '#models/expense'
import ExpenseCategory from '#models/expense_category'
import Payment from '#models/payment'
import User from '#models/user'

export type ReportRange = { dateFrom: string; dateTo: string; branchId?: string | null }

/** Bookings that became (or are) real rentals */
const RENTED: string[] = ['confirmed', 'on_rent', 'returned', 'closed']
/** Bookings where the car actually went out */
const WENT_OUT: string[] = ['on_rent', 'returned', 'closed']
const DEAD: string[] = ['cancelled', 'expired', 'no_show', 'draft']

const sum = <T>(items: T[], value: (item: T) => number) =>
  items.reduce((total, item) => total + value(item), 0)

/**
 * The reports page (M9 subset): one call for a date range (business time
 * zone) and optional branch. Money figures come only with
 * reports.financial; without it they're null and the counts and
 * percentages remain. All amounts in pesewas.
 *
 *  - Money collected: completed rent payments by the date paid, less
 *    refunds; by method, by staff, per day; deposits taken / returned.
 *  - Bookings made in the period: by source and status.
 *  - Cancellations, no-shows and expired holds in the period; fees kept.
 *  - Rentals starting in the period: days, revenue, average per day;
 *    utilisation per car and category (time out / time in the fleet).
 *  - Now: outstanding balances, deposits held.
 *  - Tax on rentals starting in the period, per tax line.
 *  - Approved expenses paid in the period, by category; spent and
 *    "earned less spent" per car.
 */
export default class ReportService {
  static async overview(range: ReportRange, financial: boolean) {
    const business = await Business.query().first()
    const zone = business?.timezone || 'Africa/Accra'
    const start = DateTime.fromISO(range.dateFrom, { zone }).startOf('day')
    const end = DateTime.fromISO(range.dateTo, { zone }).endOf('day')
    const days = Math.max(1, Math.round(end.diff(start, 'days').days))
    const prevEnd = start.minus({ milliseconds: 1 })
    const prevStart = prevEnd.minus({ days }).plus({ milliseconds: 1 })
    const branch = <Q extends { where: (column: string, value: string) => Q }>(query: Q) =>
      range.branchId ? query.where('branch_id', range.branchId) : query
    const money = (value: number) => (financial ? value : null)
    const now = DateTime.now()

    // ── Money collected ───────────────────────────────────────────────
    const paymentsIn = (from: DateTime, to: DateTime) =>
      branch(
        Payment.query()
          .where('status', 'completed')
          .where('paid_at', '>=', from.toSQL()!)
          .where('paid_at', '<=', to.toSQL()!)
      )
    const [payments, previousPayments] = await Promise.all([
      paymentsIn(start, end),
      paymentsIn(prevStart, prevEnd).whereIn('type', ['rental', 'refund']),
    ])
    const rent = payments.filter(
      (payment) => payment.type === 'rental' && payment.method !== 'deposit'
    )
    const refunds = payments.filter((payment) => payment.type === 'refund')
    const net = sum(rent, (payment) => payment.amount) - sum(refunds, (payment) => payment.amount)
    const previousNet =
      sum(
        previousPayments.filter(
          (payment) => payment.type === 'rental' && payment.method !== 'deposit'
        ),
        (payment) => payment.amount
      ) -
      sum(
        previousPayments.filter((payment) => payment.type === 'refund'),
        (payment) => payment.amount
      )

    const staffIds = [
      ...new Set(rent.map((payment) => payment.recordedBy).filter((id): id is string => !!id)),
    ]
    const staff = staffIds.length ? await User.query().whereIn('id', staffIds) : []
    const staffName = (id: string | null) => {
      if (!id) return 'Customer (online)'
      const user = staff.find((item) => item.id === id)
      return user?.fullName || user?.email || 'Staff'
    }

    // Per day (per week past 3 months, so the chart stays readable)
    const weekly = days > 92
    const bucket = (date: DateTime) =>
      weekly ? date.setZone(zone).startOf('week') : date.setZone(zone).startOf('day')
    const series = new Map<string, number>()
    for (
      let cursor = bucket(start);
      cursor <= end;
      cursor = cursor.plus(weekly ? { weeks: 1 } : { days: 1 })
    ) {
      series.set(cursor.toISODate()!, 0)
    }
    for (const payment of [...rent, ...refunds]) {
      const key = bucket(payment.paidAt).toISODate()!
      series.set(
        key,
        (series.get(key) ?? 0) + (payment.type === 'refund' ? -payment.amount : payment.amount)
      )
    }

    // ── Bookings made in the period ───────────────────────────────────
    const createdIn = (from: DateTime, to: DateTime) =>
      branch(
        Booking.query()
          .where('created_at', '>=', from.toSQL()!)
          .where('created_at', '<=', to.toSQL()!)
      )
    const [made, previousMade] = await Promise.all([
      createdIn(start, end),
      createdIn(prevStart, prevEnd).count('* as total'),
    ])
    const live = made.filter((booking) => !DEAD.includes(booking.status))
    const group = <K extends string>(items: Booking[], key: (booking: Booking) => K) => {
      const map = new Map<K, Booking[]>()
      for (const item of items) map.set(key(item), [...(map.get(key(item)) ?? []), item])
      return map
    }

    // ── Cancellations, no-shows, expired holds ────────────────────────
    const ended = await branch(
      Booking.query().where((query) =>
        query
          .where((q) =>
            q
              .where('status', 'cancelled')
              .whereBetween('cancelled_at', [start.toSQL()!, end.toSQL()!])
          )
          .orWhere((q) =>
            q.where('status', 'no_show').whereBetween('no_show_at', [start.toSQL()!, end.toSQL()!])
          )
          .orWhere((q) =>
            q
              .where('status', 'expired')
              .whereBetween('hold_expires_at', [start.toSQL()!, end.toSQL()!])
          )
      )
    )
    const lost = ended.filter((booking) => booking.status !== 'expired')

    // ── Approved expenses paid in the period ──────────────────────────
    const expensesIn = (from: DateTime, to: DateTime) =>
      branch(
        Expense.query()
          .where('status', 'approved')
          .where('paid_at', '>=', from.toSQL()!)
          .where('paid_at', '<=', to.toSQL()!)
      )
    const [expenses, previousExpenses, expenseCategories] = financial
      ? await Promise.all([
          expensesIn(start, end),
          expensesIn(prevStart, prevEnd).sum('amount as total'),
          ExpenseCategory.query().orderBy('sort_order'),
        ])
      : [[], [], []]
    const spentOn = (carId: string) =>
      sum(
        expenses.filter((expense) => expense.carId === carId),
        (expense) => expense.amount
      )

    // ── Rentals starting in the period, and the fleet ─────────────────
    const rentals = await branch(
      Booking.query()
        .whereIn('status', RENTED)
        .where('pickup_at', '>=', start.toSQL()!)
        .where('pickup_at', '<=', end.toSQL()!)
    )
    const rentalDays = (booking: Booking) =>
      booking.priceSnapshot?.rentalDays ??
      Math.max(1, Math.ceil(booking.returnAt.diff(booking.pickupAt, 'days').days))

    // Time out: rentals overlapping the period (up to now for a period that isn't over)
    const until = DateTime.min(end, now)
    const out = await branch(
      Booking.query()
        .whereIn('status', WENT_OUT)
        .where('pickup_at', '<=', until.toSQL()!)
        .where('return_at', '>=', start.toSQL()!)
    )
    const outMinutes = new Map<string, number>()
    for (const booking of out) {
      const from = DateTime.max(booking.actualPickupAt ?? booking.pickupAt, start)
      const back =
        booking.actualReturnAt ??
        (booking.status === 'on_rent' ? DateTime.max(booking.returnAt, now) : booking.returnAt)
      const to = DateTime.min(back, until)
      const minutes = Math.max(0, to.diff(from, 'minutes').minutes)
      outMinutes.set(booking.carId, (outMinutes.get(booking.carId) ?? 0) + minutes)
    }
    const cars = await branch(
      Car.query().whereNull('archived_at').whereNot('status', 'retired').orderBy('make')
    )
    const categories = await Category.query().whereIn(
      'id',
      [...new Set(cars.map((car) => car.categoryId))].filter(Boolean)
    )
    const categoryName = (id: string) =>
      categories.find((category) => category.id === id)?.name ?? '-'
    const carMinutes = (car: Car) =>
      Math.max(0, until.diff(DateTime.max(start, car.createdAt), 'minutes').minutes)
    const byCar = cars.map((car) => {
      const own = rentals.filter((booking) => booking.carId === car.id)
      const available = carMinutes(car)
      return {
        id: car.id,
        name: car.publicTitle || `${car.make} ${car.model}`,
        registrationNo: car.registrationNo,
        category: categoryName(car.categoryId),
        categoryId: car.categoryId,
        rentals: own.length,
        days: sum(own, rentalDays),
        revenue: money(sum(own, (booking) => booking.totalAmount)),
        spent: money(spentOn(car.id)),
        profit: money(sum(own, (booking) => booking.totalAmount) - spentOn(car.id)),
        utilisation: available ? Math.min(1, (outMinutes.get(car.id) ?? 0) / available) : 0,
        _out: outMinutes.get(car.id) ?? 0,
        _available: available,
      }
    })
    const byCategory = [
      ...group(rentals, (booking) => booking.categoryId).keys(),
      ...categories.map((c) => c.id),
    ]
      .filter((id, index, all) => all.indexOf(id) === index)
      .map((id) => {
        const rows = byCar.filter((row) => row.categoryId === id)
        const own = rentals.filter((booking) => booking.categoryId === id)
        const available = sum(rows, (row) => row._available)
        return {
          name: categoryName(id),
          cars: rows.length,
          rentals: own.length,
          days: sum(own, rentalDays),
          revenue: money(sum(own, (booking) => booking.totalAmount)),
          utilisation: available ? Math.min(1, sum(rows, (row) => row._out) / available) : 0,
        }
      })
      .sort((a, b) => b.rentals - a.rentals)
    const fleetAvailable = sum(byCar, (row) => row._available)
    const daysRented = sum(rentals, rentalDays)
    const revenue = sum(rentals, (booking) => booking.totalAmount)

    // ── Now: balances still owed, deposits held ───────────────────────
    const [owing, holding] = await Promise.all([
      branch(
        Booking.query()
          .whereIn('status', ['confirmed', 'on_rent', 'returned'])
          .where('balance_amount', '>', 0)
      ),
      branch(Booking.query().where('deposit_held_amount', '>', 0)),
    ])

    // ── Tax on rentals starting in the period ─────────────────────────
    const lines = new Map<string, { name: string; rateBp: number; base: number; amount: number }>()
    for (const booking of rentals) {
      for (const tax of booking.priceSnapshot?.taxes ?? []) {
        const key = `${tax.name}|${tax.rateBp}`
        const line = lines.get(key) ?? { name: tax.name, rateBp: tax.rateBp, base: 0, amount: 0 }
        line.base += tax.base
        line.amount += tax.amount
        lines.set(key, line)
      }
    }
    const taxTotal = sum(rentals, (booking) => booking.taxAmount)
    const quoted = sum([...lines.values()], (line) => line.amount)

    return {
      range: {
        from: start.toISODate(),
        to: end.toISODate(),
        days,
        previousFrom: prevStart.toISODate(),
        previousTo: prevEnd.toISODate(),
        grouping: weekly ? 'week' : 'day',
      },
      financial,
      kpis: {
        collected: financial ? { net, previous: previousNet } : null,
        bookings: { count: made.length, previous: Number(previousMade[0]?.$extras.total ?? 0) },
        utilisation: fleetAvailable
          ? Math.min(1, sum(byCar, (row) => row._out) / fleetAvailable)
          : 0,
        rentals: { count: rentals.length, days: daysRented },
        averagePerDay: money(daysRented ? Math.round(revenue / daysRented) : 0),
        outstanding: {
          count: owing.length,
          amount: money(sum(owing, (booking) => booking.balanceAmount)),
        },
        depositsHeld: financial
          ? { count: holding.length, amount: sum(holding, (booking) => booking.depositHeldAmount) }
          : null,
      },
      daily: financial
        ? [...series.entries()].map(([date, value]) => ({ date, net: value }))
        : null,
      payments: financial
        ? {
            totals: {
              rent: sum(rent, (payment) => payment.amount),
              refunds: sum(refunds, (payment) => payment.amount),
              depositsTaken: sum(
                payments.filter((p) => p.type === 'deposit'),
                (p) => p.amount
              ),
              depositsReturned: sum(
                payments.filter((p) => p.type === 'deposit_refund'),
                (p) => p.amount
              ),
            },
            byMethod: (['cash', 'momo', 'bank_transfer'] as const).map((method) => ({
              method,
              count: rent.filter((payment) => payment.method === method).length,
              in: sum(
                rent.filter((payment) => payment.method === method),
                (payment) => payment.amount
              ),
              out: sum(
                refunds.filter((payment) => payment.method === method),
                (payment) => payment.amount
              ),
            })),
            byStaff: [...new Set(rent.map((payment) => payment.recordedBy ?? ''))]
              .map((id) => {
                const own = rent.filter((payment) => (payment.recordedBy ?? '') === id)
                return {
                  name: staffName(id || null),
                  count: own.length,
                  amount: sum(own, (payment) => payment.amount),
                }
              })
              .sort((a, b) => b.amount - a.amount),
          }
        : null,
      bookings: {
        value: money(sum(live, (booking) => booking.totalAmount)),
        bySource: [...group(made, (booking) => booking.source).entries()]
          .map(([source, items]) => ({
            source,
            count: items.length,
            value: money(
              sum(
                items.filter((booking) => !DEAD.includes(booking.status)),
                (b) => b.totalAmount
              )
            ),
          }))
          .sort((a, b) => b.count - a.count),
        byStatus: [...group(made, (booking) => booking.status).entries()]
          .map(([status, items]) => ({ status, count: items.length }))
          .sort((a, b) => b.count - a.count),
      },
      cancellations: {
        cancelled: ended.filter((booking) => booking.status === 'cancelled').length,
        noShows: ended.filter((booking) => booking.status === 'no_show').length,
        expired: ended.filter((booking) => booking.status === 'expired').length,
        rate: made.length ? lost.length / made.length : 0,
        feesKept: money(sum(lost, (booking) => booking.cancellationFeeAmount ?? 0)),
        lostValue: money(
          sum(lost, (booking) => booking.totalAmount - (booking.cancellationFeeAmount ?? 0))
        ),
        bySource: [...group(ended, (booking) => booking.source).entries()]
          .map(([source, items]) => ({ source, count: items.length }))
          .sort((a, b) => b.count - a.count),
      },
      fleet: {
        byCar: byCar
          .map(({ _out: _o, _available: _a, categoryId: _c, ...row }) => row)
          .sort((a, b) => b.utilisation - a.utilisation || b.rentals - a.rentals),
        byCategory,
      },
      expenses: financial
        ? {
            total: sum(expenses, (expense) => expense.amount),
            previous: Number(previousExpenses[0]?.$extras.total ?? 0),
            count: expenses.length,
            // Spent on the business as a whole (not on one car)
            general: sum(
              expenses.filter((expense) => !expense.carId),
              (expense) => expense.amount
            ),
            byCategory: expenseCategories
              .map((category) => {
                const own = expenses.filter((expense) => expense.categoryId === category.id)
                return {
                  name: category.name,
                  count: own.length,
                  amount: sum(own, (expense) => expense.amount),
                }
              })
              .filter((row) => row.count > 0)
              .sort((a, b) => b.amount - a.amount),
          }
        : null,
      taxes: financial
        ? {
            lines: [...lines.values()].sort((a, b) => b.amount - a.amount),
            // Tax added after the quote: check-in charges, booking changes
            other: taxTotal - quoted,
            total: taxTotal,
            rentals: rentals.length,
          }
        : null,
    }
  }
}
