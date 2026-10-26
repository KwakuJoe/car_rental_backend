import vine from '@vinejs/vine'
import { paginationFields } from '#validators/shared'
import { CUSTOMER_SOURCES, CUSTOMER_TYPES, VERIFICATION_STATUSES } from '#models/customer'
import { IDENTITY_TYPES } from '#models/customer_identity'
import { BLACKLIST_REASONS, BLACKLIST_SEVERITIES } from '#models/blacklist_entry'

export const customerFilterValidator = vine.create({
  ...paginationFields,
  // name, phone, email or a document number
  search: vine.string().trim().optional(),
  verificationStatus: vine.enum(VERIFICATION_STATUSES).optional(),
  blacklisted: vine.enum(['any', 'warn', 'block'] as const).optional(),
  archived: vine.boolean().optional(),
  sortBy: vine.enum(['fullName', 'createdAt'] as const).optional(),
})

/** Possible duplicates while filling in the add-customer form. */
export const duplicateCheckValidator = vine.create({
  phone: vine.string().trim().optional(),
  fullName: vine.string().trim().optional(),
  dateOfBirth: vine.date({ formats: ['YYYY-MM-DD'] }).optional(),
  documentNumber: vine.string().trim().optional(),
  excludeId: vine.string().optional(),
})

// Factories: VineJS rules mutate the schema, so each validator builds its own.
const customerFields = () => ({
  type: vine.enum(CUSTOMER_TYPES).optional(),
  fullName: vine.string().trim().minLength(2).maxLength(150),
  // Normalised to E.164 in the controller (0241234567 -> +233241234567)
  phone: vine.string().trim().maxLength(30),
  whatsappPhone: vine.string().trim().maxLength(30).nullable().optional(),
  email: vine.string().trim().email().maxLength(254).nullable().optional(),
  dateOfBirth: vine
    .date({ formats: ['YYYY-MM-DD'] })
    .beforeOrEqual('today')
    .nullable()
    .optional(),
  gender: vine
    .enum(['female', 'male', 'other'] as const)
    .nullable()
    .optional(),
  nationality: vine.string().trim().fixedLength(2).toUpperCase().nullable().optional(),
  residentialAddress: vine.string().trim().maxLength(500).nullable().optional(),
  digitalAddress: vine.string().trim().toUpperCase().maxLength(20).nullable().optional(),
  occupation: vine.string().trim().maxLength(100).nullable().optional(),
  employer: vine.string().trim().maxLength(150).nullable().optional(),
  emergencyContactName: vine.string().trim().maxLength(150).nullable().optional(),
  emergencyContactPhone: vine.string().trim().maxLength(30).nullable().optional(),
  source: vine.enum(CUSTOMER_SOURCES).nullable().optional(),
  notes: vine.string().trim().maxLength(2000).nullable().optional(),
  marketingOptIn: vine.boolean().optional(),
})

export const createCustomerValidator = vine.create(customerFields())
export const updateCustomerValidator = vine.create(customerFields())

const identityFields = () => ({
  type: vine.enum(IDENTITY_TYPES),
  number: vine.string().trim().minLength(3).maxLength(60),
  issuingCountry: vine.string().trim().fixedLength(2).toUpperCase().nullable().optional(),
  issuedOn: vine
    .date({ formats: ['YYYY-MM-DD'] })
    .nullable()
    .optional(),
  expiresOn: vine
    .date({ formats: ['YYYY-MM-DD'] })
    .nullable()
    .optional(),
  licenceClass: vine.string().trim().toUpperCase().maxLength(20).nullable().optional(),
  // Private files uploaded first (purpose id_front / id_back / licence)
  frontFileId: vine.string().nullable().optional(),
  backFileId: vine.string().nullable().optional(),
})

export const identityValidator = vine.create(identityFields())
export const rejectIdentityValidator = vine.create({
  reason: vine.string().trim().minLength(3).maxLength(500),
})

export const blacklistFilterValidator = vine.create({
  ...paginationFields,
  search: vine.string().trim().optional(),
  severity: vine.enum(BLACKLIST_SEVERITIES).optional(),
  status: vine.enum(['active', 'lifted'] as const).optional(),
})

export const createBlacklistValidator = vine.create({
  customerId: vine.string().nullable().optional(),
  phone: vine.string().trim().maxLength(30).nullable().optional(),
  ghanaCardNo: vine.string().trim().maxLength(60).nullable().optional(),
  licenceNo: vine.string().trim().maxLength(60).nullable().optional(),
  passportNo: vine.string().trim().maxLength(60).nullable().optional(),
  reason: vine.enum(BLACKLIST_REASONS),
  details: vine.string().trim().maxLength(2000).nullable().optional(),
  severity: vine.enum(BLACKLIST_SEVERITIES),
})

export const liftBlacklistValidator = vine.create({
  reason: vine.string().trim().minLength(3).maxLength(500),
})

export const blacklistCheckValidator = vine.create({
  phone: vine.string().trim().optional(),
  documentNumber: vine.string().trim().optional(),
})
