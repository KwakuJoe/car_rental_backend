import { BaseTransformer } from '@adonisjs/core/transformers'
import type AuditLog from '#models/audit_log'

export default class AuditLogTransformer extends BaseTransformer<AuditLog> {
  toObject() {
    return this.pick(this.resource, [
      'id',
      'userId',
      'actorType',
      'actorLabel',
      'action',
      'subjectType',
      'subjectId',
      'subjectLabel',
      'before',
      'after',
      'metadata',
      'ip',
      'userAgent',
      'createdAt',
    ])
  }
}
