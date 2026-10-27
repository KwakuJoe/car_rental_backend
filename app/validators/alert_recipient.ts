import vine from '@vinejs/vine'
import { ALERT_CHANNELS } from '#models/alert_recipient'

const channels = () => vine.array(vine.enum(ALERT_CHANNELS)).distinct().optional()

/** A person on the alert list: name, phone and/or email, and which alerts by which channel (see STAFF_ALERTS). */
export const alertRecipientValidator = vine.create({
  name: vine.string().trim().minLength(2).maxLength(120),
  phone: vine.string().trim().maxLength(20).nullable().optional(),
  email: vine.string().trim().email().maxLength(254).nullable().optional(),
  alerts: vine.object({
    online_booking: channels(),
    payment_to_verify: channels(),
    hold_expiring: channels(),
    booking_ended: channels(),
    return_overdue: channels(),
    documents_expiring: channels(),
  }),
  active: vine.boolean().optional(),
})
