import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import AuditService from '#services/audit_service'
import ExportService, {
  EXPORT_TYPES,
  EXPORT_VIEW_PERMISSION,
  MAX_ROWS,
  type ExportType,
} from '#services/reports/export_service'
import ReportService from '#services/reports/report_service'
import { exportValidator, reportRangeValidator } from '#validators/report'
import { userCan } from '#helpers/permissions'

/** Reports (reports.view; money with reports.financial) and CSV / Excel exports (exports.run). */
export default class ReportsController {
  async overview({ auth, request, response }: HttpContext) {
    const payload = await request.validateUsing(reportRangeValidator)
    const user = auth.getUserOrFail()
    // Default: this month so far
    const thisMonth = DateTime.now().setZone('Africa/Accra')
    const data = await ReportService.overview(
      {
        dateFrom: payload.dateFrom?.toISODate() ?? thisMonth.startOf('month').toISODate()!,
        dateTo: payload.dateTo?.toISODate() ?? thisMonth.toISODate()!,
        branchId: payload.branchId,
      },
      await userCan(user, 'reports.financial')
    )
    return response.ok({ message: 'Report ready', data })
  }

  /** The file itself - CSV or XLSX - with the same filters as the lists. */
  async export(ctx: HttpContext) {
    const { auth, params, request, response } = ctx
    const type = params.type as ExportType
    if (!EXPORT_TYPES.includes(type)) return response.notFound({ message: 'Unknown export' })
    const user = auth.getUserOrFail()
    if (!(await userCan(user, EXPORT_VIEW_PERMISSION[type]))) {
      return response.forbidden({ message: `You can't see ${type}, so you can't export them.` })
    }
    const payload = await request.validateUsing(exportValidator)
    const filters = {
      dateFrom: payload.dateFrom?.toISODate() ?? null,
      dateTo: payload.dateTo?.toISODate() ?? null,
      status: payload.status ?? null,
      branchId: payload.branchId ?? null,
    }
    const format = payload.format ?? 'xlsx'
    const sheet = await ExportService.sheet(type, filters)
    const file = await ExportService.file(sheet, format)
    await AuditService.record(ctx, {
      action: 'export.downloaded',
      subject: { type: 'export', id: type, label: `${sheet.title} (${format.toUpperCase()})` },
      metadata: { ...filters, rows: sheet.rows.length, truncated: sheet.rows.length >= MAX_ROWS },
    })
    const period =
      filters.dateFrom || filters.dateTo
        ? `-${filters.dateFrom ?? 'start'}-to-${filters.dateTo ?? 'today'}`
        : ''
    response.header(
      'Content-Type',
      format === 'csv'
        ? 'text/csv; charset=utf-8'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response.header('Content-Disposition', `attachment; filename="${type}${period}.${format}"`)
    return response.send(file)
  }
}
