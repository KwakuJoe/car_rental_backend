import { AlertRecipientSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { column } from '@adonisjs/lucid/orm'
import { withUlid } from '#models/mixins/with_ulid'

/**
 * The alerts staff can get by SMS or email, in the order the dashboard
 * lists them. `defaults` are what a new recipient starts with: SMS only
 * where it's urgent (each one costs mNotify credit).
 */
export const STAFF_ALERTS = [
  {
    key: 'online_booking',
    label: 'New online booking',
    description: 'Someone booked on the website and is about to pay.',
    defaults: ['sms', 'email'],
  },
  {
    key: 'payment_to_verify',
    label: 'Payment to verify',
    description: 'A customer says they’ve paid - check the statement and verify it.',
    defaults: ['sms', 'email'],
  },
  {
    key: 'hold_expiring',
    label: 'Hold about to expire',
    description: 'An online booking’s hold ends within 2 hours and nothing has been paid.',
    defaults: ['email'],
  },
  {
    key: 'booking_ended',
    label: 'Booking expired or cancelled',
    description: 'A hold ran out unpaid, a booking was cancelled, or a customer didn’t show up.',
    defaults: ['email'],
  },
  {
    key: 'return_overdue',
    label: 'Car not returned on time',
    description: 'A rental is past its return time and the car isn’t back yet.',
    defaults: ['sms'],
  },
  {
    key: 'documents_expiring',
    label: 'Vehicle documents expiring',
    description: 'Insurance, roadworthy or other papers are about to run out.',
    defaults: ['email'],
  },
  {
    key: 'incident_reported',
    label: 'Accident or incident',
    description: 'An accident, theft, breakdown or police stop was recorded against a car.',
    defaults: ['sms', 'email'],
  },
  {
    key: 'maintenance_due',
    label: 'Service due',
    description: 'A car’s scheduled service is coming up or overdue.',
    defaults: ['email'],
  },
] as const

export type StaffAlertKey = (typeof STAFF_ALERTS)[number]['key']
export const STAFF_ALERT_KEYS = STAFF_ALERTS.map((alert) => alert.key) as StaffAlertKey[]
export const ALERT_CHANNELS = ['sms', 'email'] as const
export type AlertChannel = (typeof ALERT_CHANNELS)[number]
export type AlertMap = Partial<Record<StaffAlertKey, AlertChannel[]>>

export default class AlertRecipient extends compose(AlertRecipientSchema, withUlid) {
  // jsonb: encode explicitly
  @column({ prepare: (value: unknown) => JSON.stringify(value ?? {}) })
  declare alerts: AlertMap
}
