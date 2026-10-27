import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary'
import env from '#start/env'
import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'
import File, { type FilePurpose, PRIVATE_PURPOSES } from '#models/file'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { MultipartFile } from '@adonisjs/core/bodyparser'

// Configure Cloudinary if credentials are present
const cloudName = env.get('CLOUDINARY_CLOUD_NAME')
const apiKey = env.get('CLOUDINARY_API_KEY')
const apiSecret = env.get('CLOUDINARY_API_SECRET')?.release()

if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  })
}

export interface UploadOptions {
  purpose: FilePurpose
  uploadedBy?: string | null
  attachableType?: string | null
  attachableId?: string | null
  isPrivate?: boolean
  folder?: string
}

export interface UploadResult {
  url: string
  publicId: string
  width?: number
  height?: number
  format?: string
  bytes: number
  resourceType: string
}

export type MockUploader = (file: MultipartFile, options: UploadOptions) => Promise<UploadResult>
export type MockUrlImporter = (url: string, options: UploadOptions) => Promise<UploadResult>

/**
 * The image at a pasted link could not be imported (unreachable, not an image,
 * unsupported format). The message is safe to show to staff.
 */
export class ImageImportError extends Error {}

export class FileService {
  private static mockUploader: MockUploader | null = null
  private static mockUrlImporter: MockUrlImporter | null = null

