import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary'
import env from '#start/env'
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

export class FileService {
  private static mockUploader: MockUploader | null = null

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
    const isPrivate = options.isPrivate ?? this.isPrivatePurpose(options.purpose)
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
   * Get accessible URL for a file.
   * If public, returns the CDN URL directly.
   * If private, generates a short-lived signed delivery URL.
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
      return cloudinary.utils.url(file.path, {
        sign_url: true,
        type: 'authenticated',
        resource_type: resourceType,
        expires_at: expiresAt,
        secure: true,
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
