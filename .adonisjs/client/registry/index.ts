/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

const placeholder: any = {}

const routes = {
  'auth.access_tokens.store': {
    methods: ["POST"],
    pattern: '/api/v1/auth/login',
    tokens: [[0,"api"],[0,"v1"],[0,"auth"],[0,"login"]],
    types: placeholder as Registry['auth.access_tokens.store']['types'],
  },
  'account.profile.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/account/profile',
    tokens: [[0,"api"],[0,"v1"],[0,"account"],[0,"profile"]],
    types: placeholder as Registry['account.profile.show']['types'],
  },
  'account.access_tokens.destroy': {
    methods: ["POST"],
    pattern: '/api/v1/account/logout',
    tokens: [[0,"api"],[0,"v1"],[0,"account"],[0,"logout"]],
    types: placeholder as Registry['account.access_tokens.destroy']['types'],
  },
  'account.change_password.store': {
    methods: ["POST"],
    pattern: '/api/v1/account/change-password',
    tokens: [[0,"api"],[0,"v1"],[0,"account"],[0,"change-password"]],
    types: placeholder as Registry['account.change_password.store']['types'],
  },
  'admin.users.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/admin/users',
    tokens: [[0,"api"],[0,"v1"],[0,"admin"],[0,"users"]],
    types: placeholder as Registry['admin.users.index']['types'],
  },
  'admin.users.store': {
    methods: ["POST"],
    pattern: '/api/v1/admin/users',
    tokens: [[0,"api"],[0,"v1"],[0,"admin"],[0,"users"]],
    types: placeholder as Registry['admin.users.store']['types'],
  },
  'admin.users.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/admin/users/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"admin"],[0,"users"],[1,"id"]],
    types: placeholder as Registry['admin.users.show']['types'],
  },
  'admin.users.update': {
    methods: ["PUT"],
    pattern: '/api/v1/admin/users/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"admin"],[0,"users"],[1,"id"]],
    types: placeholder as Registry['admin.users.update']['types'],
  },
  'admin.users.reset_password': {
    methods: ["POST"],
    pattern: '/api/v1/admin/users/:id/reset-password',
    tokens: [[0,"api"],[0,"v1"],[0,"admin"],[0,"users"],[1,"id"],[0,"reset-password"]],
    types: placeholder as Registry['admin.users.reset_password']['types'],
  },
  'admin.roles.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/admin/roles',
    tokens: [[0,"api"],[0,"v1"],[0,"admin"],[0,"roles"]],
    types: placeholder as Registry['admin.roles.index']['types'],
  },
  'admin.roles.store': {
    methods: ["POST"],
    pattern: '/api/v1/admin/roles',
    tokens: [[0,"api"],[0,"v1"],[0,"admin"],[0,"roles"]],
    types: placeholder as Registry['admin.roles.store']['types'],
  },
  'admin.roles.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/admin/roles/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"admin"],[0,"roles"],[1,"id"]],
    types: placeholder as Registry['admin.roles.show']['types'],
  },
  'admin.roles.update': {
    methods: ["PUT"],
    pattern: '/api/v1/admin/roles/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"admin"],[0,"roles"],[1,"id"]],
    types: placeholder as Registry['admin.roles.update']['types'],
  },
  'admin.roles.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/admin/roles/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"admin"],[0,"roles"],[1,"id"]],
    types: placeholder as Registry['admin.roles.destroy']['types'],
  },
  'admin.roles.sync_permissions': {
    methods: ["PUT"],
    pattern: '/api/v1/admin/roles/:id/permissions',
    tokens: [[0,"api"],[0,"v1"],[0,"admin"],[0,"roles"],[1,"id"],[0,"permissions"]],
    types: placeholder as Registry['admin.roles.sync_permissions']['types'],
  },
  'admin.permissions.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/admin/permissions',
    tokens: [[0,"api"],[0,"v1"],[0,"admin"],[0,"permissions"]],
    types: placeholder as Registry['admin.permissions.index']['types'],
  },
  'admin.lookups.lookups.business': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/admin/lookups/business',
    tokens: [[0,"api"],[0,"v1"],[0,"admin"],[0,"lookups"],[0,"business"]],
    types: placeholder as Registry['admin.lookups.lookups.business']['types'],
  },
  'admin.lookups.lookups.roles': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/admin/lookups/roles',
    tokens: [[0,"api"],[0,"v1"],[0,"admin"],[0,"lookups"],[0,"roles"]],
    types: placeholder as Registry['admin.lookups.lookups.roles']['types'],
  },
  'admin.lookups.lookups.branches': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/admin/lookups/branches',
    tokens: [[0,"api"],[0,"v1"],[0,"admin"],[0,"lookups"],[0,"branches"]],
    types: placeholder as Registry['admin.lookups.lookups.branches']['types'],
  },
  'admin.business.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/admin/business',
    tokens: [[0,"api"],[0,"v1"],[0,"admin"],[0,"business"]],
    types: placeholder as Registry['admin.business.show']['types'],
  },
  'admin.business.update': {
    methods: ["PUT"],
    pattern: '/api/v1/admin/business',
    tokens: [[0,"api"],[0,"v1"],[0,"admin"],[0,"business"]],
    types: placeholder as Registry['admin.business.update']['types'],
  },
  'admin.branches.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/admin/branches',
    tokens: [[0,"api"],[0,"v1"],[0,"admin"],[0,"branches"]],
    types: placeholder as Registry['admin.branches.index']['types'],
  },
  'admin.branches.store': {
    methods: ["POST"],
    pattern: '/api/v1/admin/branches',
    tokens: [[0,"api"],[0,"v1"],[0,"admin"],[0,"branches"]],
    types: placeholder as Registry['admin.branches.store']['types'],
  },
  'admin.branches.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/admin/branches/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"admin"],[0,"branches"],[1,"id"]],
    types: placeholder as Registry['admin.branches.show']['types'],
  },
  'admin.branches.update': {
    methods: ["PUT"],
    pattern: '/api/v1/admin/branches/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"admin"],[0,"branches"],[1,"id"]],
    types: placeholder as Registry['admin.branches.update']['types'],
  },
  'admin.branches.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/admin/branches/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"admin"],[0,"branches"],[1,"id"]],
    types: placeholder as Registry['admin.branches.destroy']['types'],
  },
  'admin.opening_hours.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/admin/branches/:branchId/opening-hours',
    tokens: [[0,"api"],[0,"v1"],[0,"admin"],[0,"branches"],[1,"branchId"],[0,"opening-hours"]],
    types: placeholder as Registry['admin.opening_hours.index']['types'],
  },
  'admin.opening_hours.update': {
    methods: ["PUT"],
    pattern: '/api/v1/admin/branches/:branchId/opening-hours',
    tokens: [[0,"api"],[0,"v1"],[0,"admin"],[0,"branches"],[1,"branchId"],[0,"opening-hours"]],
    types: placeholder as Registry['admin.opening_hours.update']['types'],
  },
  'admin.closure_dates.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/admin/branches/:branchId/closure-dates',
    tokens: [[0,"api"],[0,"v1"],[0,"admin"],[0,"branches"],[1,"branchId"],[0,"closure-dates"]],
    types: placeholder as Registry['admin.closure_dates.index']['types'],
  },
  'admin.closure_dates.store': {
    methods: ["POST"],
    pattern: '/api/v1/admin/branches/:branchId/closure-dates',
    tokens: [[0,"api"],[0,"v1"],[0,"admin"],[0,"branches"],[1,"branchId"],[0,"closure-dates"]],
    types: placeholder as Registry['admin.closure_dates.store']['types'],
  },
  'admin.closure_dates.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/admin/branches/:branchId/closure-dates/:id',
    tokens: [[0,"api"],[0,"v1"],[0,"admin"],[0,"branches"],[1,"branchId"],[0,"closure-dates"],[1,"id"]],
    types: placeholder as Registry['admin.closure_dates.destroy']['types'],
  },
} as const satisfies Record<string, AdonisEndpoint>

export { routes }

export const registry = {
  routes,
  $tree: {} as ApiDefinition,
}

declare module '@tuyau/core/types' {
  export interface UserRegistry {
    routes: typeof routes
    $tree: ApiDefinition
  }
}
