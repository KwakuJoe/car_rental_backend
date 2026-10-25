import vine from '@vinejs/vine'
import { paginationFields } from '#validators/shared'

/**
 * Factories, not shared instances: Vine rule methods mutate the schema they
 * are called on, so reusing one instance across validators would leak rules
 * (e.g. the update validator's unique filter) between them.
 */
const name = () => vine.string().trim().minLength(2).maxLength(120)
// Short code used in document numbers later, e.g. MAIN, KIA, KSI
const code = () =>
  vine
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{2,10}$/)
const contactFields = () => ({
  email: vine.string().trim().email().maxLength(254).nullable().optional(),
  phone: vine.string().trim().maxLength(20).nullable().optional(),
  address: vine.string().trim().maxLength(255).nullable().optional(),
  digitalAddress: vine.string().trim().maxLength(20).nullable().optional(),
  city: vine.string().trim().maxLength(80).nullable().optional(),
  region: vine.string().trim().maxLength(80).nullable().optional(),
  latitude: vine.number().min(-90).max(90).nullable().optional(),
  longitude: vine.number().min(-180).max(180).nullable().optional(),
})
const time = () => vine.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)

export const branchFilterValidator = vine.create({
  ...paginationFields,
  search: vine.string().optional(),
  isMain: vine.boolean().optional(),
  isActive: vine.boolean().optional(),
  sortBy: vine.enum(['name', 'code', 'city', 'createdAt'] as const).optional(),
})

export const createBranchValidator = vine.create({
  name: name(),
  code: code().unique({ table: 'branches', column: 'code' }),
  ...contactFields(),
})

export const updateBranchValidator = vine.withMetaData<{ branchId: string }>().create({
  name: name().optional(),
  code: code()
    .unique({
      table: 'branches',
      column: 'code',
      filter: (query, _value, field) => {
        query.whereNot('id', field.meta.branchId)
      },
    })
    .optional(),
  ...contactFields(),
  isActive: vine.boolean().optional(),
  isMain: vine.boolean().optional(),
})

/** Full week, replaced in one go. weekday 0 = Sunday ... 6 = Saturday. */
export const updateOpeningHoursValidator = vine.create({
  days: vine
    .array(
      vine.object({
        weekday: vine.number().withoutDecimals().min(0).max(6),
        isClosed: vine.boolean(),
        opensAt: time().nullable().optional(),
        closesAt: time().nullable().optional(),
      })
    )
    .fixedLength(7)
    .distinct('weekday'),
})

export const closureDateFilterValidator = vine.create({
  from: vine.date({ formats: ['YYYY-MM-DD'] }).optional(),
  to: vine.date({ formats: ['YYYY-MM-DD'] }).optional(),
})

export const createClosureDateValidator = vine.create({
  date: vine.date({ formats: ['YYYY-MM-DD'] }),
  reason: vine.string().trim().maxLength(120).nullable().optional(),
})
