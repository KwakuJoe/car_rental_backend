/* eslint-disable prettier/prettier */
/// <reference path="../manifest.d.ts" />

import type { ExtractBody, ExtractErrorResponse, ExtractQuery, ExtractQueryForGet, ExtractRawResponse, ExtractResponse } from '@tuyau/core/types'
import type { InferInput, SimpleError } from '@vinejs/vine/types'

export type ParamValue = string | number | bigint | boolean

export interface Registry {
  'auth.access_tokens.store': {
    methods: ["POST"]
    pattern: '/api/v1/auth/login'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').loginValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').loginValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/access_tokens_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/access_tokens_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/access_tokens_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'account.profile.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/account/profile'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['show']>>>
    }
  }
  'account.access_tokens.destroy': {
    methods: ["POST"]
    pattern: '/api/v1/account/logout'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/access_tokens_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/access_tokens_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/access_tokens_controller').default['destroy']>>>
    }
  }
  'account.change_password.store': {
    methods: ["POST"]
    pattern: '/api/v1/account/change-password'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').changePasswordValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').changePasswordValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/change_password_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/change_password_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/change_password_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.users.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/users'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/user').userFilterValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/users_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/users_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/users_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.users.store': {
    methods: ["POST"]
    pattern: '/api/v1/admin/users'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').createStaffUserValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').createStaffUserValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/users_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/users_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/users_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.users.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/users/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/users_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/users_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/users_controller').default['show']>>>
    }
  }
  'admin.users.update': {
    methods: ["PUT"]
    pattern: '/api/v1/admin/users/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').updateStaffUserValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/user').updateStaffUserValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/users_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/users_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/users_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.users.reset_password': {
    methods: ["POST"]
    pattern: '/api/v1/admin/users/:id/reset-password'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/users_controller').default['resetPassword']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/users_controller').default['resetPassword']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/users_controller').default['resetPassword']>>>
    }
  }
  'admin.roles.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/roles'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/role').roleFilterValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/roles_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/roles_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/roles_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.roles.store': {
    methods: ["POST"]
    pattern: '/api/v1/admin/roles'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/role').createRoleValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/role').createRoleValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/roles_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/roles_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/roles_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.roles.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/roles/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/roles_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/roles_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/roles_controller').default['show']>>>
    }
  }
  'admin.roles.update': {
    methods: ["PUT"]
    pattern: '/api/v1/admin/roles/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/role').updateRoleValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/role').updateRoleValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/roles_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/roles_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/roles_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.roles.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/admin/roles/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/roles_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/roles_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/roles_controller').default['destroy']>>>
    }
  }
  'admin.roles.sync_permissions': {
    methods: ["PUT"]
    pattern: '/api/v1/admin/roles/:id/permissions'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/role').syncRolePermissionsValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/role').syncRolePermissionsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/roles_controller').default['syncPermissions']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/roles_controller').default['syncPermissions']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/roles_controller').default['syncPermissions']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.permissions.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/permissions'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/permission').permissionFilterValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/permissions_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/permissions_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/permissions_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.audit_logs.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/audit-logs'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/audit_log').auditLogFilterValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/audit_logs_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/audit_logs_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/audit_logs_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.audit_logs.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/audit-logs/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/audit_logs_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/audit_logs_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/audit_logs_controller').default['show']>>>
    }
  }
  'admin.lookups.lookups.business': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/lookups/business'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/lookups_controller').default['business']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/lookups_controller').default['business']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/lookups_controller').default['business']>>>
    }
  }
  'admin.lookups.lookups.roles': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/lookups/roles'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/lookups_controller').default['roles']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/lookups_controller').default['roles']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/lookups_controller').default['roles']>>>
    }
  }
  'admin.lookups.lookups.branches': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/lookups/branches'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/lookups_controller').default['branches']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/lookups_controller').default['branches']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/lookups_controller').default['branches']>>>
    }
  }
  'admin.lookups.lookups.staff': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/lookups/staff'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/lookups_controller').default['staff']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/lookups_controller').default['staff']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/lookups_controller').default['staff']>>>
    }
  }
  'admin.lookups.lookups.categories': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/lookups/categories'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/lookups_controller').default['categories']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/lookups_controller').default['categories']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/lookups_controller').default['categories']>>>
    }
  }
  'admin.files.upload': {
    methods: ["POST"]
    pattern: '/api/v1/admin/files/upload'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/file').uploadFileMetadataValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/file').uploadFileMetadataValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/files_controller').default['upload']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/files_controller').default['upload']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/files_controller').default['upload']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.files.import_from_url': {
    methods: ["POST"]
    pattern: '/api/v1/admin/files/import'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/file').importFileFromUrlValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/file').importFileFromUrlValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/files_controller').default['importFromUrl']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/files_controller').default['importFromUrl']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/files_controller').default['importFromUrl']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.files.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/files/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/files_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/files_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/files_controller').default['show']>>>
    }
  }
  'admin.files.signed_url': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/files/:id/url'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/file').getSignedUrlValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/files_controller').default['signedUrl']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/files_controller').default['signedUrl']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/files_controller').default['signedUrl']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.files.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/admin/files/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/files_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/files_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/files_controller').default['destroy']>>>
    }
  }
  'admin.notifications.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/notifications'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/notification').listNotificationsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/notifications_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/notifications_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/notifications_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.notifications.unread_count': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/notifications/unread-count'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/notifications_controller').default['unreadCount']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/notifications_controller').default['unreadCount']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/notifications_controller').default['unreadCount']>>>
    }
  }
  'admin.notifications.mark_read': {
    methods: ["PATCH"]
    pattern: '/api/v1/admin/notifications/:id/read'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/notifications_controller').default['markRead']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/notifications_controller').default['markRead']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/notifications_controller').default['markRead']>>>
    }
  }
  'admin.notifications.mark_all_read': {
    methods: ["POST"]
    pattern: '/api/v1/admin/notifications/read-all'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/notifications_controller').default['markAllRead']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/notifications_controller').default['markAllRead']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/notifications_controller').default['markAllRead']>>>
    }
  }
  'admin.notifications.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/admin/notifications/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/notifications_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/notifications_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/notifications_controller').default['destroy']>>>
    }
  }
  'admin.categories.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/categories'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/category').categoryFilterValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/categories_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/categories_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/categories_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.categories.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/categories/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/categories_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/categories_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/categories_controller').default['show']>>>
    }
  }
  'admin.cars.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/cars'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/car').carFilterValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/cars_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/cars_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/cars_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.cars.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/cars/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/cars_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/cars_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/cars_controller').default['show']>>>
    }
  }
  'admin.cars.odometer_history': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/cars/:id/odometer-history'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/cars_controller').default['odometerHistory']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/cars_controller').default['odometerHistory']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/cars_controller').default['odometerHistory']>>>
    }
  }
  'admin.car_blocks.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/cars/:carId/blocks'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { carId: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/car_block').listCarBlocksValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/car_blocks_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/car_blocks_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/car_blocks_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.vehicle_documents.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/cars/:carId/documents'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { carId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/vehicle_documents_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/vehicle_documents_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/vehicle_documents_controller').default['index']>>>
    }
  }
  'admin.vehicle_documents.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/cars/:carId/documents/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { carId: ParamValue; id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/vehicle_documents_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/vehicle_documents_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/vehicle_documents_controller').default['show']>>>
    }
  }
  'admin.vehicle_documents.expiring': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/documents/expiring'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/vehicle_document').listExpiringDocumentsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/vehicle_documents_controller').default['expiring']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/vehicle_documents_controller').default['expiring']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/vehicle_documents_controller').default['expiring']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.categories.store': {
    methods: ["POST"]
    pattern: '/api/v1/admin/categories'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/category').createCategoryValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/category').createCategoryValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/categories_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/categories_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/categories_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.categories.update': {
    methods: ["PUT"]
    pattern: '/api/v1/admin/categories/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/category').updateCategoryValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/category').updateCategoryValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/categories_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/categories_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/categories_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.categories.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/admin/categories/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/categories_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/categories_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/categories_controller').default['destroy']>>>
    }
  }
  'admin.cars.store': {
    methods: ["POST"]
    pattern: '/api/v1/admin/cars'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/car').createCarValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/car').createCarValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/cars_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/cars_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/cars_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.cars.update': {
    methods: ["PUT"]
    pattern: '/api/v1/admin/cars/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/car').updateCarValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/car').updateCarValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/cars_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/cars_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/cars_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.cars.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/admin/cars/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/cars_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/cars_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/cars_controller').default['destroy']>>>
    }
  }
  'admin.cars.update_status': {
    methods: ["PUT"]
    pattern: '/api/v1/admin/cars/:id/status'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/car').updateCarStatusValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/car').updateCarStatusValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/cars_controller').default['updateStatus']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/cars_controller').default['updateStatus']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/cars_controller').default['updateStatus']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.cars.update_odometer': {
    methods: ["POST"]
    pattern: '/api/v1/admin/cars/:id/odometer'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/car').updateOdometerValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/car').updateOdometerValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/cars_controller').default['updateOdometer']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/cars_controller').default['updateOdometer']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/cars_controller').default['updateOdometer']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.cars.add_photo': {
    methods: ["POST"]
    pattern: '/api/v1/admin/cars/:id/photos'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/car').attachCarPhotoValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/car').attachCarPhotoValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/cars_controller').default['addPhoto']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/cars_controller').default['addPhoto']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/cars_controller').default['addPhoto']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.cars.reorder_photos': {
    methods: ["PUT"]
    pattern: '/api/v1/admin/cars/:id/photos/reorder'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/car').reorderPhotosValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/car').reorderPhotosValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/cars_controller').default['reorderPhotos']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/cars_controller').default['reorderPhotos']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/cars_controller').default['reorderPhotos']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.cars.set_cover_photo': {
    methods: ["PUT"]
    pattern: '/api/v1/admin/cars/:id/photos/:photoId/cover'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { id: ParamValue; photoId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/cars_controller').default['setCoverPhoto']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/cars_controller').default['setCoverPhoto']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/cars_controller').default['setCoverPhoto']>>>
    }
  }
  'admin.cars.delete_photo': {
    methods: ["DELETE"]
    pattern: '/api/v1/admin/cars/:id/photos/:photoId'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { id: ParamValue; photoId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/cars_controller').default['deletePhoto']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/cars_controller').default['deletePhoto']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/cars_controller').default['deletePhoto']>>>
    }
  }
  'admin.car_blocks.store': {
    methods: ["POST"]
    pattern: '/api/v1/admin/cars/:carId/blocks'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/car_block').createCarBlockValidator)>>
      paramsTuple: [ParamValue]
      params: { carId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/car_block').createCarBlockValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/car_blocks_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/car_blocks_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/car_blocks_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.car_blocks.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/admin/cars/:carId/blocks/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { carId: ParamValue; id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/car_blocks_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/car_blocks_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/car_blocks_controller').default['destroy']>>>
    }
  }
  'admin.vehicle_documents.store': {
    methods: ["POST"]
    pattern: '/api/v1/admin/cars/:carId/documents'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/vehicle_document').createVehicleDocumentValidator)>>
      paramsTuple: [ParamValue]
      params: { carId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/vehicle_document').createVehicleDocumentValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/vehicle_documents_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/vehicle_documents_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/vehicle_documents_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.vehicle_documents.update': {
    methods: ["PUT"]
    pattern: '/api/v1/admin/cars/:carId/documents/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/vehicle_document').updateVehicleDocumentValidator)>>
      paramsTuple: [ParamValue, ParamValue]
      params: { carId: ParamValue; id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/vehicle_document').updateVehicleDocumentValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/vehicle_documents_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/vehicle_documents_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/vehicle_documents_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.vehicle_documents.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/admin/cars/:carId/documents/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { carId: ParamValue; id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/vehicle_documents_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/vehicle_documents_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/vehicle_documents_controller').default['destroy']>>>
    }
  }
  'admin.customers.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/customers'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/customers_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/customers_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/customers_controller').default['index']>>>
    }
  }
  'admin.customers.duplicates': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/customers/duplicates'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/customers_controller').default['duplicates']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/customers_controller').default['duplicates']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/customers_controller').default['duplicates']>>>
    }
  }
  'admin.customers.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/customers/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/customers_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/customers_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/customers_controller').default['show']>>>
    }
  }
  'admin.blacklist.check': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/blacklist/check'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/customer').blacklistCheckValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/blacklist_controller').default['check']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/blacklist_controller').default['check']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/blacklist_controller').default['check']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.customers.store': {
    methods: ["POST"]
    pattern: '/api/v1/admin/customers'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/customers_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/customers_controller').default['store']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/customers_controller').default['store']>>>
    }
  }
  'admin.customers.update': {
    methods: ["PUT"]
    pattern: '/api/v1/admin/customers/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/customers_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/customers_controller').default['update']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/customers_controller').default['update']>>>
    }
  }
  'admin.customers.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/admin/customers/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/customers_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/customers_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/customers_controller').default['destroy']>>>
    }
  }
  'admin.customer_identities.store': {
    methods: ["POST"]
    pattern: '/api/v1/admin/customers/:customerId/identities'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { customerId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/customer_identities_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/customer_identities_controller').default['store']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/customer_identities_controller').default['store']>>>
    }
  }
  'admin.customer_identities.update': {
    methods: ["PUT"]
    pattern: '/api/v1/admin/customers/:customerId/identities/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { customerId: ParamValue; id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/customer_identities_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/customer_identities_controller').default['update']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/customer_identities_controller').default['update']>>>
    }
  }
  'admin.customer_identities.verify': {
    methods: ["POST"]
    pattern: '/api/v1/admin/customers/:customerId/identities/:id/verify'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { customerId: ParamValue; id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/customer_identities_controller').default['verify']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/customer_identities_controller').default['verify']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/customer_identities_controller').default['verify']>>>
    }
  }
  'admin.customer_identities.reject': {
    methods: ["POST"]
    pattern: '/api/v1/admin/customers/:customerId/identities/:id/reject'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { customerId: ParamValue; id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/customer_identities_controller').default['reject']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/customer_identities_controller').default['reject']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/customer_identities_controller').default['reject']>>>
    }
  }
  'admin.blacklist.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/blacklist'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/customer').blacklistFilterValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/blacklist_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/blacklist_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/blacklist_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.blacklist.store': {
    methods: ["POST"]
    pattern: '/api/v1/admin/blacklist'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/customer').createBlacklistValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/customer').createBlacklistValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/blacklist_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/blacklist_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/blacklist_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.blacklist.lift': {
    methods: ["POST"]
    pattern: '/api/v1/admin/blacklist/:id/lift'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/customer').liftBlacklistValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/customer').liftBlacklistValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/blacklist_controller').default['lift']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/blacklist_controller').default['lift']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/blacklist_controller').default['lift']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.availability.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/availability'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/booking').availabilityValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/availability_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/availability_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/availability_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.bookings.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/bookings'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/booking').bookingFilterValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/bookings_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/bookings_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/bookings_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.bookings.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/bookings/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/bookings_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/bookings_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/bookings_controller').default['show']>>>
    }
  }
  'admin.bookings.history': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/bookings/:id/history'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/bookings_controller').default['history']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/bookings_controller').default['history']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/bookings_controller').default['history']>>>
    }
  }
  'admin.bookings.cancellation_preview': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/bookings/:id/cancellation-preview'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/bookings_controller').default['cancellationPreview']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/bookings_controller').default['cancellationPreview']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/bookings_controller').default['cancellationPreview']>>>
    }
  }
  'admin.quotes.store': {
    methods: ["POST"]
    pattern: '/api/v1/admin/quotes'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/quote').quoteValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/quote').quoteValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/quotes_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/quotes_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/quotes_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.bookings.store': {
    methods: ["POST"]
    pattern: '/api/v1/admin/bookings'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/booking').createBookingValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/booking').createBookingValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/bookings_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/bookings_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/bookings_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.bookings.update': {
    methods: ["PUT"]
    pattern: '/api/v1/admin/bookings/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/booking').updateBookingValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/booking').updateBookingValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/bookings_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/bookings_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/bookings_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.bookings.confirm': {
    methods: ["POST"]
    pattern: '/api/v1/admin/bookings/:id/confirm'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/bookings_controller').default['confirm']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/bookings_controller').default['confirm']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/bookings_controller').default['confirm']>>>
    }
  }
  'admin.bookings.cancel': {
    methods: ["POST"]
    pattern: '/api/v1/admin/bookings/:id/cancel'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/booking').cancelBookingValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/booking').cancelBookingValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/bookings_controller').default['cancel']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/bookings_controller').default['cancel']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/bookings_controller').default['cancel']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.bookings.no_show': {
    methods: ["POST"]
    pattern: '/api/v1/admin/bookings/:id/no-show'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/bookings_controller').default['noShow']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/bookings_controller').default['noShow']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/bookings_controller').default['noShow']>>>
    }
  }
  'admin.rate_plans.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/rate-plans'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/rate_plans_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/rate_plans_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/rate_plans_controller').default['index']>>>
    }
  }
  'admin.rate_plans.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/rate-plans/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/rate_plans_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/rate_plans_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/rate_plans_controller').default['show']>>>
    }
  }
  'admin.pricing_rules.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/pricing-rules'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/pricing_rules_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/pricing_rules_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/pricing_rules_controller').default['index']>>>
    }
  }
  'admin.pricing_rules.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/pricing-rules/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/pricing_rules_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/pricing_rules_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/pricing_rules_controller').default['show']>>>
    }
  }
  'admin.extras.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/extras'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/pricing_catalog').catalogFilterValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/extras_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/extras_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/extras_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.protection_plans.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/protection-plans'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/pricing_catalog').catalogFilterValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/protection_plans_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/protection_plans_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/protection_plans_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.delivery_zones.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/delivery-zones'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/pricing_catalog').catalogFilterValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/delivery_zones_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/delivery_zones_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/delivery_zones_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.fees.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/fees'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/pricing_catalog').catalogFilterValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/fees_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/fees_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/fees_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.taxes.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/taxes'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/pricing_catalog').catalogFilterValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/taxes_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/taxes_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/taxes_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.rate_plans.store': {
    methods: ["POST"]
    pattern: '/api/v1/admin/rate-plans'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/rate_plans_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/rate_plans_controller').default['store']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/rate_plans_controller').default['store']>>>
    }
  }
  'admin.rate_plans.update': {
    methods: ["PUT"]
    pattern: '/api/v1/admin/rate-plans/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/rate_plans_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/rate_plans_controller').default['update']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/rate_plans_controller').default['update']>>>
    }
  }
  'admin.pricing_rules.store': {
    methods: ["POST"]
    pattern: '/api/v1/admin/pricing-rules'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/pricing_rules_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/pricing_rules_controller').default['store']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/pricing_rules_controller').default['store']>>>
    }
  }
  'admin.pricing_rules.update': {
    methods: ["PUT"]
    pattern: '/api/v1/admin/pricing-rules/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/pricing_rules_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/pricing_rules_controller').default['update']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/pricing_rules_controller').default['update']>>>
    }
  }
  'admin.pricing_rules.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/admin/pricing-rules/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/pricing_rules_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/pricing_rules_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/pricing_rules_controller').default['destroy']>>>
    }
  }
  'admin.protection_plans.store': {
    methods: ["POST"]
    pattern: '/api/v1/admin/protection-plans'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/pricing_catalog').protectionPlanValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/pricing_catalog').protectionPlanValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/protection_plans_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/protection_plans_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/protection_plans_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.protection_plans.update': {
    methods: ["PUT"]
    pattern: '/api/v1/admin/protection-plans/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/pricing_catalog').protectionPlanValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/pricing_catalog').protectionPlanValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/protection_plans_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/protection_plans_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/protection_plans_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.delivery_zones.store': {
    methods: ["POST"]
    pattern: '/api/v1/admin/delivery-zones'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/pricing_catalog').deliveryZoneValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/pricing_catalog').deliveryZoneValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/delivery_zones_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/delivery_zones_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/delivery_zones_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.delivery_zones.update': {
    methods: ["PUT"]
    pattern: '/api/v1/admin/delivery-zones/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/pricing_catalog').deliveryZoneValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/pricing_catalog').deliveryZoneValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/delivery_zones_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/delivery_zones_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/delivery_zones_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.fees.store': {
    methods: ["POST"]
    pattern: '/api/v1/admin/fees'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/pricing_catalog').createFeeValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/pricing_catalog').createFeeValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/fees_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/fees_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/fees_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.fees.update': {
    methods: ["PUT"]
    pattern: '/api/v1/admin/fees/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/pricing_catalog').updateFeeValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/pricing_catalog').updateFeeValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/fees_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/fees_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/fees_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.extras.store': {
    methods: ["POST"]
    pattern: '/api/v1/admin/extras'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/pricing_catalog').extraValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/pricing_catalog').extraValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/extras_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/extras_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/extras_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.extras.update': {
    methods: ["PUT"]
    pattern: '/api/v1/admin/extras/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/pricing_catalog').extraValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/pricing_catalog').extraValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/extras_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/extras_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/extras_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.taxes.store': {
    methods: ["POST"]
    pattern: '/api/v1/admin/taxes'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/tax').taxValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/tax').taxValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/taxes_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/taxes_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/taxes_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.taxes.update': {
    methods: ["PUT"]
    pattern: '/api/v1/admin/taxes/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/tax').taxValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/tax').taxValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/taxes_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/taxes_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/taxes_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.settings.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/settings'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/settings_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/settings_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/settings_controller').default['index']>>>
    }
  }
  'admin.settings.update': {
    methods: ["PUT"]
    pattern: '/api/v1/admin/settings'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/setting').updateSettingsValidator)>|InferInput<(typeof import('#services/settings/settings_service').default)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/setting').updateSettingsValidator)>|InferInput<(typeof import('#services/settings/settings_service').default)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/settings_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/settings_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/settings_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.business.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/business'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/business_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/business_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/business_controller').default['show']>>>
    }
  }
  'admin.business.update': {
    methods: ["PUT"]
    pattern: '/api/v1/admin/business'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/business').updateBusinessValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/business').updateBusinessValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/business_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/business_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/business_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.branches.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/branches'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/branch').branchFilterValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/branches_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/branches_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/branches_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.branches.store': {
    methods: ["POST"]
    pattern: '/api/v1/admin/branches'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/branch').createBranchValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/branch').createBranchValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/branches_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/branches_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/branches_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.branches.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/branches/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/branches_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/branches_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/branches_controller').default['show']>>>
    }
  }
  'admin.branches.update': {
    methods: ["PUT"]
    pattern: '/api/v1/admin/branches/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/branch').updateBranchValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/branch').updateBranchValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/branches_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/branches_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/branches_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.branches.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/admin/branches/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/branches_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/branches_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/branches_controller').default['destroy']>>>
    }
  }
  'admin.opening_hours.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/branches/:branchId/opening-hours'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { branchId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/opening_hours_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/opening_hours_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/opening_hours_controller').default['index']>>>
    }
  }
  'admin.opening_hours.update': {
    methods: ["PUT"]
    pattern: '/api/v1/admin/branches/:branchId/opening-hours'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/branch').updateOpeningHoursValidator)>>
      paramsTuple: [ParamValue]
      params: { branchId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/branch').updateOpeningHoursValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/opening_hours_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/opening_hours_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/opening_hours_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.closure_dates.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/branches/:branchId/closure-dates'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { branchId: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/branch').closureDateFilterValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/closure_dates_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/closure_dates_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/closure_dates_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.closure_dates.store': {
    methods: ["POST"]
    pattern: '/api/v1/admin/branches/:branchId/closure-dates'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/branch').createClosureDateValidator)>>
      paramsTuple: [ParamValue]
      params: { branchId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/branch').createClosureDateValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/closure_dates_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/closure_dates_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/closure_dates_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.closure_dates.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/admin/branches/:branchId/closure-dates/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { branchId: ParamValue; id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/closure_dates_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/closure_dates_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/closure_dates_controller').default['destroy']>>>
    }
  }
}
