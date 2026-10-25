import type { HttpContext } from '@adonisjs/core/http'
import File, { type FilePurpose } from '#models/file'
import FileService from '#services/file_service'
import AuditService from '#services/audit_service'
import FileTransformer from '#transformers/file_transformer'
import { uploadFileMetadataValidator, getSignedUrlValidator } from '#validators/file'
import type User from '#models/user'

async function canAccessPrivateFile(user: User, file: File): Promise<boolean> {
  await user.load((preloader) =>
    preloader.load('role', (roleQuery) => roleQuery.preload('permissions'))
  )
  const role = user.role
  if (!role) return false
  if (role.isSuperAdmin) return true

  // Uploader can always access their uploaded file
  if (file.uploadedBy === user.id) return true

  const checkSlug = (slug: string) => {
    const override = user.permissionsOverride?.[slug]
    if (override !== undefined) return override
    return role.permissions.some((p) => p.slug === slug)
  }

  if (file.purpose === 'vehicle_document') {
    return checkSlug('fleet.view')
  }

  if (['id_front', 'id_back', 'licence'].includes(file.purpose)) {
    return checkSlug('customers.view_documents')
  }

  return false
}

export default class FilesController {
  async upload(ctx: HttpContext) {
    const { auth, request, response } = ctx
    const user = auth.getUserOrFail()

    const payload = await request.validateUsing(uploadFileMetadataValidator)
    const purpose = payload.purpose as FilePurpose

    const isImagePurpose = ['car_photo', 'category_image', 'business_logo'].includes(purpose)
    const allowedExtensions = isImagePurpose
      ? FileService.IMAGE_EXTENSIONS
      : FileService.DOCUMENT_EXTENSIONS
    const maxSize = isImagePurpose ? FileService.MAX_IMAGE_SIZE : FileService.MAX_DOCUMENT_SIZE

    const file = request.file('file', {
      size: maxSize,
      extnames: allowedExtensions,
    })

    if (!file) {
      return response.badRequest({
        message: 'No file provided. Send as multipart/form-data with field name "file".',
      })
    }

    if (!file.isValid) {
      return response.unprocessableEntity({
        message: 'Invalid file upload',
        errors: file.errors,
      })
    }

    const fileRecord = await FileService.upload(file, {
      purpose,
      uploadedBy: user.id,
      attachableType: payload.attachableType ?? null,
      attachableId: payload.attachableId ?? null,
      isPrivate: payload.isPrivate,
    })

    await AuditService.record(ctx, {
      action: 'file.uploaded',
      subject: { type: 'file', id: fileRecord.id, label: fileRecord.originalName },
      after: {
        id: fileRecord.id,
        purpose: fileRecord.purpose,
        originalName: fileRecord.originalName,
        mime: fileRecord.mime,
        size: Number(fileRecord.size),
        isPrivate: fileRecord.isPrivate,
      },
    })

    return response.created({
      message: 'File uploaded successfully',
      data: new FileTransformer(fileRecord).toObject(),
    })
  }

  async show({ params, response }: HttpContext) {
    const file = await File.findOrFail(params.id)

    return response.ok({
      message: 'File fetched successfully',
      data: new FileTransformer(file).toObject(),
    })
  }

  async signedUrl(ctx: HttpContext) {
    const { auth, params, request, response } = ctx
    const user = auth.getUserOrFail()
    const file = await File.findOrFail(params.id)

    const { expiresInSeconds } = await request.validateUsing(getSignedUrlValidator)

    if (file.isPrivate) {
      const allowed = await canAccessPrivateFile(user, file)
      if (!allowed) {
        return response.forbidden({
          message: 'You do not have permission to access this private file',
        })
      }

      // Sensitive identity documents access is audited under Act 843 compliance
      if (['id_front', 'id_back', 'licence'].includes(file.purpose)) {
        await AuditService.record(ctx, {
          action: 'file.viewed_signed_url',
          subject: { type: 'file', id: file.id, label: file.originalName },
          metadata: { purpose: file.purpose, attachableId: file.attachableId },
        })
      }
    }

    const url = FileService.getUrl(file, { expiresInSeconds })

    return response.ok({
      message: 'File URL generated',
      data: {
        id: file.id,
        url,
        isPrivate: file.isPrivate,
        expiresInSeconds: file.isPrivate ? (expiresInSeconds ?? 3600) : null,
      },
    })
  }

  async destroy(ctx: HttpContext) {
    const { auth, params, response } = ctx
    const user = auth.getUserOrFail()
    const file = await File.findOrFail(params.id)

    await user.load((preloader) =>
      preloader.load('role', (roleQuery) => roleQuery.preload('permissions'))
    )
    const isSuperAdmin = user.role?.isSuperAdmin
    const isUploader = file.uploadedBy === user.id
    const hasFleetManage = user.role?.permissions.some((p) => p.slug === 'fleet.manage')

    if (!isSuperAdmin && !isUploader && !hasFleetManage) {
      return response.forbidden({
        message: 'You do not have permission to delete this file',
      })
    }

    await AuditService.record(ctx, {
      action: 'file.deleted',
      subject: { type: 'file', id: file.id, label: file.originalName },
      before: {
        id: file.id,
        path: file.path,
        purpose: file.purpose,
        originalName: file.originalName,
      },
    })

    await FileService.delete(file)

    return response.ok({
      message: 'File deleted successfully',
    })
  }
}
