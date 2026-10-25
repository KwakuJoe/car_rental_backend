/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  auth: {
    accessTokens: {
      store: typeof routes['auth.access_tokens.store']
    }
  }
  account: {
    profile: {
      show: typeof routes['account.profile.show']
    }
    accessTokens: {
      destroy: typeof routes['account.access_tokens.destroy']
    }
    changePassword: {
      store: typeof routes['account.change_password.store']
    }
  }
  admin: {
    users: {
      index: typeof routes['admin.users.index']
      store: typeof routes['admin.users.store']
      show: typeof routes['admin.users.show']
      update: typeof routes['admin.users.update']
      resetPassword: typeof routes['admin.users.reset_password']
    }
    roles: {
      index: typeof routes['admin.roles.index']
      store: typeof routes['admin.roles.store']
      show: typeof routes['admin.roles.show']
      update: typeof routes['admin.roles.update']
      destroy: typeof routes['admin.roles.destroy']
      syncPermissions: typeof routes['admin.roles.sync_permissions']
    }
    permissions: {
      index: typeof routes['admin.permissions.index']
    }
    auditLogs: {
      index: typeof routes['admin.audit_logs.index']
      show: typeof routes['admin.audit_logs.show']
    }
    lookups: {
      lookups: {
        business: typeof routes['admin.lookups.lookups.business']
        roles: typeof routes['admin.lookups.lookups.roles']
        branches: typeof routes['admin.lookups.lookups.branches']
        staff: typeof routes['admin.lookups.lookups.staff']
        categories: typeof routes['admin.lookups.lookups.categories']
      }
    }
    files: {
      upload: typeof routes['admin.files.upload']
      show: typeof routes['admin.files.show']
      signedUrl: typeof routes['admin.files.signed_url']
      destroy: typeof routes['admin.files.destroy']
    }
    categories: {
      index: typeof routes['admin.categories.index']
      show: typeof routes['admin.categories.show']
      store: typeof routes['admin.categories.store']
      update: typeof routes['admin.categories.update']
      destroy: typeof routes['admin.categories.destroy']
    }
    cars: {
      index: typeof routes['admin.cars.index']
      show: typeof routes['admin.cars.show']
      odometerHistory: typeof routes['admin.cars.odometer_history']
      store: typeof routes['admin.cars.store']
      update: typeof routes['admin.cars.update']
      destroy: typeof routes['admin.cars.destroy']
      updateStatus: typeof routes['admin.cars.update_status']
      updateOdometer: typeof routes['admin.cars.update_odometer']
      addPhoto: typeof routes['admin.cars.add_photo']
      reorderPhotos: typeof routes['admin.cars.reorder_photos']
      setCoverPhoto: typeof routes['admin.cars.set_cover_photo']
      deletePhoto: typeof routes['admin.cars.delete_photo']
    }
    settings: {
      index: typeof routes['admin.settings.index']
      update: typeof routes['admin.settings.update']
    }
    business: {
      show: typeof routes['admin.business.show']
      update: typeof routes['admin.business.update']
    }
    branches: {
      index: typeof routes['admin.branches.index']
      store: typeof routes['admin.branches.store']
      show: typeof routes['admin.branches.show']
      update: typeof routes['admin.branches.update']
      destroy: typeof routes['admin.branches.destroy']
    }
    openingHours: {
      index: typeof routes['admin.opening_hours.index']
      update: typeof routes['admin.opening_hours.update']
    }
    closureDates: {
      index: typeof routes['admin.closure_dates.index']
      store: typeof routes['admin.closure_dates.store']
      destroy: typeof routes['admin.closure_dates.destroy']
    }
  }
}
