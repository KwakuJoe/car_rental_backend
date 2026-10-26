import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import type PricingRule from '#models/pricing_rule'
import BaseFilter from '#filters/base_filter'

type PricingRuleQuery = ModelQueryBuilderContract<typeof PricingRule>

export default class PricingRuleFilter extends BaseFilter<typeof PricingRule> {
  apply(): PricingRuleQuery {
    const search = this.get('search')
    if (search) this.query = this.query.whereILike('name', `%${search}%`) as any
    for (const [param, column] of [
      ['type', 'type'],
      ['active', 'active'],
    ]) {
      const value = this.get(param)
      if (value !== undefined && value !== null) this.query = this.query.where(column, value) as any
    }
    // Active first, then by when they start (weekend rules without dates last), priority
    this.query = this.query
      .orderBy('active', 'desc')
      .orderByRaw('date_from ASC NULLS LAST')
      .orderBy('priority', 'desc') as any
    return this.query as PricingRuleQuery
  }
}
