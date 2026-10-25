import { BaseTransformer } from '@adonisjs/core/transformers'
import type Car from '#models/car'
import DocumentComplianceService from '#services/document_compliance_service'

export default class CarTransformer extends BaseTransformer<Car> {
  toObject() {
    const photos =
      this.resource.photos?.map((photo) => ({
        id: photo.id,
        fileId: photo.fileId,
        url: photo.file?.url ?? null,
        sortOrder: photo.sortOrder,
        isCover: Boolean(photo.isCover),
      })) ?? []

    const cover = photos.find((p) => p.isCover)?.url ?? photos[0]?.url ?? null

    return {
      id: this.resource.id,
      branchId: this.resource.branchId,
      categoryId: this.resource.categoryId,
      make: this.resource.make,
      model: this.resource.model,
      year: this.resource.year,
      colour: this.resource.colour,
      registrationNo: this.resource.registrationNo,
      vinChassisNo: this.resource.vinChassisNo,
      engineNo: this.resource.engineNo,
      transmission: this.resource.transmission,
      fuelType: this.resource.fuelType,
      fuelCapacityL: this.resource.fuelCapacityL,
      seats: this.resource.seats,
      doors: this.resource.doors,
      luggage: this.resource.luggage,
      features: this.resource.features ?? [],
      currentOdometerKm: this.resource.currentOdometerKm,
      purchaseDate: this.resource.purchaseDate ? this.resource.purchaseDate.toISODate() : null,
      purchaseAmount: this.resource.purchaseAmount ? Number(this.resource.purchaseAmount) : null,
      ownership: this.resource.ownership,
      publicTitle:
        this.resource.publicTitle ??
        `${this.resource.make} ${this.resource.model} ${this.resource.year}`,
      publicDescription: this.resource.publicDescription,
      isListedOnline: Boolean(this.resource.isListedOnline),
      status: this.resource.status,
      archivedAt: this.resource.archivedAt,
      category: this.resource.category
        ? {
            id: this.resource.category.id,
            name: this.resource.category.name,
            slug: this.resource.category.slug,
          }
        : undefined,
      branch: this.resource.branch
        ? {
            id: this.resource.branch.id,
            name: this.resource.branch.name,
            code: this.resource.branch.code,
          }
        : undefined,
      photos,
      coverPhotoUrl: cover,
      compliance: this.resource.documents
        ? DocumentComplianceService.computeCarCompliance(this.resource.documents)
        : undefined,
      createdAt: this.resource.createdAt,
      updatedAt: this.resource.updatedAt,
    }
  }
}
