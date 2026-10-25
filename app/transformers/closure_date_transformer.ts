import { BaseTransformer } from '@adonisjs/core/transformers'
import type ClosureDate from '#models/closure_date'

export default class ClosureDateTransformer extends BaseTransformer<ClosureDate> {
  toObject() {
    return {
      id: this.resource.id,
      branchId: this.resource.branchId,
      date: this.resource.date.toISODate(),
      reason: this.resource.reason,
    }
  }
}
