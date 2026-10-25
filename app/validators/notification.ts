import vine from '@vinejs/vine'

export const listNotificationsValidator = vine.compile(
  vine.object({
    unreadOnly: vine.boolean().optional(),
    page: vine.number().positive().optional(),
    limit: vine.number().positive().optional(),
  })
)
