import type { HttpContext } from '@adonisjs/core/http'
import File, { type FilePurpose } from '#models/file'
import FileService, { ImageImportError } from '#services/file_service'
import AuditService from '#services/audit_service'
import FileTransformer from '#transformers/file_transformer'
import {
  uploadFileMetadataValidator,
  getSignedUrlValidator,
  importFileFromUrlValidator,
} from '#validators/file'
import type User from '#models/user'

const FLEET_PURPOSES: string[] = ['car_photo', 'category_image', 'vehicle_document']

/** Role permission, with the user's per-user override taking precedence. Needs role.permissions loaded. */
function hasPermission(user: User, slug: string): boolean {
  const override = user.permissionsOverride?.[slug]
  if (override !== undefined) return override
  return !!user.role?.permissions.some((p) => p.slug === slug)
}

async function loadRole(user: User) {
  await user.load((preloader) =>
    preloader.load('role', (roleQuery) => roleQuery.preload('permissions'))
  )
}

const ID_PURPOSES: string[] = ['id_front', 'id_back', 'licence']
/** Signed links to ID scans live 5 minutes at most */
const ID_URL_TTL = 300

async function canAccessPrivateFile(user: User, file: File): Promise<boolean> {
  await loadRole(user)
  const role = user.role
  if (!role) return false
  if (role.isSuperAdmin) return true

  // Uploader can always access their uploaded file
  if (file.uploadedBy === user.id) return true

  const checkSlug = (slug: string) => hasPermission(user, slug)

  if (file.purpose === 'vehicle_document') {
    return checkSlug('fleet.view')
  }

  if (['id_front', 'id_back', 'licence'].includes(file.purpose)) {
    return checkSlug('customers.view_documents')
  }

  // A customer's handover signature: anyone who can see the booking
  if (file.purpose === 'signature') {
    return checkSlug('bookings.view')
  }

  // A MoMo/bank screenshot: whoever deals with payments
  // A receipt for an expense: whoever deals with expenses
  if (file.purpose === 'expense_receipt') {
    return checkSlug('expenses.view')
  }

  if (file.purpose === 'receipt_proof') {
    return checkSlug('payments.view')
  }

  return false
}

export default class FilesController {
  async upload(ctx: HttpContext) {
    const { auth, request, response } = ctx
    const user = auth.getUserOrFail()

    const payload = await request.validateUsing(uploadFileMetadataValidator)
    const purpose = payload.purpose as FilePurpose

    const isImagePurpose = [
      'car_photo',
      'category_image',
      'business_logo',
      'partner_logo',
      'inspection_photo',
      'signature',
    ].includes(purpose)
    // A receipt is a phone photo or a PDF
    const allowedExtensions =
      purpose === 'expense_receipt'
        ? [...FileService.IMAGE_EXTENSIONS, 'pdf']
        : isImagePurpose
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

  /**
   * Copy a public image from a pasted link into our storage (not hotlinked).
   */
  async importFromUrl(ctx: HttpContext) {
    const { auth, request, response } = ctx
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(importFileFromUrlValidator)

    let fileRecord: File
    try {
      fileRecord = await FileService.importFromUrl(payload.url, {
        purpose: payload.purpose,
        uploadedBy: user.id,
        attachableType: payload.attachableType ?? null,
        attachableId: payload.attachableId ?? null,
      })
    } catch (error) {
      if (error instanceof ImageImportError) {
        return response.unprocessableEntity({
          message: error.message,
          errors: [{ field: 'url', rule: 'image_import', message: error.message }],
        })
      }
      throw error
    }

    await AuditService.record(ctx, {
      action: 'file.imported',
      subject: { type: 'file', id: fileRecord.id, label: fileRecord.originalName },
      after: {
        id: fileRecord.id,
        purpose: fileRecord.purpose,
        originalName: fileRecord.originalName,
        mime: fileRecord.mime,
        size: Number(fileRecord.size),
      },
      metadata: { sourceUrl: payload.url },
    })

    return response.created({
      message: 'Image imported successfully',
      data: new FileTransformer(fileRecord).toObject(),
    })
  }

  async show({ auth, params, response }: HttpContext) {
    const file = await File.findOrFail(params.id)

    // Even the name of an identity document is personal data
    if (file.isPrivate && !(await canAccessPrivateFile(auth.getUserOrFail(), file))) {
      return response.forbidden({
        message: 'You do not have permission to access this private file',
      })
    }

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
      if (ID_PURPOSES.includes(file.purpose)) {
        await AuditService.record(ctx, {
          action: 'file.viewed_signed_url',
          subject: { type: 'file', id: file.id, label: file.originalName },
          metadata: { purpose: file.purpose, attachableId: file.attachableId },
        })
      }
    }

    // ID scans: a forwarded link must die quickly. The UI asks for a fresh one per view.
    const ttl = ID_PURPOSES.includes(file.purpose)
      ? Math.min(expiresInSeconds ?? ID_URL_TTL, ID_URL_TTL)
      : (expiresInSeconds ?? 3600)
    const url = FileService.getUrl(file, { expiresInSeconds: ttl })

    return response.ok({
      message: 'File URL generated',
      data: {
        id: file.id,
        url,
        isPrivate: file.isPrivate,
        expiresInSeconds: file.isPrivate ? ttl : null,
      },
    })
  }

  async destroy(ctx: HttpContext) {
    const { auth, params, response } = ctx
    const user = auth.getUserOrFail()
    const file = await File.findOrFail(params.id)

    await loadRole(user)
    const isSuperAdmin = user.role?.isSuperAdmin
    const isUploader = file.uploadedBy === user.id
    // fleet.manage covers fleet files only - never customers' identity documents
    const canManageFleetFile =
      FLEET_PURPOSES.includes(file.purpose) && hasPermission(user, 'fleet.manage')

    if (!isSuperAdmin && !isUploader && !canManageFleetFile) {
      return response.forbidden({
        message: 'You do not have permission to delete this file',
      })
    }
    // The uploader may only take back an upload that isn't part of a record
    // yet (ID scans, payment proofs and receipts are evidence once saved)
    if (!isSuperAdmin && !canManageFleetFile && (await FileService.inUse(file))) {
      return response.forbidden({
        message: 'This file is part of a saved record and can’t be deleted.',
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
