import vine from '@vinejs/vine'

export const createCarBlockValidator = vine.compile(
  vine.object({
    startsAt: vine.string().trim(),
    endsAt: vine.string().trim(),
    reason: vine.string().trim().maxLength(255).optional(),
    bufferMinutes: vine.number().min(0).max(1440).optional(),
  })
)

export const listCarBlocksValidator = vine.compile(
  vine.object({
    activeOnly: vine.boolean().optional(),
    page: vine.number().min(1).optional(),
    limit: vine.number().min(1).max(100).optional(),
  })
)
