import ExcelJS from 'exceljs'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import Booking from '#models/booking'
import Business from '#models/business'
import Car from '#models/car'
import Customer from '#models/customer'
import Payment from '#models/payment'
import User from '#models/user'

export const EXPORT_TYPES = ['bookings', 'payments', 'customers', 'cars'] as const
export type ExportType = (typeof EXPORT_TYPES)[number]
export const EXPORT_FORMATS = ['csv', 'xlsx'] as const
export type ExportFormat = (typeof EXPORT_FORMATS)[number]

/** The permission that lets someone see the data, on top of exports.run */
export const EXPORT_VIEW_PERMISSION: Record<ExportType, string> = {
  bookings: 'bookings.view',
  payments: 'payments.view',
  customers: 'customers.view',
  cars: 'fleet.view',
}

export type ExportFilters = {
  dateFrom?: string | null
  dateTo?: string | null
  status?: string | null
  branchId?: string | null
}

type Column = { header: string; width?: number; kind?: 'money' | 'date' | 'datetime' | 'number' }
type Cell = string | number | DateTime | null | undefined
export type Sheet = { title: string; columns: Column[]; rows: Cell[][] }

/** Enough for years of a rental business; past this, narrow the dates. */
export const MAX_ROWS = 50_000

/** Byte-order mark: Excel then reads the CSV as UTF-8 (₵, accents) */
const BOM = String.fromCharCode(0xfeff)

const ghs = (pesewas: number | null | undefined) =>
  pesewas === null || pesewas === undefined ? null : pesewas / 100

/**
 * CSV / Excel exports for the accountant (M5.9): bookings, payments,
 * customers (no ID numbers - only what the customers list shows) and cars,
 * with a date range (business time zone), status and branch. Money in GHS
 * (2 decimals), dates in the business time zone.
 */
