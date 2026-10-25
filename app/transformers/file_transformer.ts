import { BaseTransformer } from '@adonisjs/core/transformers'
import type File from '#models/file'

export default class FileTransformer extends BaseTransformer<File> {
  toObject() {
    return {
      id: this.resource.id,
      disk: this.resource.disk,
      path: this.resource.path,
      // Private files get no link here: callers must use GET /admin/files/:id/url,
      // which checks permissions and audits access to identity documents.
      url: this.resource.isPrivate ? null : this.resource.url,
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
