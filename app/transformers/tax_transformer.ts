import { BaseTransformer } from '@adonisjs/core/transformers'
import type Tax from '#models/tax'

export default class TaxTransformer extends BaseTransformer<Tax> {
  toObject() {
    const tax = this.resource
    return {
      id: tax.id,
      name: tax.name,
      description: tax.description,
      rateBp: tax.rateBp,
      calculation: tax.calculation,
      appliesTo: tax.appliesTo ?? [],
      effectiveFrom: tax.effectiveFrom?.toISODate() ?? null,
      effectiveTo: tax.effectiveTo?.toISODate() ?? null,
      sortOrder: tax.sortOrder,
      active: Boolean(tax.active),
      createdAt: tax.createdAt,
      updatedAt: tax.updatedAt,
    }
  }
}
