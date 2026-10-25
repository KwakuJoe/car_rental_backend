import type { DateTime } from 'luxon'
import RatePlan, { type DriveType } from '#models/rate_plan'

export class RateService {
  /**
   * The rate plan that prices `carId` on day `on`: the car's own plan if it
   * has one, otherwise its category's plan. The exclusion constraint
   * guarantees at most one active match per slot. Null = no price set.
   */
  static async resolve(params: {
    categoryId: string
    carId?: string | null
    driveType: DriveType
    on: DateTime
  }): Promise<RatePlan | null> {
    const day = params.on.toISODate()!
    const query = RatePlan.query()
      .where('category_id', params.categoryId)
      .where('drive_type', params.driveType)
      .where('active', true)
      .where((q) => q.whereNull('effective_from').orWhere('effective_from', '<=', day))
      .where((q) => q.whereNull('effective_to').orWhere('effective_to', '>=', day))

    if (params.carId) {
      query.where((q) => q.where('car_id', params.carId!).orWhereNull('car_id'))
    } else {
      query.whereNull('car_id')
    }

    // Car override (car_id set) before the category plan
    return query.orderByRaw('car_id IS NULL').first()
  }
}

export default RateService
