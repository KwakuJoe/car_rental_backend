import { BaseTransformer } from '@adonisjs/core/transformers'
import type Business from '#models/business'

export default class BusinessTransformer extends BaseTransformer<Business> {
  toObject() {
    return this.pick(this.resource, [
      'id',
      'name',
      'tradingName',
      'email',
      'phone',
      'whatsappPhone',
      'address',
      'digitalAddress',
      'city',
      'region',
      'tin',
      'vatRegistered',
      'vatNumber',
      'documentPrefix',
      'currency',
      'timezone',
      'createdAt',
      'updatedAt',
    ])
  }
}
