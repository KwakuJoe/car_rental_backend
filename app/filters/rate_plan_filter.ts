import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import type RatePlan from '#models/rate_plan'
import BaseFilter from '#filters/base_filter'

type RatePlanQuery = ModelQueryBuilderContract<typeof RatePlan>

export default class RatePlanFilter extends BaseFilter<typeof RatePlan> {
  apply(): RatePlanQuery {
    for (const [param, column] of [
      ['categoryId', 'category_id'],
      ['carId', 'car_id'],
      ['driveType', 'drive_type'],
      ['active', 'active'],
    ]) {
      const value = this.get(param)
      if (value !== undefined && value !== null) this.query = this.query.where(column, value) as any
    }
    if (this.get('scope') === 'category') this.query = this.query.whereNull('car_id') as any
    if (this.get('scope') === 'car') this.query = this.query.whereNotNull('car_id') as any

    // Category plans first, then car overrides; newest dates first within each
    this.query = this.query
      .orderByRaw('car_id IS NOT NULL')
      .orderBy('drive_type', 'asc')
      .orderByRaw('effective_from DESC NULLS LAST') as any
    return this.query as RatePlanQuery
  }
}
