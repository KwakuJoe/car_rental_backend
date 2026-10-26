import { BaseTransformer } from '@adonisjs/core/transformers'
import type Extra from '#models/extra'
import type ProtectionPlan from '#models/protection_plan'
import type DeliveryZone from '#models/delivery_zone'
import type Fee from '#models/fee'

export class ExtraTransformer extends BaseTransformer<Extra> {
  toObject() {
    const r = this.resource
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      chargeType: r.chargeType,
      amount: r.amount,
      maxQuantity: r.maxQuantity,
      stock: r.stock,
      taxable: Boolean(r.taxable),
      availableOnline: Boolean(r.availableOnline),
      sortOrder: r.sortOrder,
      active: Boolean(r.active),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }
  }
}

export class ProtectionPlanTransformer extends BaseTransformer<ProtectionPlan> {
  toObject() {
    const r = this.resource
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      perDayAmount: r.perDayAmount,
      excessAmount: r.excessAmount,
      depositAmountOverride: r.depositAmountOverride,
      isDefault: Boolean(r.isDefault),
      taxable: Boolean(r.taxable),
      availableOnline: Boolean(r.availableOnline),
      sortOrder: r.sortOrder,
      active: Boolean(r.active),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }
  }
}

export class DeliveryZoneTransformer extends BaseTransformer<DeliveryZone> {
  toObject() {
    const r = this.resource
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      deliveryAmount: r.deliveryAmount,
      collectionAmount: r.collectionAmount,
      afterHoursAmount: r.afterHoursAmount,
      availableOnline: Boolean(r.availableOnline),
      sortOrder: r.sortOrder,
      active: Boolean(r.active),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }
  }
}

export class FeeTransformer extends BaseTransformer<Fee> {
  toObject() {
    const r = this.resource
    return {
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description,
      unit: r.unit,
      amount: r.amount,
      taxable: Boolean(r.taxable),
      isSystem: Boolean(r.isSystem),
      sortOrder: r.sortOrder,
      active: Boolean(r.active),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }
  }
}
