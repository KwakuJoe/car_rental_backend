import vine from '@vinejs/vine'
import { paginationFields } from '#validators/shared'

export const categoryFilterValidator = vine.create({
  ...paginationFields,
  search: vine.string().trim().optional(),
  active: vine.boolean().optional(),
  selfDriveAllowed: vine.boolean().optional(),
  sortBy: vine.enum(['sortOrder', 'name', 'createdAt'] as const).optional(),
})

/**
 * Validator for creating a new vehicle category.
 */
export const createCategoryValidator = vine.create({
  name: vine.string().trim().minLength(2).maxLength(100),
  slug: vine
    .string()
    .trim()
    .minLength(2)
    .maxLength(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .unique({ table: 'categories', column: 'slug' }),
  description: vine.string().trim().maxLength(1000).nullable().optional(),
  image: vine.string().trim().nullable().optional(),
  seats: vine.number().min(1).max(100).optional(),
  defaultDepositAmount: vine.number().min(0).optional(),
  selfDriveAllowed: vine.boolean().optional(),
  minDriverAgeOverride: vine.number().min(18).max(100).nullable().optional(),
  sortOrder: vine.number().min(0).optional(),
  active: vine.boolean().optional(),
})

/**
 * Factory for updating a category, enforcing uniqueness on slug except self.
 */
export function updateCategoryValidator(categoryId: string) {
  return vine.create({
    name: vine.string().trim().minLength(2).maxLength(100),
    slug: vine
      .string()
      .trim()
      .minLength(2)
      .maxLength(100)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .unique({
        table: 'categories',
        column: 'slug',
        filter: (db) => {
          db.whereNot('id', categoryId)
        },
      }),
    description: vine.string().trim().maxLength(1000).nullable().optional(),
    image: vine.string().trim().nullable().optional(),
    seats: vine.number().min(1).max(100).optional(),
    defaultDepositAmount: vine.number().min(0).optional(),
    selfDriveAllowed: vine.boolean().optional(),
    minDriverAgeOverride: vine.number().min(18).max(100).nullable().optional(),
    sortOrder: vine.number().min(0).optional(),
    active: vine.boolean().optional(),
  })
}
