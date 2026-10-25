import vine from '@vinejs/vine'
import { paginationFields } from '#validators/shared'

export const auditLogFilterValidator = vine.create({
  ...paginationFields,
  // matches action, subject label, actor label
  search: vine.string().optional(),
  userId: vine.string().optional(),
  // exact action (user.updated) or a module prefix (user.)
  action: vine.string().optional(),
  subjectType: vine.string().optional(),
  subjectId: vine.string().optional(),
  from: vine.date({ formats: ['YYYY-MM-DD'] }).optional(),
  to: vine.date({ formats: ['YYYY-MM-DD'] }).optional(),
  sortOrder: vine.enum(['asc', 'desc'] as const).optional(),
})
