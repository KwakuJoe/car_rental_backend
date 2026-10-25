import vine from '@vinejs/vine'

export const DOCUMENT_TYPES = [
  'roadworthy',
  'insurance',
  'registration',
  'income_tax_sticker',
  'other',
] as const

export const createVehicleDocumentValidator = vine.compile(
  vine.object({
    type: vine.enum(DOCUMENT_TYPES),
    documentNumber: vine.string().trim().maxLength(100).optional(),
    provider: vine.string().trim().maxLength(120).optional(),
    coverType: vine.string().trim().maxLength(100).optional(),
    issuedOn: vine
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    expiresOn: vine
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    fileId: vine.string().trim().maxLength(26).optional(),
    notes: vine.string().trim().maxLength(1000).optional(),
  })
)

export const updateVehicleDocumentValidator = vine.compile(
  vine.object({
    type: vine.enum(DOCUMENT_TYPES).optional(),
    documentNumber: vine.string().trim().maxLength(100).optional().nullable(),
    provider: vine.string().trim().maxLength(120).optional().nullable(),
    coverType: vine.string().trim().maxLength(100).optional().nullable(),
    issuedOn: vine
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .nullable(),
    expiresOn: vine
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .nullable(),
    fileId: vine.string().trim().maxLength(26).optional().nullable(),
    notes: vine.string().trim().maxLength(1000).optional().nullable(),
  })
)

export const listExpiringDocumentsValidator = vine.compile(
  vine.object({
    days: vine.number().positive().optional(),
  })
)
