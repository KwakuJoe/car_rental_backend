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
          })
          .prefix('lookups')
          .as('lookups')

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
