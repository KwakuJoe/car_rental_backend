// ─────────────────────────────────────────────────────────────
// Car rental backend — Roles & Permissions seed data
// Permissions use module.action format (matches middleware usage)
// See prompt-reference/modules.txt for the full permission catalog -
// add each module's permissions here as that module is built.
// ─────────────────────────────────────────────────────────────

// ── Roles ─────────────────────────────────────────────────────
export const roleData = [
  {
    name: 'Owner',
    slug: 'owner',
    description: 'Business owner with unrestricted access to all features',
    isSuperAdmin: true,
    isSystem: true,
  },
  {
    name: 'Manager',
    slug: 'manager',
    description:
      'Runs day-to-day operations, manages staff, and approves discounts, refunds and cash-ups',
    isSuperAdmin: false,
    isSystem: true,
  },
  {
    name: 'Front Desk',
    slug: 'front-desk',
    description: 'Handles customers, bookings, vehicle handovers and payments at the counter',
    isSuperAdmin: false,
    isSystem: true,
  },
  {
    name: 'Fleet Officer',
    slug: 'fleet',
    description: 'Manages cars, vehicle documents, inspections, maintenance and incidents',
    isSuperAdmin: false,
    isSystem: true,
  },
  {
    name: 'Driver',
    slug: 'driver',
    description: 'Chauffeur with access to their own assigned trips only',
    isSuperAdmin: false,
    isSystem: true,
  },
  {
    name: 'Accountant',
    slug: 'accountant',
    description: 'Reviews payments, invoices, expenses and cash-ups; runs financial reports',
    isSuperAdmin: false,
    isSystem: true,
  },
]

// ── Permissions ───────────────────────────────────────────────
export const permissionData = [
  // rbac
  {
    name: 'Manage users',
    slug: 'users.manage',
    group: 'rbac',
    description: 'Create staff users, assign roles and branches',
  },
  {
    name: 'Manage roles',
    slug: 'roles.manage',
    group: 'rbac',
    description: 'Create, update, and delete roles and their permissions',
  },
  {
    name: 'Manage permissions',
    slug: 'permissions.manage',
    group: 'rbac',
    description: 'View the list of available permissions',
  },

  // audit
  {
    name: 'View audit log',
    slug: 'audit.view',
    group: 'audit',
    description: 'See who changed what and when, including sign-ins',
  },

  // settings
  {
    name: 'Manage settings',
    slug: 'settings.manage',
    group: 'settings',
    description: 'Update business profile, branches, opening hours, closure dates and settings',
  },

  // fleet
  {
    name: 'View fleet',
    slug: 'fleet.view',
    group: 'fleet',
    description: 'View vehicle categories, cars, specifications, and availability',
  },
  {
    name: 'Manage fleet',
    slug: 'fleet.manage',
    group: 'fleet',
    description: 'Create and update categories, cars, photos, odometer corrections, and status',
  },

  // pricing
  {
    name: 'View pricing',
    slug: 'pricing.view',
    group: 'pricing',
    description: 'See rates, price rules, protection plans, delivery zones and fees',
  },
  {
    name: 'Manage pricing',
    slug: 'pricing.manage',
    group: 'pricing',
    description: 'Change rates, price rules, protection plans, delivery zones and fees',
  },
  {
    name: 'Manage extras',
    slug: 'extras.manage',
    group: 'pricing',
    description: 'Add and change rental extras (child seats, extra driver, GPS, ...)',
  },

  // customers
  {
    name: 'View customers',
    slug: 'customers.view',
    group: 'customers',
    description: 'See the customer list and profiles (ID numbers stay masked)',
  },
  {
    name: 'Manage customers',
    slug: 'customers.manage',
    group: 'customers',
    description: 'Add and update customers and their ID and licence documents',
  },
  {
    name: 'Verify customers',
    slug: 'customers.verify',
    group: 'customers',
    description: 'Approve or reject ID and licence documents',
  },
  {
    name: 'View ID documents',
    slug: 'customers.view_documents',
    group: 'customers',
    description: 'See full ID numbers and document images (every view is logged)',
  },
  {
    name: 'Manage blacklist',
    slug: 'customers.blacklist',
    group: 'customers',
    description: 'Add and lift blacklist entries',
  },

  // bookings
  {
    name: 'View bookings',
    slug: 'bookings.view',
    group: 'bookings',
    description: 'See bookings, availability and booking history',
  },
  {
    name: 'Create bookings',
    slug: 'bookings.create',
    group: 'bookings',
    description: 'Get quotes and make bookings',
  },
  {
    name: 'Update bookings',
    slug: 'bookings.update',
    group: 'bookings',
    description: 'Confirm bookings and change notes (later: extend, swap, driver)',
  },
  {
    name: 'Cancel bookings',
    slug: 'bookings.cancel',
    group: 'bookings',
    description: 'Cancel bookings and mark no-shows',
  },
  {
    name: 'Override booking rules',
    slug: 'bookings.override',
    group: 'bookings',
    description:
      'Book a blacklisted customer or an under-age driver, or give discounts above the staff limit (with a reason)',
  },

  // drivers
  {
    name: 'View drivers',
    slug: 'drivers.view',
    group: 'drivers',
    description: 'See chauffeur drivers (to assign them to bookings)',
  },
  {
    name: 'Manage drivers',
    slug: 'drivers.manage',
    group: 'drivers',
    description: 'Add drivers and update their licence, status and daily cost',
  },

  // handover
  {
    name: 'Check cars out',
    slug: 'handover.checkout',
    group: 'handover',
    description: 'Hand cars over: inspection, photos, damage, customer signature',
  },
  {
    name: 'Check cars in',
    slug: 'handover.checkin',
    group: 'handover',
    description: 'Take cars back: inspection, extra charges',
  },

  // payments
  {
    name: 'View payments',
    slug: 'payments.view',
    group: 'payments',
    description: 'See payments, deposits, refunds and receipts',
  },
  {
    name: 'Record payments',
    slug: 'payments.record',
    group: 'payments',
    description: 'Take rent and deposits by cash, MoMo or bank transfer',
  },
  {
    name: 'Verify payments',
    slug: 'payments.verify',
    group: 'payments',
    description:
      'Confirm MoMo and bank payments arrived (checked against the statement); without it they wait for someone who has it',
  },
  {
    name: 'Record refunds',
    slug: 'payments.refund',
    group: 'payments',
    description: 'Pay back rent and settle security deposits',
  },
  {
    name: 'Void payments',
    slug: 'payments.void',
    group: 'payments',
    description: 'Cancel a payment recorded by mistake (with a reason; it stays on record)',
  },

  // expenses
  {
    name: 'View expenses',
    slug: 'expenses.view',
    group: 'expenses',
    description: 'See what the business spends, with receipts',
  },
  {
    name: 'Record expenses',
    slug: 'expenses.manage',
    group: 'expenses',
    description: 'Add and correct expenses (fuel, repairs, salaries...) with a receipt photo',
  },
  {
    name: 'Approve expenses',
    slug: 'expenses.approve',
    group: 'expenses',
    description: 'Approve or reject expenses - only approved ones count in the reports',
  },

  // reports
  {
    name: 'View reports',
    slug: 'reports.view',
    group: 'reports',
    description: 'Bookings, utilisation, cancellations and the fleet over any period',
  },
  {
    name: 'View financial reports',
    slug: 'reports.financial',
    group: 'reports',
    description: 'Money collected, revenue per car, outstanding balances, deposits held and tax',
  },
  {
    name: 'Export data',
    slug: 'exports.run',
    group: 'reports',
    description: 'Download bookings, payments, customers and cars as CSV or Excel',
  },
]

