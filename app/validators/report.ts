import vine from '@vinejs/vine'
import { EXPORT_FORMATS } from '#services/reports/export_service'

const date = () => vine.date({ formats: ['YYYY-MM-DD'] })

/** GET /admin/reports/overview - a period (business time zone; default: this month), optionally one branch */
export const reportRangeValidator = vine.create({
  dateFrom: date().optional(),
  dateTo: date().afterOrSameAs('dateFrom').optional(),
  branchId: vine.string().optional(),
})

/** GET /admin/exports/:type - dates optional (customers and cars can be exported whole) */
export const exportValidator = vine.create({
  format: vine.enum(EXPORT_FORMATS).optional(),
  dateFrom: date().optional(),
  dateTo: date().afterOrSameAs('dateFrom').optional(),
  status: vine.string().trim().maxLength(30).optional(),
  branchId: vine.string().optional(),
})
