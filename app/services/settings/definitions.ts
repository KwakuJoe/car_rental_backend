/**
 * Business rules as data (M1.3). Defaults live here; the settings table only
 * stores values someone changed, so adding a rule needs no migration - add
 * it below and it shows up in GET /admin/settings and the Settings page.
 *
 * Money is always integer pesewas (GHS 1.00 = 100).
 */

type Base = { group: SettingGroup; label: string; description: string }

/** Keep `label` short (it's what the closed dropdown shows); explain in `description`. */
export type SettingOption = { value: string; label: string; description?: string }

export type SettingDefinition =
  | (Base & { type: 'integer'; default: number; min: number; max: number; unit?: string })
  | (Base & { type: 'money'; default: number; min: number; max: number })
  | (Base & { type: 'boolean'; default: boolean })
  | (Base & { type: 'enum'; default: string; options: readonly SettingOption[] })

export const settingGroups = {
  bookings: 'Bookings',
  cancellation: 'Cancellation & no-show',
  rental: 'Rental policy',
  payments: 'Payments & deposits',
  pricing: 'Pricing',
} as const

export type SettingGroup = keyof typeof settingGroups

export const settingDefinitions = {
  // ── Bookings ────────────────────────────────────────────────
  'booking.min_driver_age': {
    group: 'bookings',
    type: 'integer',
    label: 'Minimum driver age',
    description: 'Self-drive customers and extra drivers must be at least this old.',
    default: 25,
    min: 18,
    max: 99,
    unit: 'years',
  },
  'booking.min_licence_years': {
    group: 'bookings',
    type: 'integer',
    label: 'Minimum years with a licence',
    description: 'How long a driver must have held their driving licence.',
    default: 2,
    min: 0,
    max: 20,
    unit: 'years',
  },
  'booking.min_rental_days': {
    group: 'bookings',
    type: 'integer',
    label: 'Minimum rental length',
    description: 'Shortest booking allowed.',
    default: 1,
    min: 1,
    max: 30,
    unit: 'days',
  },
  'booking.max_rental_days': {
    group: 'bookings',
    type: 'integer',
    label: 'Maximum rental length',
    description: 'Longest single booking allowed (longer rentals need a new booking).',
    default: 90,
    min: 1,
    max: 365,
    unit: 'days',
  },
  'booking.turnaround_buffer_minutes': {
    group: 'bookings',
    type: 'integer',
    label: 'Turnaround time between rentals',
    description:
      'Time kept free after a return for cleaning and checks before the car can go out again.',
    default: 120,
    min: 0,
    max: 1440,
    unit: 'minutes',
  },
  'booking.return_grace_minutes': {
    group: 'bookings',
    type: 'integer',
    label: 'Late return grace period',
    description: 'A return this late is not charged as late.',
    default: 59,
    min: 0,
    max: 240,
    unit: 'minutes',
  },
  'booking.hold_minutes': {
    group: 'bookings',
    type: 'integer',
    label: 'Unpaid booking hold',
    description:
      'How long a car is held for an online booking waiting for payment before it is released.',
    default: 30,
    min: 5,
    max: 1440,
    unit: 'minutes',
  },
  'booking.min_lead_hours': {
    group: 'bookings',
    type: 'integer',
    label: 'Online booking notice',
    description: 'Online customers can’t book a pickup sooner than this (staff can).',
    default: 3,
    min: 0,
    max: 168,
    unit: 'hours',
  },
  'booking.require_verified_customer_for_checkout': {
    group: 'bookings',
    type: 'boolean',
    label: 'Verify ID before handover',
    description: 'A car can only be handed over once the customer’s ID and licence are verified.',
    default: true,
  },
  'booking.after_hours_fee': {
    group: 'bookings',
    type: 'money',
    label: 'After-hours fee',
    description:
      'Charged for a pickup or return outside opening hours. Zero to refuse after-hours handovers instead.',
    default: 0,
    min: 0,
    max: 10_000_00,
  },

  'booking.staff_hold_hours': {
    group: 'bookings',
    type: 'integer',
    label: 'Unconfirmed booking hold',
    description:
      'A phone or WhatsApp booking not yet confirmed keeps its car this long, then expires and frees the car.',
    default: 24,
    min: 1,
    max: 168,
    unit: 'hours',
  },
  'booking.staff_discount_limit_percent': {
    group: 'bookings',
    type: 'integer',
    label: 'Staff discount limit',
    description:
      'Biggest discount on the rental that front-desk staff can give. More needs a manager (with a reason).',
    default: 10,
    min: 0,
    max: 100,
    unit: '%',
  },

  'booking.early_return_refund': {
    group: 'bookings',
    type: 'enum',
    label: 'Early return',
    description: 'What a customer gets back when they return the car before the booked date.',
    default: 'none',
    options: [
      { value: 'none', label: 'No refund', description: 'The booked days are kept in full.' },
      {
        value: 'unused_days',
        label: 'Refund unused days',
        description: 'Whole unused days are refunded at the booking’s average daily price.',
      },
    ],
  },

  // ── Cancellation & no-show (M3.6) ───────────────────────────
  'cancellation.full_refund_hours': {
    group: 'cancellation',
    type: 'integer',
    label: 'Free cancellation until',
    description: 'Cancelling at least this long before pickup costs nothing.',
    default: 72,
    min: 0,
    max: 720,
    unit: 'hours before pickup',
  },
  'cancellation.fee_only_hours': {
    group: 'cancellation',
    type: 'integer',
    label: 'Reservation fee kept from',
    description:
      'Cancelling later than the free window but at least this long before pickup keeps the reservation fee. Later than this also keeps the late charge below.',
    default: 24,
    min: 0,
    max: 720,
    unit: 'hours before pickup',
  },
  'cancellation.late_charge_days': {
    group: 'cancellation',
    type: 'integer',
    label: 'Late cancellation charge',
    description:
      'Days of rental kept (on top of the reservation fee) for a late cancellation or a no-show.',
    default: 1,
    min: 0,
    max: 30,
    unit: 'days',
  },
  'cancellation.no_show_after_hours': {
    group: 'cancellation',
    type: 'integer',
    label: 'No-show after',
    description: 'A booking can be marked as a no-show this long after the pickup time.',
    default: 2,
    min: 0,
    max: 72,
    unit: 'hours',
  },

  // ── Rental policy ───────────────────────────────────────────
  'rental.fuel_policy': {
    group: 'rental',
    type: 'enum',
    label: 'Fuel policy',
    description: 'How fuel is charged at return.',
    default: 'full_to_full',
    options: [
      {
        value: 'full_to_full',
        label: 'Full to full',
        description: 'Picked up with a full tank, returned full.',
      },
      {
        value: 'same_to_same',
        label: 'Same to same',
        description: 'Returned with the same fuel level it was picked up with.',
      },
    ],
  },
  'rental.mileage_policy': {
    group: 'rental',
    type: 'enum',
    label: 'Mileage',
    description: 'Default mileage terms. A rate can override this for a category or car.',
    default: 'unlimited',
    options: [
      { value: 'unlimited', label: 'Unlimited', description: 'No limit on kilometres driven.' },
      {
        value: 'daily_allowance',
        label: 'Daily allowance',
        description: 'A set number of free km per day; extra km are charged.',
      },
    ],
  },
  'rental.daily_km_allowance': {
    group: 'rental',
    type: 'integer',
    label: 'Daily km allowance',
    description: 'Free kilometres per rental day when mileage is limited.',
    default: 200,
    min: 0,
    max: 2000,
    unit: 'km/day',
  },

  // ── Payments & deposits ─────────────────────────────────────
  'payment.allow_pay_at_pickup': {
    group: 'payments',
    type: 'boolean',
    label: 'Allow pay at pickup',
    description:
      'Customers can secure a booking with a reservation fee and pay the rest at pickup.',
    default: true,
  },
  'payment.reservation_fee_type': {
    group: 'payments',
    type: 'enum',
    label: 'Reservation fee type',
    description: 'How the reservation fee for pay-at-pickup bookings is worked out.',
    default: 'percent',
    options: [
      { value: 'percent', label: 'Percentage', description: 'A percentage of the booking total.' },
      { value: 'fixed', label: 'Fixed amount', description: 'The same amount for every booking.' },
    ],
  },
  'payment.reservation_fee_percent': {
    group: 'payments',
    type: 'integer',
    label: 'Reservation fee (percentage)',
    description: 'Used when the fee type is percentage.',
    default: 20,
    min: 0,
    max: 100,
    unit: '%',
  },
  'payment.reservation_fee_amount': {
    group: 'payments',
    type: 'money',
    label: 'Reservation fee (fixed)',
    description: 'Used when the fee type is fixed.',
    default: 500_00,
    min: 0,
    max: 100_000_00,
  },

  // ── Pricing ─────────────────────────────────────────────────
  'pricing.weekly_threshold_days': {
    group: 'pricing',
    type: 'integer',
    label: 'Weekly rate from',
    description: 'Rentals this long or longer use the weekly rate.',
    default: 7,
    min: 2,
    max: 27,
    unit: 'days',
  },
  'pricing.monthly_threshold_days': {
    group: 'pricing',
    type: 'integer',
    label: 'Monthly rate from',
    description: 'Rentals this long or longer use the monthly rate.',
    default: 28,
    min: 8,
    max: 90,
    unit: 'days',
  },
  'pricing.display_tax_inclusive': {
    group: 'pricing',
    type: 'boolean',
    label: 'Show prices including tax',
    description: 'Quotes and the website show tax-inclusive prices.',
    default: true,
  },
} as const satisfies Record<string, SettingDefinition>

export type SettingKey = keyof typeof settingDefinitions

export type SettingValue<K extends SettingKey> =
  (typeof settingDefinitions)[K]['default'] extends number
    ? number
    : (typeof settingDefinitions)[K]['default'] extends boolean
      ? boolean
      : string

export function isSettingKey(key: string): key is SettingKey {
  return Object.hasOwn(settingDefinitions, key)
}
