import type { HttpContext } from '@adonisjs/core/http'
import AuditLog from '#models/audit_log'
import AuditLogTransformer from '#transformers/audit_log_transformer'
import { auditLogFilterValidator } from '#validators/audit_log'

/** Read-only - there is deliberately no way to edit or delete audit entries. */
export default class AuditLogsController {
  async index({ request, response, serialize }: HttpContext) {
    const filters = await request.validateUsing(auditLogFilterValidator)

    const query = AuditLog.query()
      .orderBy('created_at', filters.sortOrder ?? 'desc')
      .orderBy('id', 'desc')
    if (filters.search) {
      const term = `%${filters.search}%`
      query.where((q) => {
        q.whereILike('action', term)
          .orWhereILike('subject_label', term)
          .orWhereILike('actor_label', term)
      })
    }
    if (filters.userId) query.where('user_id', filters.userId)
    if (filters.action) {
      if (filters.action.endsWith('.')) query.whereILike('action', `${filters.action}%`)
      else query.where('action', filters.action)
    }
    if (filters.subjectType) query.where('subject_type', filters.subjectType)
    if (filters.subjectId) query.where('subject_id', filters.subjectId)
    if (filters.from) query.where('created_at', '>=', filters.from.startOf('day').toSQL()!)
    if (filters.to) query.where('created_at', '<=', filters.to.endOf('day').toSQL()!)

    const logs = await query.paginate(filters.page ?? 1, filters.limit ?? 20)
    const transformed = await serialize(AuditLogTransformer.paginate(logs.all(), logs.getMeta()))
    return response.ok({
      message: 'Audit log fetched successfully',
      data: transformed.data,
      meta: transformed.metadata,
    })
  }

  async show({ params, response, serialize }: HttpContext) {
    const log = await AuditLog.findOrFail(params.id)
    const transformed = await serialize(AuditLogTransformer.transform(log))
    return response.ok({ message: 'Audit entry fetched successfully', data: transformed.data })
  }
}
