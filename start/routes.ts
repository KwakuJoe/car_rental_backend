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
import {
  loginThrottle,
  publicBookThrottle,
  publicLookupThrottle,
  publicPayThrottle,
  publicReadThrottle,
} from '#start/limiter'
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

    // The public website (no login). The private link token is the only key to a booking.
    router
      .group(() => {
        router.get('site', [controllers.Public, 'site']).use(publicReadThrottle)
        router.get('cars', [controllers.Public, 'cars']).use(publicReadThrottle)
        router.get('cars/:id', [controllers.Public, 'car']).use(publicReadThrottle)
        router.post('quotes', [controllers.Public, 'quote']).use(publicReadThrottle)
        router.post('bookings', [controllers.Public, 'book']).use(publicBookThrottle)
        router.post('bookings/lookup', [controllers.Public, 'lookup']).use(publicLookupThrottle)
        router.get('bookings/:token', [controllers.Public, 'booking']).use(publicReadThrottle)
        router
          .post('bookings/:token/proof', [controllers.Public, 'uploadProof'])
          .use(publicPayThrottle)
        router
          .post('bookings/:token/payments', [controllers.Public, 'submitPayment'])
          .use(publicPayThrottle)
      })
      .prefix('public')
      .as('public')

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

        // Customers (M3.1) and blacklist (M3.3)
        router
          .group(() => {
            router.get('customers', [controllers.admin.Customers, 'index'])
            router.get('customers/duplicates', [controllers.admin.Customers, 'duplicates'])
            router.get('customers/:id', [controllers.admin.Customers, 'show'])
            router.get('blacklist/check', [controllers.admin.Blacklist, 'check'])
          })
          .use(middleware.permission({ permissions: ['customers.view'] }))

        router
          .group(() => {
            router.post('customers', [controllers.admin.Customers, 'store'])
            router.put('customers/:id', [controllers.admin.Customers, 'update'])
            router.delete('customers/:id', [controllers.admin.Customers, 'destroy'])
            router.post('customers/:customerId/identities', [
              controllers.admin.CustomerIdentities,
              'store',
            ])
            router.put('customers/:customerId/identities/:id', [
              controllers.admin.CustomerIdentities,
              'update',
            ])
          })
          .use(middleware.permission({ permissions: ['customers.manage'] }))

        router
          .group(() => {
            router.post('customers/:customerId/identities/:id/verify', [
              controllers.admin.CustomerIdentities,
              'verify',
            ])
            router.post('customers/:customerId/identities/:id/reject', [
              controllers.admin.CustomerIdentities,
              'reject',
            ])
          })
          .use(middleware.permission({ permissions: ['customers.verify'] }))

        router
          .group(() => {
            router.get('blacklist', [controllers.admin.Blacklist, 'index'])
            router.post('blacklist', [controllers.admin.Blacklist, 'store'])
            router.post('blacklist/:id/lift', [controllers.admin.Blacklist, 'lift'])
          })
          .use(middleware.permission({ permissions: ['customers.blacklist'] }))

        // Bookings (M3.4 / M3.5)
        router
          .group(() => {
            router.get('availability', [controllers.admin.Availability, 'index'])
            router.get('today', [controllers.admin.Today, 'show'])
            router.get('calendar', [controllers.admin.Calendar, 'index'])
            router.get('bookings', [controllers.admin.Bookings, 'index'])
            router.get('bookings/:id', [controllers.admin.Bookings, 'show'])
            router.get('bookings/:id/history', [controllers.admin.Bookings, 'history'])
            router.get('bookings/:id/agreement.pdf', [controllers.admin.Bookings, 'agreement'])
            router.get('bookings/:id/check-in-report.pdf', [
              controllers.admin.Bookings,
              'checkInReport',
            ])
            router.get('bookings/:id/cancellation-preview', [
              controllers.admin.Bookings,
              'cancellationPreview',
            ])
          })
          .use(middleware.permission({ permissions: ['bookings.view'] }))

        router
          .group(() => {
            // Staff quote (preview) - the same calculation the booking uses
            router.post('quotes', [controllers.admin.Quotes, 'store'])
            router.post('bookings', [controllers.admin.Bookings, 'store'])
          })
          .use(middleware.permission({ permissions: ['bookings.create'] }))

        router
          .group(() => {
            router.put('bookings/:id', [controllers.admin.Bookings, 'update'])
            router.post('bookings/:id/confirm', [controllers.admin.Bookings, 'confirm'])
            router.post('bookings/:id/modifications/preview', [
              controllers.admin.Bookings,
              'previewModification',
            ])
            router.post('bookings/:id/modifications', [controllers.admin.Bookings, 'modify'])
            router.put('bookings/:id/driver', [controllers.admin.Bookings, 'assignDriver'])
          })
          .use(middleware.permission({ permissions: ['bookings.update'] }))

        router
          .group(() => {
            router.post('bookings/:id/cancel', [controllers.admin.Bookings, 'cancel'])
            router.post('bookings/:id/no-show', [controllers.admin.Bookings, 'noShow'])
          })
          .use(middleware.permission({ permissions: ['bookings.cancel'] }))

        // Payments, deposits and refunds (Phase 5)
        router
          .group(() => {
            router.get('bookings/:id/payments', [controllers.admin.Payments, 'forBooking'])
            router.get('payments', [controllers.admin.Payments, 'index'])
            router.get('payments/:id/receipt.pdf', [controllers.admin.Payments, 'receipt'])
          })
          .use(middleware.permission({ permissions: ['payments.view'] }))
        router
          .group(() => {
            // Refunds also need payments.refund (checked in PaymentService)
            router.post('bookings/:id/payments', [controllers.admin.Payments, 'store'])
          })
          .use(middleware.permission({ permissions: ['payments.record'] }))
        router
          .group(() => {
            router.post('bookings/:id/deposit/settle', [
              controllers.admin.Payments,
              'settleDeposit',
            ])
          })
          .use(middleware.permission({ permissions: ['payments.refund'] }))
        router
          .group(() => {
            router.post('payments/:id/verify', [controllers.admin.Payments, 'verify'])
            router.post('payments/:id/reject', [controllers.admin.Payments, 'reject'])
          })
          .use(middleware.permission({ permissions: ['payments.verify'] }))
        router
          .group(() => {
            router.post('payments/:id/void', [controllers.admin.Payments, 'void'])
          })
          .use(middleware.permission({ permissions: ['payments.void'] }))

        // Reports & exports (M9 / M5.9)
        router
          .get('reports/overview', [controllers.admin.Reports, 'overview'])
          .use(middleware.permission({ permissions: ['reports.view'] }))
        router
          .get('exports/:type', [controllers.admin.Reports, 'export'])
          .use(middleware.permission({ permissions: ['exports.run'] }))

        // Invoices & credit notes (M5.6)
        router
          .group(() => {
            router.get('invoices', [controllers.admin.Invoices, 'index'])
            router.get('invoices/:id/invoice.pdf', [controllers.admin.Invoices, 'pdf'])
            router.get('credit-notes/:id/credit-note.pdf', [
              controllers.admin.Invoices,
              'creditNotePdf',
            ])
            router.get('bookings/:id/invoices', [controllers.admin.Invoices, 'forBooking'])
          })
          .use(middleware.permission({ permissions: ['invoices.view'] }))
        router
          .group(() => {
            router.post('bookings/:id/invoices', [controllers.admin.Invoices, 'store'])
            router.post('invoices/:id/credit-note', [controllers.admin.Invoices, 'credit'])
            router.post('invoices/:id/send', [controllers.admin.Invoices, 'send'])
          })
          .use(middleware.permission({ permissions: ['invoices.manage'] }))

        // Expenses (M5.8)
        router
          .group(() => {
            router.get('expenses', [controllers.admin.Expenses, 'index'])
            router.get('expenses/options', [controllers.admin.Expenses, 'options'])
          })
          .use(middleware.permission({ permissions: ['expenses.view'] }))
        router
          .group(() => {
            router.post('expenses', [controllers.admin.Expenses, 'store'])
            router.put('expenses/:id', [controllers.admin.Expenses, 'update'])
          })
          .use(middleware.permission({ permissions: ['expenses.manage'] }))
        router
          .group(() => {
            router.post('expenses/:id/approve', [controllers.admin.Expenses, 'approve'])
            router.post('expenses/:id/reject', [controllers.admin.Expenses, 'reject'])
          })
          .use(middleware.permission({ permissions: ['expenses.approve'] }))

        // Vehicle handover (Phase 4)
        router
          .group(() => {
            router.get('bookings/:id/check-out', [controllers.admin.Handover, 'show'])
            router.put('bookings/:id/check-out', [controllers.admin.Handover, 'save'])
            router.post('bookings/:id/check-out/damages', [controllers.admin.Handover, 'addDamage'])
            router.delete('bookings/:id/check-out/damages/:damageId', [
              controllers.admin.Handover,
              'removeDamage',
            ])
            router.post('bookings/:id/check-out/complete', [
              controllers.admin.Handover,
              'completeCheckOut',
            ])
          })
          .use(middleware.permission({ permissions: ['handover.checkout'] }))
        router
          .group(() => {
            router
              .get('bookings/:id/check-in', [controllers.admin.Handover, 'show'])
              .as('checkIn.show')
            router
              .put('bookings/:id/check-in', [controllers.admin.Handover, 'save'])
              .as('checkIn.save')
            router
              .post('bookings/:id/check-in/damages', [controllers.admin.Handover, 'addDamage'])
              .as('checkIn.addDamage')
            router
              .delete('bookings/:id/check-in/damages/:damageId', [
                controllers.admin.Handover,
                'removeDamage',
              ])
              .as('checkIn.removeDamage')
            router.post('bookings/:id/check-in/complete', [
              controllers.admin.Handover,
              'completeCheckIn',
            ])
          })
          .use(middleware.permission({ permissions: ['handover.checkin'] }))
        router
          .group(() => {
            router.get('terms', [controllers.admin.Terms, 'show'])
            router.get('checklist-items', [controllers.admin.Terms, 'checklist'])
          })
          .use(middleware.permission({ permissions: ['bookings.view'] }))
        router
          .group(() => {
            router.post('terms', [controllers.admin.Terms, 'store'])
            router.put('checklist-items', [controllers.admin.Terms, 'saveChecklist'])
          })
          .use(middleware.permission({ permissions: ['settings.manage'] }))

        // Drivers (M3.9)
        router
          .group(() => {
            router.get('drivers', [controllers.admin.Drivers, 'index'])
            router.get('drivers/:id', [controllers.admin.Drivers, 'show'])
          })
          .use(middleware.permission({ permissions: ['drivers.view'] }))
        router
          .group(() => {
            router.post('drivers', [controllers.admin.Drivers, 'store'])
            router.put('drivers/:id', [controllers.admin.Drivers, 'update'])
          })
          .use(middleware.permission({ permissions: ['drivers.manage'] }))

        // Pricing (M2.5+)
        router
          .group(() => {
            router.get('rate-plans', [controllers.admin.RatePlans, 'index'])
            router.get('rate-plans/:id', [controllers.admin.RatePlans, 'show'])
            router.get('pricing-rules', [controllers.admin.PricingRules, 'index'])
            router.get('pricing-rules/:id', [controllers.admin.PricingRules, 'show'])
            router.get('extras', [controllers.admin.Extras, 'index'])
            router.get('protection-plans', [controllers.admin.ProtectionPlans, 'index'])
            router.get('delivery-zones', [controllers.admin.DeliveryZones, 'index'])
            router.get('fees', [controllers.admin.Fees, 'index'])
            router.get('taxes', [controllers.admin.Taxes, 'index'])
          })
          .use(middleware.permission({ permissions: ['pricing.view'] }))

        router
          .group(() => {
            router.post('rate-plans', [controllers.admin.RatePlans, 'store'])
            router.put('rate-plans/:id', [controllers.admin.RatePlans, 'update'])
            router.post('pricing-rules', [controllers.admin.PricingRules, 'store'])
            router.put('pricing-rules/:id', [controllers.admin.PricingRules, 'update'])
            router.delete('pricing-rules/:id', [controllers.admin.PricingRules, 'destroy'])
            router.post('protection-plans', [controllers.admin.ProtectionPlans, 'store'])
            router.put('protection-plans/:id', [controllers.admin.ProtectionPlans, 'update'])
            router.post('delivery-zones', [controllers.admin.DeliveryZones, 'store'])
            router.put('delivery-zones/:id', [controllers.admin.DeliveryZones, 'update'])
            router.post('fees', [controllers.admin.Fees, 'store'])
            router.put('fees/:id', [controllers.admin.Fees, 'update'])
          })
          .use(middleware.permission({ permissions: ['pricing.manage'] }))

        router
          .group(() => {
            router.post('extras', [controllers.admin.Extras, 'store'])
            router.put('extras/:id', [controllers.admin.Extras, 'update'])
          })
          .use(middleware.permission({ permissions: ['extras.manage'] }))

        // Taxes: read with pricing.view (above), change with settings.manage
        router
          .group(() => {
            router.post('taxes', [controllers.admin.Taxes, 'store'])
            router.put('taxes/:id', [controllers.admin.Taxes, 'update'])
          })
          .use(middleware.permission({ permissions: ['settings.manage'] }))

        router
          .group(() => {
            router.get('settings', [controllers.admin.Settings, 'index'])
            router.put('settings', [controllers.admin.Settings, 'update'])

            router.get('business', [controllers.admin.Business, 'show'])
            router.put('business', [controllers.admin.Business, 'update'])
            router.put('business/logo', [controllers.admin.Business, 'updateLogo'])
            router.delete('business/logo', [controllers.admin.Business, 'removeLogo'])
            router.put('business/cover', [controllers.admin.Business, 'updateCover'])
            router.delete('business/cover', [controllers.admin.Business, 'removeCover'])

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

            router.get('alert-recipients', [controllers.admin.AlertRecipients, 'index'])
            router.post('alert-recipients', [controllers.admin.AlertRecipients, 'store'])
            router.put('alert-recipients/:id', [controllers.admin.AlertRecipients, 'update'])
            router.delete('alert-recipients/:id', [controllers.admin.AlertRecipients, 'destroy'])
            router.post('alert-recipients/:id/test', [controllers.admin.AlertRecipients, 'test'])
          })
          .use(middleware.permission({ permissions: ['settings.manage'] }))
      })
      .prefix('admin')
      .as('admin')
      .use([middleware.auth(), middleware.isActive(), middleware.mustResetPassword()])
  })
  .prefix('/api/v1')