// ── Role → Permission mapping ──────────────────────────────────
// Owner has isSuperAdmin: true - it bypasses permission checks entirely,
// so listing permissions here has no effect. Roles with an empty list get
// their permissions as their modules are built (see the ROLE MATRIX in
// prompt-reference/modules.txt).
export const rolePermissionMap: Record<string, string[]> = {
  'owner': [], // isSuperAdmin - all permissions implicitly granted
  'manager': [
    'users.manage',
    'settings.manage',
    'audit.view',
    'fleet.view',
    'fleet.manage',
    'pricing.view',
    'pricing.manage',
    'extras.manage',
    'customers.view',
    'customers.manage',
    'customers.verify',
    'customers.view_documents',
    'customers.blacklist',
    'bookings.view',
    'bookings.create',
    'bookings.update',
    'bookings.cancel',
    'bookings.override',
    'drivers.view',
    'drivers.manage',
    'handover.checkout',
    'handover.checkin',
    'payments.view',
    'payments.record',
    'payments.verify',
    'payments.refund',
    'payments.void',
    'reports.view',
    'reports.financial',
    'exports.run',
    'expenses.view',
    'expenses.manage',
    'expenses.approve',
  ],
  'front-desk': [
    'fleet.view',
    'pricing.view',
    'customers.view',
    'customers.manage',
    'customers.verify',
    'customers.view_documents',
    'bookings.view',
    'bookings.create',
    'bookings.update',
    'bookings.cancel',
    'drivers.view',
    'handover.checkout',
    'handover.checkin',
    'payments.view',
    'payments.record',
    'payments.refund',
  ],
  'fleet': [
    'fleet.view',
    'fleet.manage',
    'pricing.view',
    'bookings.view',
    'drivers.view',
    'handover.checkout',
    'handover.checkin',
    'expenses.view',
    'expenses.manage',
  ],
  'driver': [],
  'accountant': [
    'audit.view',
    'customers.view',
    'bookings.view',
    'payments.view',
    'payments.verify',
    'payments.void',
    'reports.view',
    'reports.financial',
    'exports.run',
    'expenses.view',
    'expenses.manage',
    'expenses.approve',
  ],
}
