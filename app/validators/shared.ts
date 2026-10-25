import vine from '@vinejs/vine'

/**
 * Shared page/limit/sortOrder fields for every list-endpoint filter
 * validator. Spread into a resource's own filter validator alongside its
 * `search`, resource-specific filters, and `sortBy` enum.
 */
export const paginationFields = {
  page: vine.number().min(1).optional(),
  limit: vine.number().min(1).max(100).optional(),
  sortOrder: vine.enum(['asc', 'desc'] as const).optional(),
}
