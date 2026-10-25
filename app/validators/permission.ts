import vine from '@vinejs/vine'
import { paginationFields } from '#validators/shared'

export const permissionFilterValidator = vine.create({
  ...paginationFields,
  search: vine.string().optional(),
  group: vine.string().optional(),
  sortBy: vine.enum(['slug', 'name', 'createdAt'] as const).optional(),
})
