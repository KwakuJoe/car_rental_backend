import { BaseTransformer } from '@adonisjs/core/transformers'
import type RatePlan from '#models/rate_plan'

export default class RatePlanTransformer extends BaseTransformer<RatePlan> {
  toObject() {
    const plan = this.resource
    return {
      id: plan.id,
      categoryId: plan.categoryId,
      category: plan.category ? { id: plan.category.id, name: plan.category.name } : null,
      carId: plan.carId,
      car: plan.car
        ? {
            id: plan.car.id,
            make: plan.car.make,
            model: plan.car.model,
            year: plan.car.year,
            registrationNo: plan.car.registrationNo,
          }
        : null,
      driveType: plan.driveType,
      dailyAmount: plan.dailyAmount,
      weeklyAmount: plan.weeklyAmount,
      monthlyAmount: plan.monthlyAmount,
      mileageMode: plan.mileageMode,
      includedKmPerDay: plan.includedKmPerDay,
      excessKmAmount: plan.excessKmAmount,
      outOfTownDailyAmount: plan.outOfTownDailyAmount,
      driverOvernightAmount: plan.driverOvernightAmount,
      driverHoursPerDay: plan.driverHoursPerDay,
      driverOvertimeHourAmount: plan.driverOvertimeHourAmount,
      fuelIncluded: Boolean(plan.fuelIncluded),
      effectiveFrom: plan.effectiveFrom?.toISODate() ?? null,
      effectiveTo: plan.effectiveTo?.toISODate() ?? null,
      active: Boolean(plan.active),
      notes: plan.notes,
      createdBy: plan.createdBy,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    }
  }
}
