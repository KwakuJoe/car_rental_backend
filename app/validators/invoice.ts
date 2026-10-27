import vine from '@vinejs/vine'

export const listInvoicesValidator = vine.create({
  page: vine.number().min(1).optional(),
  limit: vine.number().min(1).max(100).optional(),
  // open = issued and not fully paid (overdue ones too)
  status: vine.enum(['open', 'overdue', 'paid', 'credited']).optional(),
  // Invoice number, booking reference, customer or company
  search: vine.string().trim().maxLength(100).optional(),
  dateFrom: vine.date({ formats: ['YYYY-MM-DD'] }).optional(),
  dateTo: vine.date({ formats: ['YYYY-MM-DD'] }).optional(),
})

const optionalText = (max: number) => vine.string().trim().maxLength(max).nullable().optional()

export const issueInvoiceValidator = vine.create({
  billTo: vine.object({
    name: vine.string().trim().minLength(2).maxLength(120),
    company: optionalText(160),
    tin: optionalText(30),
    address: optionalText(300),
    phone: optionalText(30),
    email: vine.string().trim().email().maxLength(160).nullable().optional(),
  }),
  dueOn: vine.date({ formats: ['YYYY-MM-DD'] }),
  notes: optionalText(1000),
})

export const creditNoteValidator = vine.create({
  reason: vine.string().trim().minLength(3).maxLength(300),
})
