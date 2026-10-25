import { BaseTransformer } from '@adonisjs/core/transformers'
import type Category from '#models/category'

export default class CategoryTransformer extends BaseTransformer<Category> {
  toObject() {
    return {
      id: this.resource.id,
      name: this.resource.name,
      slug: this.resource.slug,
      description: this.resource.description,
      image: this.resource.image,
      seats: this.resource.seats,
      defaultDepositAmount: this.resource.defaultDepositAmount,
      selfDriveAllowed: Boolean(this.resource.selfDriveAllowed),
      minDriverAgeOverride: this.resource.minDriverAgeOverride,
      sortOrder: this.resource.sortOrder,
      active: Boolean(this.resource.active),
      carsCount: this.resource.$extras?.cars_count
        ? Number(this.resource.$extras.cars_count)
        : undefined,
      createdAt: this.resource.createdAt,
      updatedAt: this.resource.updatedAt,
    }
  }
}
