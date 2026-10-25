import vine from '@vinejs/vine'

const phone = () => vine.string().trim().maxLength(20)

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
})
