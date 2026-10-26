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
      importFromUrl: typeof routes['admin.files.import_from_url']
      show: typeof routes['admin.files.show']
      signedUrl: typeof routes['admin.files.signed_url']
      destroy: typeof routes['admin.files.destroy']
    }
    notifications: {
      index: typeof routes['admin.notifications.index']
      unreadCount: typeof routes['admin.notifications.unread_count']
      markRead: typeof routes['admin.notifications.mark_read']
      markAllRead: typeof routes['admin.notifications.mark_all_read']
      destroy: typeof routes['admin.notifications.destroy']
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
    carBlocks: {
      index: typeof routes['admin.car_blocks.index']
      store: typeof routes['admin.car_blocks.store']
      destroy: typeof routes['admin.car_blocks.destroy']
    }
    vehicleDocuments: {
      index: typeof routes['admin.vehicle_documents.index']
      show: typeof routes['admin.vehicle_documents.show']
      expiring: typeof routes['admin.vehicle_documents.expiring']
      store: typeof routes['admin.vehicle_documents.store']
      update: typeof routes['admin.vehicle_documents.update']
      destroy: typeof routes['admin.vehicle_documents.destroy']
    }
    ratePlans: {
      index: typeof routes['admin.rate_plans.index']
      show: typeof routes['admin.rate_plans.show']
      store: typeof routes['admin.rate_plans.store']
      update: typeof routes['admin.rate_plans.update']
    }
    pricingRules: {
      index: typeof routes['admin.pricing_rules.index']
      show: typeof routes['admin.pricing_rules.show']
      store: typeof routes['admin.pricing_rules.store']
      update: typeof routes['admin.pricing_rules.update']
      destroy: typeof routes['admin.pricing_rules.destroy']
    }
    extras: {
      index: typeof routes['admin.extras.index']
      store: typeof routes['admin.extras.store']
      update: typeof routes['admin.extras.update']
    }
    protectionPlans: {
      index: typeof routes['admin.protection_plans.index']
      store: typeof routes['admin.protection_plans.store']
      update: typeof routes['admin.protection_plans.update']
    }
    deliveryZones: {
      index: typeof routes['admin.delivery_zones.index']
      store: typeof routes['admin.delivery_zones.store']
      update: typeof routes['admin.delivery_zones.update']
    }
    fees: {
      index: typeof routes['admin.fees.index']
      store: typeof routes['admin.fees.store']
      update: typeof routes['admin.fees.update']
    }
    taxes: {
      index: typeof routes['admin.taxes.index']
      store: typeof routes['admin.taxes.store']
      update: typeof routes['admin.taxes.update']
    }
    quotes: {
      store: typeof routes['admin.quotes.store']
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
