import { BaseTransformer } from '@adonisjs/core/transformers'
import type VehicleDocument from '#models/vehicle_document'
import FileService from '#services/file_service'

export default class VehicleDocumentTransformer extends BaseTransformer<VehicleDocument> {
  toObject() {
    // Always go through FileService: private documents need a signed URL,
    // the stored URL alone doesn't open.
    const fileUrl = this.resource.file
      ? (this.resource.$extras?.signedUrl ?? FileService.getUrl(this.resource.file))
      : null

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
            url: fileUrl,
          }
        : null,
      signedUrl: fileUrl,
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
