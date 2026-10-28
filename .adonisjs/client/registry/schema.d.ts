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
  'public.public.site': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/public/site'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/public_controller').default['site']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/public_controller').default['site']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/public_controller').default['site']>>>
    }
  }
  'public.public.cars': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/public/cars'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/public').publicCarsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/public_controller').default['cars']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/public_controller').default['cars']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/public_controller').default['cars']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'public.public.car': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/public/cars/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/public').publicCarValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/public_controller').default['car']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/public_controller').default['car']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/public_controller').default['car']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'public.public.quote': {
    methods: ["POST"]
    pattern: '/api/v1/public/quotes'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/public').publicQuoteValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/public').publicQuoteValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/public_controller').default['quote']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/public_controller').default['quote']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/public_controller').default['quote']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'public.public.book': {
    methods: ["POST"]
    pattern: '/api/v1/public/bookings'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/public').publicBookingValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/public').publicBookingValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/public_controller').default['book']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/public_controller').default['book']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/public_controller').default['book']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'public.public.lookup': {
    methods: ["POST"]
    pattern: '/api/v1/public/bookings/lookup'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/public').publicLookupValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/public').publicLookupValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/public_controller').default['lookup']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/public_controller').default['lookup']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/public_controller').default['lookup']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'public.public.booking': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/public/bookings/:token'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { token: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/public_controller').default['booking']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/public_controller').default['booking']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/public_controller').default['booking']>>>
    }
  }
  'public.public.upload_proof': {
    methods: ["POST"]
    pattern: '/api/v1/public/bookings/:token/proof'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { token: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/public_controller').default['uploadProof']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/public_controller').default['uploadProof']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/public_controller').default['uploadProof']>>>
    }
  }
  'public.public.submit_payment': {
    methods: ["POST"]
    pattern: '/api/v1/public/bookings/:token/payments'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/public').publicPaymentValidator)>>
      paramsTuple: [ParamValue]
      params: { token: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/public').publicPaymentValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/public_controller').default['submitPayment']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/public_controller').default['submitPayment']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/public_controller').default['submitPayment']>>> | { status: 422; response: { errors: SimpleError[] } }
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
  'admin.today.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/today'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/today_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/today_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/today_controller').default['show']>>>
    }
  }
  'admin.calendar.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/calendar'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/booking').calendarValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/calendar_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/calendar_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/calendar_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
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
  'admin.bookings.agreement': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/bookings/:id/agreement.pdf'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/bookings_controller').default['agreement']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/bookings_controller').default['agreement']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/bookings_controller').default['agreement']>>>
    }
  }
  'admin.bookings.check_in_report': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/bookings/:id/check-in-report.pdf'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/bookings_controller').default['checkInReport']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/bookings_controller').default['checkInReport']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/bookings_controller').default['checkInReport']>>>
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
  'admin.bookings.preview_modification': {
    methods: ["POST"]
    pattern: '/api/v1/admin/bookings/:id/modifications/preview'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/booking').modificationValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/booking').modificationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/bookings_controller').default['previewModification']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/bookings_controller').default['previewModification']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/bookings_controller').default['previewModification']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.bookings.modify': {
    methods: ["POST"]
    pattern: '/api/v1/admin/bookings/:id/modifications'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/booking').modificationValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/booking').modificationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/bookings_controller').default['modify']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/bookings_controller').default['modify']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/bookings_controller').default['modify']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.bookings.assign_driver': {
    methods: ["PUT"]
    pattern: '/api/v1/admin/bookings/:id/driver'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/booking').assignDriverValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/booking').assignDriverValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/bookings_controller').default['assignDriver']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/bookings_controller').default['assignDriver']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/bookings_controller').default['assignDriver']>>> | { status: 422; response: { errors: SimpleError[] } }
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
  'admin.payments.for_booking': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/bookings/:id/payments'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/payments_controller').default['forBooking']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/payments_controller').default['forBooking']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/payments_controller').default['forBooking']>>>
    }
  }
  'admin.payments.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/payments'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/payment').listPaymentsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/payments_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/payments_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/payments_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.payments.receipt': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/payments/:id/receipt.pdf'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/payments_controller').default['receipt']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/payments_controller').default['receipt']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/payments_controller').default['receipt']>>>
    }
  }
  'admin.payments.store': {
    methods: ["POST"]
    pattern: '/api/v1/admin/bookings/:id/payments'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/payment').recordPaymentValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/payment').recordPaymentValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/payments_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/payments_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/payments_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.payments.settle_deposit': {
    methods: ["POST"]
    pattern: '/api/v1/admin/bookings/:id/deposit/settle'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/payment').settleDepositValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/payment').settleDepositValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/payments_controller').default['settleDeposit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/payments_controller').default['settleDeposit']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/payments_controller').default['settleDeposit']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.payments.verify': {
    methods: ["POST"]
    pattern: '/api/v1/admin/payments/:id/verify'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/payments_controller').default['verify']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/payments_controller').default['verify']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/payments_controller').default['verify']>>>
    }
  }
  'admin.payments.reject': {
    methods: ["POST"]
    pattern: '/api/v1/admin/payments/:id/reject'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/payment').paymentReasonValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/payment').paymentReasonValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/payments_controller').default['reject']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/payments_controller').default['reject']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/payments_controller').default['reject']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.payments.void': {
    methods: ["POST"]
    pattern: '/api/v1/admin/payments/:id/void'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/payment').paymentReasonValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/payment').paymentReasonValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/payments_controller').default['void']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/payments_controller').default['void']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/payments_controller').default['void']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.reports.overview': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/reports/overview'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/report').reportRangeValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/reports_controller').default['overview']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/reports_controller').default['overview']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/reports_controller').default['overview']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.reports.export': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/exports/:type'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { type: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/report').exportValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/reports_controller').default['export']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/reports_controller').default['export']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/reports_controller').default['export']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.maintenance.schedules': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/maintenance/schedules'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/maintenance').listSchedulesValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/maintenance_controller').default['schedules']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/maintenance_controller').default['schedules']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/maintenance_controller').default['schedules']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.maintenance.job_cards': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/job-cards'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/maintenance').listJobCardsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/maintenance_controller').default['jobCards']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/maintenance_controller').default['jobCards']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/maintenance_controller').default['jobCards']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.maintenance.show_job_card': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/job-cards/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/maintenance_controller').default['showJobCard']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/maintenance_controller').default['showJobCard']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/maintenance_controller').default['showJobCard']>>>
    }
  }
  'admin.maintenance.store_schedule': {
    methods: ["POST"]
    pattern: '/api/v1/admin/maintenance/schedules'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/maintenance').createScheduleValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/maintenance').createScheduleValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/maintenance_controller').default['storeSchedule']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/maintenance_controller').default['storeSchedule']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/maintenance_controller').default['storeSchedule']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.maintenance.update_schedule': {
    methods: ["PUT"]
    pattern: '/api/v1/admin/maintenance/schedules/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/maintenance').updateScheduleValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/maintenance').updateScheduleValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/maintenance_controller').default['updateSchedule']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/maintenance_controller').default['updateSchedule']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/maintenance_controller').default['updateSchedule']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.maintenance.destroy_schedule': {
    methods: ["DELETE"]
    pattern: '/api/v1/admin/maintenance/schedules/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/maintenance_controller').default['destroySchedule']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/maintenance_controller').default['destroySchedule']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/maintenance_controller').default['destroySchedule']>>>
    }
  }
  'admin.maintenance.open_job_card': {
    methods: ["POST"]
    pattern: '/api/v1/admin/job-cards'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/maintenance').openJobCardValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/maintenance').openJobCardValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/maintenance_controller').default['openJobCard']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/maintenance_controller').default['openJobCard']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/maintenance_controller').default['openJobCard']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.maintenance.update_job_card': {
    methods: ["PUT"]
    pattern: '/api/v1/admin/job-cards/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/maintenance').updateJobCardValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/maintenance').updateJobCardValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/maintenance_controller').default['updateJobCard']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/maintenance_controller').default['updateJobCard']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/maintenance_controller').default['updateJobCard']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.maintenance.complete_job_card': {
    methods: ["POST"]
    pattern: '/api/v1/admin/job-cards/:id/complete'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/maintenance').completeJobCardValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/maintenance').completeJobCardValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/maintenance_controller').default['completeJobCard']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/maintenance_controller').default['completeJobCard']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/maintenance_controller').default['completeJobCard']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.maintenance.cancel_job_card': {
    methods: ["POST"]
    pattern: '/api/v1/admin/job-cards/:id/cancel'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/maintenance').cancelJobCardValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/maintenance').cancelJobCardValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/maintenance_controller').default['cancelJobCard']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/maintenance_controller').default['cancelJobCard']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/maintenance_controller').default['cancelJobCard']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.incidents.match': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/incidents/match'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/incident').matchBookingValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/incidents_controller').default['match']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/incidents_controller').default['match']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/incidents_controller').default['match']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.incidents.incidents': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/incidents'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/incident').listIncidentsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/incidents_controller').default['incidents']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/incidents_controller').default['incidents']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/incidents_controller').default['incidents']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.incidents.show_incident': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/incidents/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/incidents_controller').default['showIncident']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/incidents_controller').default['showIncident']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/incidents_controller').default['showIncident']>>>
    }
  }
  'admin.incidents.fines': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/traffic-fines'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/incident').listFinesValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/incidents_controller').default['fines']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/incidents_controller').default['fines']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/incidents_controller').default['fines']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.incidents.damages': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/damages'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/incident').listDamagesValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/incidents_controller').default['damages']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/incidents_controller').default['damages']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/incidents_controller').default['damages']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.incidents.store_incident': {
    methods: ["POST"]
    pattern: '/api/v1/admin/incidents'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/incident').incidentValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/incident').incidentValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/incidents_controller').default['storeIncident']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/incidents_controller').default['storeIncident']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/incidents_controller').default['storeIncident']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.incidents.update_incident': {
    methods: ["PUT"]
    pattern: '/api/v1/admin/incidents/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/incident').incidentValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/incident').incidentValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/incidents_controller').default['updateIncident']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/incidents_controller').default['updateIncident']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/incidents_controller').default['updateIncident']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.incidents.charge_incident': {
    methods: ["POST"]
    pattern: '/api/v1/admin/incidents/:id/charge'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/incident').chargeIncidentValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/incident').chargeIncidentValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/incidents_controller').default['chargeIncident']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/incidents_controller').default['chargeIncident']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/incidents_controller').default['chargeIncident']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.incidents.close_incident': {
    methods: ["POST"]
    pattern: '/api/v1/admin/incidents/:id/close'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/incidents_controller').default['closeIncident']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/incidents_controller').default['closeIncident']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/incidents_controller').default['closeIncident']>>>
    }
  }
  'admin.incidents.reopen_incident': {
    methods: ["POST"]
    pattern: '/api/v1/admin/incidents/:id/reopen'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/incidents_controller').default['reopenIncident']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/incidents_controller').default['reopenIncident']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/incidents_controller').default['reopenIncident']>>>
    }
  }
  'admin.incidents.store_fine': {
    methods: ["POST"]
    pattern: '/api/v1/admin/traffic-fines'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/incident').fineValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/incident').fineValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/incidents_controller').default['storeFine']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/incidents_controller').default['storeFine']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/incidents_controller').default['storeFine']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.incidents.update_fine': {
    methods: ["PUT"]
    pattern: '/api/v1/admin/traffic-fines/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/incident').fineValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/incident').fineValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/incidents_controller').default['updateFine']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/incidents_controller').default['updateFine']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/incidents_controller').default['updateFine']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.incidents.charge_fine': {
    methods: ["POST"]
    pattern: '/api/v1/admin/traffic-fines/:id/charge'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/incidents_controller').default['chargeFine']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/incidents_controller').default['chargeFine']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/incidents_controller').default['chargeFine']>>>
    }
  }
  'admin.incidents.pay_fine': {
    methods: ["POST"]
    pattern: '/api/v1/admin/traffic-fines/:id/pay'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/incident').payFineValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/incident').payFineValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/incidents_controller').default['payFine']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/incidents_controller').default['payFine']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/incidents_controller').default['payFine']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.incidents.cancel_fine': {
    methods: ["POST"]
    pattern: '/api/v1/admin/traffic-fines/:id/cancel'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/incident').reasonValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/incident').reasonValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/incidents_controller').default['cancelFine']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/incidents_controller').default['cancelFine']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/incidents_controller').default['cancelFine']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.incidents.resolve_damage': {
    methods: ["POST"]
    pattern: '/api/v1/admin/damages/:id/resolve'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/incident').resolveDamageValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/incident').resolveDamageValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/incidents_controller').default['resolveDamage']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/incidents_controller').default['resolveDamage']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/incidents_controller').default['resolveDamage']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.incidents.reopen_damage': {
    methods: ["POST"]
    pattern: '/api/v1/admin/damages/:id/reopen'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/incidents_controller').default['reopenDamage']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/incidents_controller').default['reopenDamage']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/incidents_controller').default['reopenDamage']>>>
    }
  }
  'admin.invoices.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/invoices'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/invoice').listInvoicesValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/invoices_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/invoices_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/invoices_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.invoices.pdf': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/invoices/:id/invoice.pdf'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/invoices_controller').default['pdf']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/invoices_controller').default['pdf']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/invoices_controller').default['pdf']>>>
    }
  }
  'admin.invoices.credit_note_pdf': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/credit-notes/:id/credit-note.pdf'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/invoices_controller').default['creditNotePdf']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/invoices_controller').default['creditNotePdf']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/invoices_controller').default['creditNotePdf']>>>
    }
  }
  'admin.invoices.for_booking': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/bookings/:id/invoices'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/invoices_controller').default['forBooking']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/invoices_controller').default['forBooking']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/invoices_controller').default['forBooking']>>>
    }
  }
  'admin.invoices.store': {
    methods: ["POST"]
    pattern: '/api/v1/admin/bookings/:id/invoices'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/invoice').issueInvoiceValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/invoice').issueInvoiceValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/invoices_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/invoices_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/invoices_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.invoices.credit': {
    methods: ["POST"]
    pattern: '/api/v1/admin/invoices/:id/credit-note'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/invoice').creditNoteValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/invoice').creditNoteValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/invoices_controller').default['credit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/invoices_controller').default['credit']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/invoices_controller').default['credit']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.invoices.send': {
    methods: ["POST"]
    pattern: '/api/v1/admin/invoices/:id/send'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/invoice').sendInvoiceValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/invoice').sendInvoiceValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/invoices_controller').default['send']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/invoices_controller').default['send']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/invoices_controller').default['send']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.expenses.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/expenses'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/expense').listExpensesValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/expenses_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/expenses_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/expenses_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.expenses.options': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/expenses/options'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/expenses_controller').default['options']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/expenses_controller').default['options']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/expenses_controller').default['options']>>>
    }
  }
  'admin.expenses.store': {
    methods: ["POST"]
    pattern: '/api/v1/admin/expenses'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/expense').expenseValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/expense').expenseValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/expenses_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/expenses_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/expenses_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.expenses.update': {
    methods: ["PUT"]
    pattern: '/api/v1/admin/expenses/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/expense').expenseValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/expense').expenseValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/expenses_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/expenses_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/expenses_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.expenses.approve': {
    methods: ["POST"]
    pattern: '/api/v1/admin/expenses/:id/approve'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/expenses_controller').default['approve']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/expenses_controller').default['approve']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/expenses_controller').default['approve']>>>
    }
  }
  'admin.expenses.reject': {
    methods: ["POST"]
    pattern: '/api/v1/admin/expenses/:id/reject'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/expense').rejectExpenseValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/expense').rejectExpenseValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/expenses_controller').default['reject']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/expenses_controller').default['reject']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/expenses_controller').default['reject']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.handover.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/bookings/:id/check-out'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/handover_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/handover_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/handover_controller').default['show']>>>
    }
  }
  'admin.handover.save': {
    methods: ["PUT"]
    pattern: '/api/v1/admin/bookings/:id/check-out'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/handover').saveInspectionValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/handover').saveInspectionValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/handover_controller').default['save']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/handover_controller').default['save']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/handover_controller').default['save']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.handover.add_damage': {
    methods: ["POST"]
    pattern: '/api/v1/admin/bookings/:id/check-out/damages'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/handover').damageValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/handover').damageValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/handover_controller').default['addDamage']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/handover_controller').default['addDamage']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/handover_controller').default['addDamage']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.handover.remove_damage': {
    methods: ["DELETE"]
    pattern: '/api/v1/admin/bookings/:id/check-out/damages/:damageId'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { id: ParamValue; damageId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/handover_controller').default['removeDamage']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/handover_controller').default['removeDamage']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/handover_controller').default['removeDamage']>>>
    }
  }
  'admin.handover.complete_check_out': {
    methods: ["POST"]
    pattern: '/api/v1/admin/bookings/:id/check-out/complete'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/handover').completeCheckOutValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/handover').completeCheckOutValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/handover_controller').default['completeCheckOut']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/handover_controller').default['completeCheckOut']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/handover_controller').default['completeCheckOut']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.checkIn.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/bookings/:id/check-in'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/handover_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/handover_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/handover_controller').default['show']>>>
    }
  }
  'admin.checkIn.save': {
    methods: ["PUT"]
    pattern: '/api/v1/admin/bookings/:id/check-in'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/handover').saveInspectionValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/handover').saveInspectionValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/handover_controller').default['save']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/handover_controller').default['save']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/handover_controller').default['save']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.checkIn.addDamage': {
    methods: ["POST"]
    pattern: '/api/v1/admin/bookings/:id/check-in/damages'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/handover').damageValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/handover').damageValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/handover_controller').default['addDamage']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/handover_controller').default['addDamage']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/handover_controller').default['addDamage']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.checkIn.removeDamage': {
    methods: ["DELETE"]
    pattern: '/api/v1/admin/bookings/:id/check-in/damages/:damageId'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { id: ParamValue; damageId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/handover_controller').default['removeDamage']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/handover_controller').default['removeDamage']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/handover_controller').default['removeDamage']>>>
    }
  }
  'admin.handover.complete_check_in': {
    methods: ["POST"]
    pattern: '/api/v1/admin/bookings/:id/check-in/complete'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/handover').completeCheckInValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/handover').completeCheckInValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/handover_controller').default['completeCheckIn']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/handover_controller').default['completeCheckIn']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/handover_controller').default['completeCheckIn']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.terms.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/terms'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/terms_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/terms_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/terms_controller').default['show']>>>
    }
  }
  'admin.terms.checklist': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/checklist-items'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/terms_controller').default['checklist']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/terms_controller').default['checklist']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/terms_controller').default['checklist']>>>
    }
  }
  'admin.terms.store': {
    methods: ["POST"]
    pattern: '/api/v1/admin/terms'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/handover').termsValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/handover').termsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/terms_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/terms_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/terms_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.terms.save_checklist': {
    methods: ["PUT"]
    pattern: '/api/v1/admin/checklist-items'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/handover').checklistValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/handover').checklistValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/terms_controller').default['saveChecklist']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/terms_controller').default['saveChecklist']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/terms_controller').default['saveChecklist']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.drivers.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/drivers'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/booking').driverFilterValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/drivers_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/drivers_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/drivers_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.drivers.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/drivers/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/drivers_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/drivers_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/drivers_controller').default['show']>>>
    }
  }
  'admin.drivers.store': {
    methods: ["POST"]
    pattern: '/api/v1/admin/drivers'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/booking').driverValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/booking').driverValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/drivers_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/drivers_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/drivers_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.drivers.update': {
    methods: ["PUT"]
    pattern: '/api/v1/admin/drivers/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/booking').driverValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/booking').driverValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/drivers_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/drivers_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/drivers_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
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
  'admin.business.update_logo': {
    methods: ["PUT"]
    pattern: '/api/v1/admin/business/logo'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/business_controller').default['updateLogo']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/business_controller').default['updateLogo']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/business_controller').default['updateLogo']>>>
    }
  }
  'admin.business.remove_logo': {
    methods: ["DELETE"]
    pattern: '/api/v1/admin/business/logo'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/business_controller').default['removeLogo']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/business_controller').default['removeLogo']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/business_controller').default['removeLogo']>>>
    }
  }
  'admin.business.update_cover': {
    methods: ["PUT"]
    pattern: '/api/v1/admin/business/cover'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/business_controller').default['updateCover']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/business_controller').default['updateCover']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/business_controller').default['updateCover']>>>
    }
  }
  'admin.business.remove_cover': {
    methods: ["DELETE"]
    pattern: '/api/v1/admin/business/cover'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/business_controller').default['removeCover']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/business_controller').default['removeCover']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/business_controller').default['removeCover']>>>
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
  'admin.alert_recipients.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/alert-recipients'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/alert_recipients_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/alert_recipients_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/alert_recipients_controller').default['index']>>>
    }
  }
  'admin.alert_recipients.store': {
    methods: ["POST"]
    pattern: '/api/v1/admin/alert-recipients'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/alert_recipients_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/alert_recipients_controller').default['store']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/alert_recipients_controller').default['store']>>>
    }
  }
  'admin.alert_recipients.update': {
    methods: ["PUT"]
    pattern: '/api/v1/admin/alert-recipients/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/alert_recipients_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/alert_recipients_controller').default['update']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/alert_recipients_controller').default['update']>>>
    }
  }
  'admin.alert_recipients.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/admin/alert-recipients/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/alert_recipients_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/alert_recipients_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/alert_recipients_controller').default['destroy']>>>
    }
  }
  'admin.alert_recipients.test': {
    methods: ["POST"]
    pattern: '/api/v1/admin/alert-recipients/:id/test'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/alert_recipients_controller').default['test']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/alert_recipients_controller').default['test']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/admin/alert_recipients_controller').default['test']>>>
    }
  }
}
