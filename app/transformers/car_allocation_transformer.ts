import { BaseTransformer } from '@adonisjs/core/transformers'
import type CarAllocation from '#models/car_allocation'

export default class CarAllocationTransformer extends BaseTransformer<CarAllocation> {
  toObject() {
    return {
      id: this.resource.id,
      carId: this.resource.carId,
      bookingId: this.resource.bookingId,
      source: this.resource.source,
      reason: this.resource.reason,
      startsAt: this.resource.startsAt,
      endsAt: this.resource.endsAt,
      endsAtWithBuffer: this.resource.endsAtWithBuffer,
      bufferMinutes: this.resource.bufferMinutes,
      active: this.resource.active,
      createdBy: this.resource.createdBy,
      creator: this.resource.creator
        ? {
            id: this.resource.creator.id,
            fullName: this.resource.creator.fullName,
            email: this.resource.creator.email,
          }
        : undefined,
      createdAt: this.resource.createdAt,
      updatedAt: this.resource.updatedAt,
    }
  }
}
