import vine from '@vinejs/vine'
import { FILE_PURPOSES } from '#models/file'

export const uploadFileMetadataValidator = vine.create({
  purpose: vine.enum(FILE_PURPOSES),
  attachableType: vine.string().maxLength(50).optional(),
  attachableId: vine.string().maxLength(26).optional(),
  isPrivate: vine.boolean().optional(),
})

export const getSignedUrlValidator = vine.create({
  expiresInSeconds: vine.number().min(60).max(86400).optional(),
})
