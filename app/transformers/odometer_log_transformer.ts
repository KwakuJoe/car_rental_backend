import { BaseTransformer } from '@adonisjs/core/transformers'
import type OdometerLog from '#models/odometer_log'

export default class OdometerLogTransformer extends BaseTransformer<OdometerLog> {
  toObject() {
    return {
      id: this.resource.id,
      carId: this.resource.carId,
      previousKm: this.resource.previousKm,
      newKm: this.resource.newKm,
      source: this.resource.source,
      reason: this.resource.reason,
      recordedBy: this.resource.recordedBy,
      recorderName: this.resource.recorder?.fullName ?? null,
      createdAt: this.resource.createdAt,
    }
  }
}
