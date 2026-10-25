import { BaseTransformer } from '@adonisjs/core/transformers'
import type File from '#models/file'
import FileService from '#services/file_service'

export default class FileTransformer extends BaseTransformer<File> {
  toObject() {
    return {
      id: this.resource.id,
      disk: this.resource.disk,
      path: this.resource.path,
      url: FileService.getUrl(this.resource),
      originalName: this.resource.originalName,
      mime: this.resource.mime,
      size: Number(this.resource.size),
      uploadedBy: this.resource.uploadedBy,
      attachableType: this.resource.attachableType,
      attachableId: this.resource.attachableId,
      purpose: this.resource.purpose,
      isPrivate: Boolean(this.resource.isPrivate),
      metadata: this.resource.metadata,
      createdAt: this.resource.createdAt,
      updatedAt: this.resource.updatedAt,
    }
  }
}
