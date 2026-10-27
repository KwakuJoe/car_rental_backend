import { BaseTransformer } from '@adonisjs/core/transformers'
import type Business from '#models/business'

export default class BusinessTransformer extends BaseTransformer<Business> {
  toObject() {
    const fields = this.pick(this.resource, [
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
      'momoNumber',
      'momoName',
      'momoNetwork',
      'bankName',
      'bankAccountName',
      'bankAccountNumber',
      'bankBranch',
      'instagramUrl',
      'facebookUrl',
      'tiktokUrl',
      'xUrl',
      'currency',
      'timezone',
      'createdAt',
      'updatedAt',
    ])
    return {
      ...fields,
      logoUrl: this.resource.logo?.url ?? null,
      coverUrl: this.resource.cover?.url ?? null,
      partners: this.resource.partners ?? [],
    }
  }
}
