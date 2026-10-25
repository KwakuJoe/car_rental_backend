import { BaseTransformer } from '@adonisjs/core/transformers'
import type VehicleDocument from '#models/vehicle_document'

export default class VehicleDocumentTransformer extends BaseTransformer<VehicleDocument> {
  toObject() {
    return {
      id: this.resource.id,
      carId: this.resource.carId,
      type: this.resource.type,
      documentNumber: this.resource.documentNumber,
      provider: this.resource.provider,
      coverType: this.resource.coverType,
      issuedOn: this.resource.issuedOn
        ? ((this.resource.issuedOn as any).toISODate?.() ?? String(this.resource.issuedOn))
        : null,
      expiresOn: this.resource.expiresOn
        ? ((this.resource.expiresOn as any).toISODate?.() ?? String(this.resource.expiresOn))
        : null,
      fileId: this.resource.fileId,
      notes: this.resource.notes,
      file: this.resource.file
        ? {
            id: this.resource.file.id,
            originalName: this.resource.file.originalName,
            mime: this.resource.file.mime,
            size: Number(this.resource.file.size),
            url: this.resource.$extras?.signedUrl ?? this.resource.file.url,
          }
        : null,
      signedUrl: this.resource.$extras?.signedUrl ?? null,
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
