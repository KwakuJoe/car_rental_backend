import vine from '@vinejs/vine'

const phone = () => vine.string().trim().maxLength(20)
const socialUrl = () =>
  vine
    .string()
    .trim()
    .maxLength(255)
    .url({ require_protocol: true, protocols: ['https', 'http'] })
    .nullable()
    .optional()

/**
 * Business profile. currency (GHS) and timezone (Africa/Accra) are fixed at
 * install time and intentionally not editable here.
 */
export const updateBusinessValidator = vine.create({
  name: vine.string().trim().minLength(2).maxLength(120).optional(),
  tradingName: vine.string().trim().maxLength(120).nullable().optional(),
  email: vine.string().trim().email().maxLength(254).optional(),
  phone: phone().nullable().optional(),
  whatsappPhone: phone().nullable().optional(),
  address: vine.string().trim().maxLength(255).nullable().optional(),
  digitalAddress: vine.string().trim().maxLength(20).nullable().optional(),
  city: vine.string().trim().maxLength(80).nullable().optional(),
  region: vine.string().trim().maxLength(80).nullable().optional(),
  tin: vine.string().trim().maxLength(20).nullable().optional(),
  vatRegistered: vine.boolean().optional(),
  vatNumber: vine.string().trim().maxLength(30).nullable().optional(),
  // Where online customers pay (shown on the booking page and documents)
  momoNumber: phone().nullable().optional(),
  momoName: vine.string().trim().maxLength(120).nullable().optional(),
  momoNetwork: vine
    .enum(['mtn', 'telecel', 'at'] as const)
    .nullable()
    .optional(),
  bankName: vine.string().trim().maxLength(120).nullable().optional(),
  bankAccountName: vine.string().trim().maxLength(120).nullable().optional(),
  bankAccountNumber: vine.string().trim().maxLength(40).nullable().optional(),
  bankBranch: vine.string().trim().maxLength(120).nullable().optional(),
  // Website footer
  // Website logo strip: companies worked with, in order
  partners: vine
    .array(
      vine.object({
        name: vine.string().trim().minLength(1).maxLength(80),
        logoUrl: vine
          .string()
          .trim()
          .maxLength(500)
          .url({ require_protocol: true, protocols: ['https', 'http'] }),
        website: socialUrl().transform((value) => value ?? null),
      })
    )
    .maxLength(40)
    .nullable()
    .optional(),
  instagramUrl: socialUrl(),
  facebookUrl: socialUrl(),
  tiktokUrl: socialUrl(),
  xUrl: socialUrl(),
  // The WYK in booking references (WYK-2026-00123): 2-6 letters or digits.
  // Changing it affects new references only.
  documentPrefix: vine
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{2,6}$/)
    .optional(),
})
