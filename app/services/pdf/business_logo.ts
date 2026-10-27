import { v2 as cloudinary } from 'cloudinary'
import logger from '@adonisjs/core/services/logger'
import type File from '#models/file'

/** The last logo fetched; it changes rarely, so documents don't refetch it each time. */
let cached: { fileId: string; buffer: Buffer } | null = null

/**
 * The PNG rendition of an image file. PDFKit embeds PNG and JPEG only, and a
 * logo may have been uploaded as WebP; Cloudinary converts it on delivery.
 */
function pngUrl(file: File) {
  if (file.disk !== 'cloudinary' || !cloudinary.config().cloud_name) return file.url
  return cloudinary.utils.url(file.path, {
    secure: true,
    format: 'png',
    transformation: [{ width: 600, height: 600, crop: 'limit' }],
  })
}

/** The business logo as PNG bytes for a document, or null (the header falls back to initials). */
export async function logoBuffer(file: File | null | undefined): Promise<Buffer | null> {
  if (!file) return null
  if (cached?.fileId === file.id) return cached.buffer
  try {
    const response = await fetch(pngUrl(file), { signal: AbortSignal.timeout(5000) })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const buffer = Buffer.from(await response.arrayBuffer())
    cached = { fileId: file.id, buffer }
    return buffer
  } catch (error) {
    logger.warn({ fileId: file.id, error: (error as Error).message }, 'Business logo fetch failed')
    return null
  }
}