export default class ExportService {
  static async sheet(type: ExportType, filters: ExportFilters): Promise<Sheet> {
    const business = await Business.query().first()
    const zone = business?.timezone || 'Africa/Accra'
    const from = filters.dateFrom
      ? DateTime.fromISO(filters.dateFrom, { zone }).startOf('day')
      : null
    const to = filters.dateTo ? DateTime.fromISO(filters.dateTo, { zone }).endOf('day') : null
    const local = (value: DateTime | null) => (value ? value.setZone(zone) : null)

    if (type === 'bookings') {
      const query = Booking.query()
        .preload('customer')
        .preload('car')
        .preload('category')
        .orderBy('pickup_at', 'asc')
        .limit(MAX_ROWS)
      if (from) query.where('pickup_at', '>=', from.toSQL()!)
      if (to) query.where('pickup_at', '<=', to.toSQL()!)
      if (filters.status) query.where('status', filters.status)
      if (filters.branchId) query.where('branch_id', filters.branchId)
      const bookings = await query
      return {
        title: 'Bookings',
        columns: [
          { header: 'Reference', width: 18 },
          { header: 'Status', width: 12 },
          { header: 'Source', width: 11 },
          { header: 'Booked', kind: 'datetime' },
          { header: 'Pick-up', kind: 'datetime' },
          { header: 'Return', kind: 'datetime' },
          { header: 'Days', kind: 'number', width: 7 },
          { header: 'Customer', width: 24 },
          { header: 'Phone', width: 15 },
          { header: 'Car', width: 22 },
          { header: 'Registration', width: 14 },
          { header: 'Category', width: 14 },
          { header: 'Driving', width: 12 },
          { header: 'Subtotal (GHS)', kind: 'money' },
          { header: 'Discount (GHS)', kind: 'money' },
          { header: 'Tax (GHS)', kind: 'money' },
          { header: 'Total (GHS)', kind: 'money' },
          { header: 'Paid (GHS)', kind: 'money' },
          { header: 'Balance (GHS)', kind: 'money' },
          { header: 'Security deposit (GHS)', kind: 'money' },
          { header: 'Deposit held (GHS)', kind: 'money' },
          { header: 'Cancellation fee (GHS)', kind: 'money' },
        ],
        rows: bookings.map((booking) => [
          booking.reference,
          booking.status,
          booking.source,
          local(booking.createdAt),
          local(booking.pickupAt),
          local(booking.returnAt),
          booking.priceSnapshot?.rentalDays ?? null,
          booking.customer?.fullName,
          booking.customer?.phone,
          booking.car
            ? booking.car.publicTitle || `${booking.car.make} ${booking.car.model}`
            : null,
          booking.car?.registrationNo,
          booking.category?.name,
          booking.driveType === 'chauffeur' ? 'With driver' : 'Self-drive',
          ghs(booking.subtotalAmount),
          ghs(booking.discountAmount),
          ghs(booking.taxAmount),
          ghs(booking.totalAmount),
          ghs(booking.paidAmount),
          ghs(booking.balanceAmount),
          ghs(booking.depositAmount),
          ghs(booking.depositHeldAmount),
          ghs(booking.cancellationFeeAmount),
        ]),
      }
    }

    if (type === 'payments') {
      const query = Payment.query()
        .preload('booking')
        .preload('customer')
        .orderBy('paid_at', 'asc')
        .limit(MAX_ROWS)
      if (from) query.where('paid_at', '>=', from.toSQL()!)
      if (to) query.where('paid_at', '<=', to.toSQL()!)
      if (filters.status) query.where('status', filters.status)
      if (filters.branchId) query.where('branch_id', filters.branchId)
      const payments = await query
      const userIds = [
        ...new Set(
          payments.flatMap((payment) => [payment.recordedBy, payment.verifiedBy]).filter(Boolean)
        ),
      ] as string[]
      const users = userIds.length ? await User.query().whereIn('id', userIds) : []
      const who = (id: string | null) => {
        if (!id) return null
        const user = users.find((item) => item.id === id)
        return user?.fullName || user?.email || null
      }
      return {
        title: 'Payments',
        columns: [
          { header: 'Number', width: 18 },
          { header: 'Paid', kind: 'datetime' },
          { header: 'Type', width: 15 },
          { header: 'Method', width: 13 },
          { header: 'Status', width: 20 },
          { header: 'Amount (GHS)', kind: 'money' },
          { header: 'In / out', width: 8 },
          { header: 'Booking', width: 18 },
          { header: 'Customer', width: 24 },
          { header: 'Transaction ID', width: 18 },
          { header: 'Payer name', width: 20 },
          { header: 'Recorded by', width: 20 },
          { header: 'Verified by', width: 20 },
          { header: 'Void / reject reason', width: 30 },
        ],
        rows: payments.map((payment) => [
          payment.number,
          local(payment.paidAt),
          payment.type.replaceAll('_', ' '),
          payment.method === 'bank_transfer' ? 'bank transfer' : payment.method,
          payment.status.replaceAll('_', ' '),
          ghs(payment.amount),
          ['refund', 'deposit_refund'].includes(payment.type) ? 'out' : 'in',
          payment.booking?.reference,
          payment.customer?.fullName,
          payment.transactionRef,
          payment.payerName,
          payment.recordedBy ? who(payment.recordedBy) : 'Customer (online)',
          who(payment.verifiedBy),
          payment.voidReason,
        ]),
      }
    }

    if (type === 'customers') {
      const query = Customer.query()
        .whereNull('archived_at')
        .orderBy('created_at', 'asc')
        .limit(MAX_ROWS)
      if (from) query.where('created_at', '>=', from.toSQL()!)
      if (to) query.where('created_at', '<=', to.toSQL()!)
      if (filters.status) query.where('verification_status', filters.status)
      if (filters.branchId) query.where('branch_id', filters.branchId)
      const customers = await query
      const ids = customers.map((customer) => customer.id)
      const totals = ids.length
        ? await db
            .from('bookings')
            .whereIn('customer_id', ids)
            .whereNotIn('status', ['cancelled', 'expired', 'no_show', 'draft'])
            .groupBy('customer_id')
            .select('customer_id')
            .count('* as bookings')
            .sum('paid_amount as paid')
            .max('pickup_at as last')
        : []
      const of = (id: string) => totals.find((row) => row.customer_id === id)
      return {
        title: 'Customers',
        columns: [
          { header: 'Name', width: 26 },
          { header: 'Phone', width: 15 },
          { header: 'Email', width: 26 },
          { header: 'Type', width: 11 },
          { header: 'Source', width: 11 },
          { header: 'ID check', width: 12 },
          { header: 'Blacklist', width: 10 },
          { header: 'Added', kind: 'date' },
          { header: 'Bookings', kind: 'number', width: 9 },
          { header: 'Paid (GHS)', kind: 'money' },
          { header: 'Last pick-up', kind: 'date' },
          { header: 'Marketing OK', width: 12 },
        ],
        rows: customers.map((customer) => {
          const row = of(customer.id)
          return [
            customer.fullName,
            customer.phone,
            customer.email,
            customer.type,
            customer.source,
            customer.verificationStatus,
            customer.blacklistSeverity ?? '',
            local(customer.createdAt),
            Number(row?.bookings ?? 0),
            ghs(Number(row?.paid ?? 0)),
            row?.last ? DateTime.fromJSDate(new Date(row.last)).setZone(zone) : null,
            customer.marketingOptIn ? 'yes' : 'no',
          ]
        }),
      }
    }

    // cars
    const query = Car.query()
      .preload('category')
      .whereNull('archived_at')
      .orderBy('make')
      .limit(MAX_ROWS)
    if (filters.status) query.where('status', filters.status)
    if (filters.branchId) query.where('branch_id', filters.branchId)
    const cars = await query
    const ids = cars.map((car) => car.id)
    const stats = ids.length
      ? await db
          .from('bookings')
          .whereIn('car_id', ids)
          .whereIn('status', ['on_rent', 'returned', 'closed'])
          .if(from, (q) => q.where('pickup_at', '>=', from!.toSQL()!))
          .if(to, (q) => q.where('pickup_at', '<=', to!.toSQL()!))
          .groupBy('car_id')
          .select('car_id')
          .count('* as rentals')
          .sum('total_amount as revenue')
      : []
    const of = (id: string) => stats.find((row) => row.car_id === id)
    return {
      title: 'Cars',
      columns: [
        { header: 'Car', width: 24 },
        { header: 'Registration', width: 14 },
        { header: 'Category', width: 14 },
        { header: 'Year', kind: 'number', width: 7 },
        { header: 'Colour', width: 10 },
        { header: 'Status', width: 12 },
        { header: 'On the website', width: 13 },
        { header: 'Odometer (km)', kind: 'number' },
        { header: from || to ? 'Rentals in period' : 'Rentals', kind: 'number', width: 10 },
        { header: from || to ? 'Revenue in period (GHS)' : 'Revenue (GHS)', kind: 'money' },
      ],
      rows: cars.map((car) => {
        const row = of(car.id)
        return [
          car.publicTitle || `${car.make} ${car.model}`,
          car.registrationNo,
          car.category?.name,
          car.year,
          car.colour,
          car.status,
          car.isListedOnline ? 'yes' : 'no',
          car.currentOdometerKm,
          Number(row?.rentals ?? 0),
          ghs(Number(row?.revenue ?? 0)),
        ]
      }),
    }
  }

