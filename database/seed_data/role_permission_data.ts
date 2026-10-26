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
  ],
  'front-desk': [
    'fleet.view',
    'pricing.view',
    'customers.view',
    'customers.manage',
    'customers.verify',
    'customers.view_documents',
  ],
  'fleet': ['fleet.view', 'fleet.manage', 'pricing.view'],
  'driver': [],
  'accountant': ['audit.view', 'customers.view'],
}
