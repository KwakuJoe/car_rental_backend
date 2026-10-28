import type { DateTime } from 'luxon'
import PricingRule from '#models/pricing_rule'
import { memo, PRICING_TTL } from '#services/memo'

export type RuleTargetCar = { categoryId: string; carId?: string | null }

export type AppliedRule = {
  id: string
  name: string
  adjustmentType: string
  adjustmentValue: number
  /** Signed pesewas this rule added to the day */
  change: number
  minRentalDays: number | null
}

export type DayAdjustment = {
  /** Day price after rules, never below 0 */
  amount: number
  applied: AppliedRule[]
}

// Breaks priority ties: the more specific kind of rule wins
const SPECIFICITY: Record<string, number> = { holiday: 3, season: 2, weekend: 1 }

/**
 * Seasonal / holiday / weekend price rules (M2.6), applied per calendar day of
 * a rental. The matching and adjusting are pure functions so the quote engine
 * can load the active rules once and apply them to every day.
 */
export class PricingRuleService {
  static activeRules(): Promise<PricingRule[]> {
    return memo('pricing:rules', PRICING_TTL, () => PricingRule.query().where('active', true))
  }

  /** Does the rule's calendar (dates / weekdays) include this day? */
  static coversDay(rule: PricingRule, day: DateTime): boolean {
    if (rule.type === 'weekend') {
      if (!rule.weekdays?.includes(day.weekday)) return false
      // Optional period limit
      return this.inRange(rule, day, true)
    }
    return this.inRange(rule, day, false)
  }

  private static inRange(rule: PricingRule, day: DateTime, openWhenEmpty: boolean): boolean {
    if (!rule.dateFrom) return openWhenEmpty
    const to = rule.dateTo ?? rule.dateFrom

    if (rule.recursYearly) {
      const d = day.toFormat('MM-dd')
      const f = rule.dateFrom.toFormat('MM-dd')
      const t = to.toFormat('MM-dd')
      // A range like 20 Dec - 5 Jan wraps the year end
      return f <= t ? d >= f && d <= t : d >= f || d <= t
    }

    const d = day.toISODate()!
    return d >= rule.dateFrom.toISODate()! && d <= to.toISODate()!
  }

  /** Does the rule apply to this car? */
  static appliesTo(rule: PricingRule, target: RuleTargetCar): boolean {
    if (rule.appliesTo === 'categories') return !!rule.categoryIds?.includes(target.categoryId)
    if (rule.appliesTo === 'cars') return !!target.carId && !!rule.carIds?.includes(target.carId)
    return true
  }

  /**
   * Adjust one day's base price. Among matching rules that don't stack, the
   * highest priority wins (ties: holiday > season > weekend, then newest).
   * Stackable rules are added on top. Every change is worked out on the base
   * price, so rules never compound, and the day never goes below 0.
   */
  static adjustDay(
    base: number,
    day: DateTime,
    rules: PricingRule[],
    target: RuleTargetCar
  ): DayAdjustment {
    const matching = rules.filter(
      (rule) => rule.active && this.coversDay(rule, day) && this.appliesTo(rule, target)
    )

    const winner = matching
      .filter((rule) => !rule.stackable)
      .sort(
        (a, b) =>
          b.priority - a.priority ||
          (SPECIFICITY[b.type] ?? 0) - (SPECIFICITY[a.type] ?? 0) ||
          b.createdAt.toMillis() - a.createdAt.toMillis()
      )[0]
    const chosen = [...(winner ? [winner] : []), ...matching.filter((rule) => rule.stackable)]

    const applied = chosen.map((rule) => ({
      id: rule.id,
      name: rule.name,
      adjustmentType: rule.adjustmentType,
      adjustmentValue: rule.adjustmentValue,
      change:
        rule.adjustmentType === 'percent'
          ? Math.round((base * rule.adjustmentValue) / 10_000)
          : rule.adjustmentValue,
      minRentalDays: rule.minRentalDays,
    }))

    const amount = Math.max(0, base + applied.reduce((sum, rule) => sum + rule.change, 0))
    return { amount, applied }
  }
}

export default PricingRuleService