  /** The file: CSV (UTF-8 with BOM, so Excel opens it right) or a formatted XLSX. */
  static async file(sheet: Sheet, format: ExportFormat): Promise<Buffer> {
    if (format === 'csv') {
      const cell = (value: Cell, column: Column) => {
        if (value === null || value === undefined) return ''
        if (value instanceof DateTime) {
          return column.kind === 'date' ? value.toISODate()! : value.toFormat('yyyy-MM-dd HH:mm')
        }
        if (typeof value === 'number')
          return column.kind === 'money' ? value.toFixed(2) : String(value)
        return /[",\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
      }
      const lines = [
        sheet.columns.map((column) => cell(column.header, column)).join(','),
        ...sheet.rows.map((row) =>
          row.map((value, index) => cell(value, sheet.columns[index])).join(',')
        ),
      ]
      return Buffer.from(`${BOM}${lines.join('\r\n')}\r\n`, 'utf8')
    }

    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet(sheet.title, {
      views: [{ state: 'frozen', ySplit: 1 }],
    })
    worksheet.columns = sheet.columns.map((column) => ({
      header: column.header,
      width:
        column.width ?? (column.kind === 'money' ? 14 : column.kind?.startsWith('date') ? 17 : 12),
      style:
        column.kind === 'money'
          ? { numFmt: '#,##0.00' }
          : column.kind === 'datetime'
            ? { numFmt: 'yyyy-mm-dd hh:mm' }
            : column.kind === 'date'
              ? { numFmt: 'yyyy-mm-dd' }
              : {},
    }))
    for (const row of sheet.rows) {
      // Wall-clock dates as written (Excel has no time zones)
      worksheet.addRow(
        row.map((value) =>
          value instanceof DateTime
            ? new Date(Date.UTC(value.year, value.month - 1, value.day, value.hour, value.minute))
            : (value ?? null)
        )
      )
    }
    const header = worksheet.getRow(1)
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111111' } }
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: sheet.columns.length },
    }
    return Buffer.from(await workbook.xlsx.writeBuffer())
  }
}
