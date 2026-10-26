import { BaseTransformer } from '@adonisjs/core/transformers'
import type PricingRule from '#models/pricing_rule'

export type RuleTargetSummary = { id: string; label: string }

export default class PricingRuleTransformer extends BaseTransformer<PricingRule> {
  toObject() {
    const rule = this.resource
    return {
      id: rule.id,
      name: rule.name,
      type: rule.type,
      dateFrom: rule.dateFrom?.toISODate() ?? null,
      dateTo: rule.dateTo?.toISODate() ?? null,
      recursYearly: Boolean(rule.recursYearly),
      weekdays: rule.weekdays ?? [],
      adjustmentType: rule.adjustmentType,
      adjustmentValue: rule.adjustmentValue,
      appliesTo: rule.appliesTo,
      categoryIds: rule.categoryIds ?? [],
      carIds: rule.carIds ?? [],
      // Names for display, attached by the controller
      categories: (rule.$extras.categories as RuleTargetSummary[] | undefined) ?? [],
      cars: (rule.$extras.cars as RuleTargetSummary[] | undefined) ?? [],
      minRentalDays: rule.minRentalDays,
      priority: rule.priority,
      stackable: Boolean(rule.stackable),
      blockOnlineBooking: Boolean(rule.blockOnlineBooking),
      active: Boolean(rule.active),
      notes: rule.notes,
      createdBy: rule.createdBy,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    }
  }
}