  /**
   * Allowed MIME types and extensions.
   */
  static readonly IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'avif']
  static readonly DOCUMENT_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png']
  static readonly MAX_IMAGE_SIZE = '8mb'
  static readonly MAX_DOCUMENT_SIZE = '10mb'

  /**
   * Set a mock uploader for testing.
   */
  static setMockUploader(mock: MockUploader | null) {
    this.mockUploader = mock
  }

  /**
   * Set a mock link importer for testing.
   */
  static setMockUrlImporter(mock: MockUrlImporter | null) {
    this.mockUrlImporter = mock
  }

  /**
   * Determine whether a given purpose is private by default.
   */
  static isPrivatePurpose(purpose: FilePurpose): boolean {
    return PRIVATE_PURPOSES.includes(purpose)
  }

  /**
   * Upload a multipart file to Cloudinary and record it in the files table.
   */
  static async upload(
    file: MultipartFile,
    options: UploadOptions,
    trx?: TransactionClientContract
  ): Promise<File> {
    // Identity and vehicle documents are always private (Act 843); other files may opt in.
    const isPrivate = this.isPrivatePurpose(options.purpose) || options.isPrivate === true
    const folder = options.folder ?? `wynk/${options.purpose}`
    const mime = `${file.type}/${file.subtype}`

    let uploadResult: UploadResult

    if (this.mockUploader) {
      uploadResult = await this.mockUploader(file, options)
    } else {
      const isImage = file.type === 'image'
      const resourceType = isImage ? 'image' : 'raw'

      const uploadOptions: Record<string, unknown> = {
        folder,
        resource_type: resourceType,
        type: isPrivate ? 'authenticated' : 'upload',
      }

      if (isImage) {
        uploadOptions.transformation = [
          { width: 1920, height: 1080, crop: 'limit' },
          { quality: 'auto' },
          { fetch_format: 'auto' },
        ]
      }

      const result: UploadApiResponse = await cloudinary.uploader.upload(
        file.tmpPath!,
        uploadOptions
      )

      uploadResult = {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
        resourceType: result.resource_type,
      }
    }

    const fileRecord = await File.create(
      {
        disk: 'cloudinary',
        path: uploadResult.publicId,
        url: uploadResult.url,
        originalName: file.clientName,
        mime,
        size: uploadResult.bytes || file.size,
        uploadedBy: options.uploadedBy ?? null,
        attachableType: options.attachableType ?? null,
        attachableId: options.attachableId ?? null,
        purpose: options.purpose,
        isPrivate,
        metadata: {
          width: uploadResult.width,
          height: uploadResult.height,
          format: uploadResult.format,
          resourceType: uploadResult.resourceType,
        },
      },
      trx ? { client: trx } : undefined
    )

    return fileRecord
  }

  /**
   * Import a public image from a pasted link and record it in the files table.
   *
   * Cloudinary fetches the link itself, so our server never requests a
   * user-supplied address. The image is copied (and resized like uploads), so
   * it keeps working if the original is moved or deleted.
   */
  static async importFromUrl(
    url: string,
    options: UploadOptions,
    trx?: TransactionClientContract
  ): Promise<File> {
    const folder = options.folder ?? `wynk/${options.purpose}`
    let uploadResult: UploadResult

    if (this.mockUrlImporter) {
      uploadResult = await this.mockUrlImporter(url, options)
    } else {
      let result: UploadApiResponse
      try {
        result = await cloudinary.uploader.upload(url, {
          folder,
          resource_type: 'image',
          type: 'upload',
          allowed_formats: this.IMAGE_EXTENSIONS,
          transformation: [
            { width: 1920, height: 1080, crop: 'limit' },
            { quality: 'auto' },
            { fetch_format: 'auto' },
          ],
        })
      } catch (error) {
        const reason =
          (error as { error?: { message?: string } })?.error?.message ??
          (error as Error)?.message ??
          ''
        logger.warn({ url, reason }, 'Image import from link failed')
        throw new ImageImportError(this.importErrorMessage(reason))
      }

      uploadResult = {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
        resourceType: result.resource_type,
      }
    }

    const format = uploadResult.format ?? 'jpg'

    return File.create(
      {
        disk: 'cloudinary',
        path: uploadResult.publicId,
        url: uploadResult.url,
        originalName: this.nameFromUrl(url, format),
        mime: `image/${format === 'jpg' ? 'jpeg' : format}`,
        size: uploadResult.bytes,
        uploadedBy: options.uploadedBy ?? null,
        attachableType: options.attachableType ?? null,
        attachableId: options.attachableId ?? null,
        purpose: options.purpose,
        isPrivate: false,
        metadata: {
          width: uploadResult.width,
          height: uploadResult.height,
          format: uploadResult.format,
          resourceType: uploadResult.resourceType,
          sourceUrl: url,
        },
      },
      trx ? { client: trx } : undefined
    )
  }

  /** Turn Cloudinary's fetch error into something staff can act on. */
  static importErrorMessage(reason: string): string {
    if (/HTML response/i.test(reason)) {
      return 'That link opens a web page, not an image. Right-click the image and choose “Copy image address”.'
    }
    if (/format/i.test(reason)) {
      return 'That link is not a supported image. Use a JPG, PNG or WebP image.'
    }
    if (/\b(401|403|429)\b/.test(reason)) {
      return 'That website does not allow its images to be copied. Download the image and upload it instead.'
    }
    if (/not found|DNS/i.test(reason)) {
      return 'Nothing was found at that link. Check it is complete and still works.'
    }
    return 'We could not get an image from that link. Try again, or download the image and upload it.'
  }

  /** "https://x.com/a/red%20car.png?w=2" -> "red car.png" */
  private static nameFromUrl(url: string, format: string): string {
    let name = ''
    try {
      name = decodeURIComponent(new URL(url).pathname.split('/').pop() ?? '')
    } catch {}
    name = name.trim().slice(0, 200)
    return name || `image-from-link.${format}`
  }

  /**
   * Get accessible URL for a file.
   * If public, returns the CDN URL directly.
   * If private, a download link through Cloudinary's API that stops working
   * at `expiresAt` (401 after). Never use a signed delivery URL
   * (`/authenticated/s--sig--/`) or the stored `url` for private files: those
   * ignore expiry and work for ever - checked against Cloudinary 2026-10-27.
   */
  static getUrl(file: File, options: { expiresInSeconds?: number } = {}): string {
    if (!file.isPrivate) {
      return file.url
    }

    const expiresInSeconds = options.expiresInSeconds ?? 3600 // 1 hour default
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds
    const resourceType =
      (file.metadata?.resourceType as string) ?? (file.mime.startsWith('image/') ? 'image' : 'raw')

    if (cloudName && apiSecret) {
      // Raw files (PDFs) keep the extension in their public ID; images come back in their own format
      return cloudinary.utils.private_download_url(file.path, '', {
        type: 'authenticated',
        resource_type: resourceType,
        expires_at: expiresAt,
        attachment: false,
      })
    }

    // Fallback if cloudinary config is not present
    return `${file.url}?expires_at=${expiresAt}&signature=mock_signed_url`
  }

  /**
   * Attach a previously uploaded file to an entity.
   */
  static async attach(
    fileId: string,
    attachableType: string,
    attachableId: string,
    trx?: TransactionClientContract
  ): Promise<File> {
    const file = await File.findOrFail(fileId, trx ? { client: trx } : undefined)
    file.attachableType = attachableType
    file.attachableId = attachableId
    if (trx) {
      file.useTransaction(trx)
    }
    await file.save()
    return file
  }

  /**
   * Delete private document uploads (ID scans, licences, vehicle documents,
   * payment proofs)
   * that were never attached to a record and are older than the cut-off.
   * Returns how many were deleted. Used by `node ace files:cleanup`.
   */
  static async deleteUnattached(options: { olderThanHours: number }): Promise<number> {
    const cutoff = DateTime.now().minus({ hours: options.olderThanHours })
    const orphans = await File.query()
      .whereNull('attachable_id')
      .whereIn('purpose', ['id_front', 'id_back', 'licence', 'vehicle_document', 'receipt_proof'])
      .where('created_at', '<', cutoff.toSQL()!)
    for (const file of orphans) await this.delete(file)
    return orphans.length
  }

  /**
   * Delete a file from Cloudinary and the database.
   */
  static async delete(file: File, trx?: TransactionClientContract): Promise<void> {
    if (!this.mockUploader && cloudName && apiSecret) {
      const resourceType =
        (file.metadata?.resourceType as string) ??
        (file.mime.startsWith('image/') ? 'image' : 'raw')
      try {
        await cloudinary.uploader.destroy(file.path, {
          resource_type: resourceType,
          type: file.isPrivate ? 'authenticated' : 'upload',
        })
      } catch (error) {
        // Log destruction error but continue to remove DB record
        console.error(`Failed to delete Cloudinary asset ${file.path}:`, error)
      }
    }

    if (trx) {
      file.useTransaction(trx)
    }
    await file.delete()
  }
}

export default FileService
