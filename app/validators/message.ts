import vine from '@vinejs/vine'

export const listMessagesValidator = vine.create({
  page: vine.number().min(1).optional(),
  limit: vine.number().min(1).max(100).optional(),
  status: vine.enum(['pending', 'sending', 'sent', 'failed', 'skipped']).optional(),
  channel: vine.enum(['sms', 'email']).optional(),
  // Recipient, subject or booking reference
  search: vine.string().trim().maxLength(100).optional(),
})
