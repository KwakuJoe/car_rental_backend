/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'
import { loginThrottle } from '#start/limiter'
import { controllers } from '#generated/controllers'

router.get('/', () => {
  return { hello: 'world' }
})

router
  .group(() => {
    router
      .group(() => {
        router.post('login', [controllers.AccessTokens, 'store']).use(loginThrottle)
      })
      .prefix('auth')
      .as('auth')

    router
      .group(() => {
        router.get('profile', [controllers.Profile, 'show'])
        router.post('logout', [controllers.AccessTokens, 'destroy'])
        router.post('change-password', [controllers.ChangePassword, 'store'])
      })
      .prefix('account')
      .as('account')
      .use(middleware.auth())

    router
      .group(() => {
        router
          .group(() => {
            router.get('users', [controllers.admin.Users, 'index'])
            router.post('users', [controllers.admin.Users, 'store'])
            router.get('users/:id', [controllers.admin.Users, 'show'])
            router.put('users/:id', [controllers.admin.Users, 'update'])
            router.post('users/:id/reset-password', [controllers.admin.Users, 'resetPassword'])
          })
          .use(middleware.permission({ permissions: ['users.manage'] }))

        router
          .group(() => {
            router.get('roles', [controllers.admin.Roles, 'index'])
            router.post('roles', [controllers.admin.Roles, 'store'])
            router.get('roles/:id', [controllers.admin.Roles, 'show'])
            router.put('roles/:id', [controllers.admin.Roles, 'update'])
            router.delete('roles/:id', [controllers.admin.Roles, 'destroy'])
            router.put('roles/:id/permissions', [controllers.admin.Roles, 'syncPermissions'])
          })
          .use(middleware.permission({ permissions: ['roles.manage'] }))

        router
          .group(() => {
            router.get('permissions', [controllers.admin.Permissions, 'index'])
          })
          .use(middleware.permission({ permissions: ['permissions.manage'] }))

        router
          .group(() => {
            router.get('audit-logs', [controllers.admin.AuditLogs, 'index'])
            router.get('audit-logs/:id', [controllers.admin.AuditLogs, 'show'])
          })
          .use(middleware.permission({ permissions: ['audit.view'] }))

        // Dropdown/display data for any signed-in staff member - no module permission.
        router
          .group(() => {
            router.get('business', [controllers.admin.Lookups, 'business'])
            router.get('roles', [controllers.admin.Lookups, 'roles'])
            router.get('branches', [controllers.admin.Lookups, 'branches'])
            router.get('staff', [controllers.admin.Lookups, 'staff'])
            router.get('categories', [controllers.admin.Lookups, 'categories'])
          })
          .prefix('lookups')
          .as('lookups')

        // File upload and signed URL management
        router.group(() => {
          router.post('files/upload', [controllers.admin.Files, 'upload'])
          router.post('files/import', [controllers.admin.Files, 'importFromUrl'])
          router.get('files/:id', [controllers.admin.Files, 'show'])
          router.get('files/:id/url', [controllers.admin.Files, 'signedUrl'])
          router.delete('files/:id', [controllers.admin.Files, 'destroy'])
        })

        // In-App Notifications (M1.8)
        router.group(() => {
          router.get('notifications', [controllers.admin.Notifications, 'index'])
          router.get('notifications/unread-count', [controllers.admin.Notifications, 'unreadCount'])
          router.patch('notifications/:id/read', [controllers.admin.Notifications, 'markRead'])
          router.post('notifications/read-all', [controllers.admin.Notifications, 'markAllRead'])
          router.delete('notifications/:id', [controllers.admin.Notifications, 'destroy'])
        })

        // Fleet: Categories & Cars (Read)
        router
          .group(() => {
            router.get('categories', [controllers.admin.Categories, 'index'])
            router.get('categories/:id', [controllers.admin.Categories, 'show'])
            router.get('cars', [controllers.admin.Cars, 'index'])
            router.get('cars/:id', [controllers.admin.Cars, 'show'])
            router.get('cars/:id/odometer-history', [controllers.admin.Cars, 'odometerHistory'])
            router.get('cars/:carId/blocks', [controllers.admin.CarBlocks, 'index'])
            router.get('cars/:carId/documents', [controllers.admin.VehicleDocuments, 'index'])
            router.get('cars/:carId/documents/:id', [controllers.admin.VehicleDocuments, 'show'])
            router.get('documents/expiring', [controllers.admin.VehicleDocuments, 'expiring'])
          })
          .use(middleware.permission({ permissions: ['fleet.view'] }))

        // Fleet: Categories & Cars (Write)
        router
          .group(() => {
            router.post('categories', [controllers.admin.Categories, 'store'])
            router.put('categories/:id', [controllers.admin.Categories, 'update'])
            router.delete('categories/:id', [controllers.admin.Categories, 'destroy'])

            router.post('cars', [controllers.admin.Cars, 'store'])
            router.put('cars/:id', [controllers.admin.Cars, 'update'])
            router.delete('cars/:id', [controllers.admin.Cars, 'destroy'])
            router.put('cars/:id/status', [controllers.admin.Cars, 'updateStatus'])
            router.post('cars/:id/odometer', [controllers.admin.Cars, 'updateOdometer'])
            router.post('cars/:id/photos', [controllers.admin.Cars, 'addPhoto'])
            router.put('cars/:id/photos/reorder', [controllers.admin.Cars, 'reorderPhotos'])
            router.put('cars/:id/photos/:photoId/cover', [controllers.admin.Cars, 'setCoverPhoto'])
            router.delete('cars/:id/photos/:photoId', [controllers.admin.Cars, 'deletePhoto'])

            router.post('cars/:carId/blocks', [controllers.admin.CarBlocks, 'store'])
            router.delete('cars/:carId/blocks/:id', [controllers.admin.CarBlocks, 'destroy'])

            router.post('cars/:carId/documents', [controllers.admin.VehicleDocuments, 'store'])
            router.put('cars/:carId/documents/:id', [controllers.admin.VehicleDocuments, 'update'])
            router.delete('cars/:carId/documents/:id', [
              controllers.admin.VehicleDocuments,
              'destroy',
            ])
          })
          .use(middleware.permission({ permissions: ['fleet.manage'] }))

        // Pricing (M2.5+)
        router
          .group(() => {
            router.get('rate-plans', [controllers.admin.RatePlans, 'index'])
            router.get('rate-plans/:id', [controllers.admin.RatePlans, 'show'])
            router.get('pricing-rules', [controllers.admin.PricingRules, 'index'])
            router.get('pricing-rules/:id', [controllers.admin.PricingRules, 'show'])
          })
          .use(middleware.permission({ permissions: ['pricing.view'] }))

        router
          .group(() => {
            router.post('rate-plans', [controllers.admin.RatePlans, 'store'])
            router.put('rate-plans/:id', [controllers.admin.RatePlans, 'update'])
            router.post('pricing-rules', [controllers.admin.PricingRules, 'store'])
            router.put('pricing-rules/:id', [controllers.admin.PricingRules, 'update'])
            router.delete('pricing-rules/:id', [controllers.admin.PricingRules, 'destroy'])
          })
          .use(middleware.permission({ permissions: ['pricing.manage'] }))

        router
          .group(() => {
            router.get('settings', [controllers.admin.Settings, 'index'])
            router.put('settings', [controllers.admin.Settings, 'update'])

            router.get('business', [controllers.admin.Business, 'show'])
            router.put('business', [controllers.admin.Business, 'update'])

            router.get('branches', [controllers.admin.Branches, 'index'])
            router.post('branches', [controllers.admin.Branches, 'store'])
            router.get('branches/:id', [controllers.admin.Branches, 'show'])
            router.put('branches/:id', [controllers.admin.Branches, 'update'])
            router.delete('branches/:id', [controllers.admin.Branches, 'destroy'])

            router.get('branches/:branchId/opening-hours', [
              controllers.admin.OpeningHours,
              'index',
            ])
            router.put('branches/:branchId/opening-hours', [
              controllers.admin.OpeningHours,
              'update',
            ])

            router.get('branches/:branchId/closure-dates', [
              controllers.admin.ClosureDates,
              'index',
            ])
            router.post('branches/:branchId/closure-dates', [
              controllers.admin.ClosureDates,
              'store',
            ])
            router.delete('branches/:branchId/closure-dates/:id', [
              controllers.admin.ClosureDates,
              'destroy',
            ])
          })
          .use(middleware.permission({ permissions: ['settings.manage'] }))
      })
      .prefix('admin')
      .as('admin')
      .use([middleware.auth(), middleware.isActive(), middleware.mustResetPassword()])
  })
  .prefix('/api/v1')
