import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'auth.access_tokens.store': { paramsTuple?: []; params?: {} }
    'account.profile.show': { paramsTuple?: []; params?: {} }
    'account.access_tokens.destroy': { paramsTuple?: []; params?: {} }
    'account.change_password.store': { paramsTuple?: []; params?: {} }
    'admin.users.index': { paramsTuple?: []; params?: {} }
    'admin.users.store': { paramsTuple?: []; params?: {} }
    'admin.users.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.users.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.users.reset_password': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.roles.index': { paramsTuple?: []; params?: {} }
    'admin.roles.store': { paramsTuple?: []; params?: {} }
    'admin.roles.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.roles.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.roles.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.roles.sync_permissions': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.permissions.index': { paramsTuple?: []; params?: {} }
    'admin.lookups.lookups.business': { paramsTuple?: []; params?: {} }
    'admin.lookups.lookups.roles': { paramsTuple?: []; params?: {} }
    'admin.lookups.lookups.branches': { paramsTuple?: []; params?: {} }
    'admin.business.show': { paramsTuple?: []; params?: {} }
    'admin.business.update': { paramsTuple?: []; params?: {} }
    'admin.branches.index': { paramsTuple?: []; params?: {} }
    'admin.branches.store': { paramsTuple?: []; params?: {} }
    'admin.branches.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.branches.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.branches.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.opening_hours.index': { paramsTuple: [ParamValue]; params: {'branchId': ParamValue} }
    'admin.opening_hours.update': { paramsTuple: [ParamValue]; params: {'branchId': ParamValue} }
    'admin.closure_dates.index': { paramsTuple: [ParamValue]; params: {'branchId': ParamValue} }
    'admin.closure_dates.store': { paramsTuple: [ParamValue]; params: {'branchId': ParamValue} }
    'admin.closure_dates.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'branchId': ParamValue,'id': ParamValue} }
  }
  GET: {
    'account.profile.show': { paramsTuple?: []; params?: {} }
    'admin.users.index': { paramsTuple?: []; params?: {} }
    'admin.users.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.roles.index': { paramsTuple?: []; params?: {} }
    'admin.roles.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.permissions.index': { paramsTuple?: []; params?: {} }
    'admin.lookups.lookups.business': { paramsTuple?: []; params?: {} }
    'admin.lookups.lookups.roles': { paramsTuple?: []; params?: {} }
    'admin.lookups.lookups.branches': { paramsTuple?: []; params?: {} }
    'admin.business.show': { paramsTuple?: []; params?: {} }
    'admin.branches.index': { paramsTuple?: []; params?: {} }
    'admin.branches.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.opening_hours.index': { paramsTuple: [ParamValue]; params: {'branchId': ParamValue} }
    'admin.closure_dates.index': { paramsTuple: [ParamValue]; params: {'branchId': ParamValue} }
  }
  HEAD: {
    'account.profile.show': { paramsTuple?: []; params?: {} }
    'admin.users.index': { paramsTuple?: []; params?: {} }
    'admin.users.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.roles.index': { paramsTuple?: []; params?: {} }
    'admin.roles.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.permissions.index': { paramsTuple?: []; params?: {} }
    'admin.lookups.lookups.business': { paramsTuple?: []; params?: {} }
    'admin.lookups.lookups.roles': { paramsTuple?: []; params?: {} }
    'admin.lookups.lookups.branches': { paramsTuple?: []; params?: {} }
    'admin.business.show': { paramsTuple?: []; params?: {} }
    'admin.branches.index': { paramsTuple?: []; params?: {} }
    'admin.branches.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.opening_hours.index': { paramsTuple: [ParamValue]; params: {'branchId': ParamValue} }
    'admin.closure_dates.index': { paramsTuple: [ParamValue]; params: {'branchId': ParamValue} }
  }
  POST: {
    'auth.access_tokens.store': { paramsTuple?: []; params?: {} }
    'account.access_tokens.destroy': { paramsTuple?: []; params?: {} }
    'account.change_password.store': { paramsTuple?: []; params?: {} }
    'admin.users.store': { paramsTuple?: []; params?: {} }
    'admin.users.reset_password': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.roles.store': { paramsTuple?: []; params?: {} }
    'admin.branches.store': { paramsTuple?: []; params?: {} }
    'admin.closure_dates.store': { paramsTuple: [ParamValue]; params: {'branchId': ParamValue} }
  }
  PUT: {
    'admin.users.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.roles.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.roles.sync_permissions': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.business.update': { paramsTuple?: []; params?: {} }
    'admin.branches.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.opening_hours.update': { paramsTuple: [ParamValue]; params: {'branchId': ParamValue} }
  }
  DELETE: {
    'admin.roles.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.branches.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.closure_dates.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'branchId': ParamValue,'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}