import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'auth.access_tokens.store': { paramsTuple?: []; params?: {} }
    'public.public.site': { paramsTuple?: []; params?: {} }
    'public.public.cars': { paramsTuple?: []; params?: {} }
    'public.public.car': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'public.public.quote': { paramsTuple?: []; params?: {} }
    'public.public.book': { paramsTuple?: []; params?: {} }
    'public.public.lookup': { paramsTuple?: []; params?: {} }
    'public.public.booking': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'public.public.upload_proof': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'public.public.submit_payment': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
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
    'admin.audit_logs.index': { paramsTuple?: []; params?: {} }
    'admin.audit_logs.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.lookups.lookups.business': { paramsTuple?: []; params?: {} }
    'admin.lookups.lookups.roles': { paramsTuple?: []; params?: {} }
    'admin.lookups.lookups.branches': { paramsTuple?: []; params?: {} }
    'admin.lookups.lookups.staff': { paramsTuple?: []; params?: {} }
    'admin.lookups.lookups.categories': { paramsTuple?: []; params?: {} }
    'admin.files.upload': { paramsTuple?: []; params?: {} }
    'admin.files.import_from_url': { paramsTuple?: []; params?: {} }
    'admin.files.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.files.signed_url': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.files.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.notifications.index': { paramsTuple?: []; params?: {} }
    'admin.notifications.unread_count': { paramsTuple?: []; params?: {} }
    'admin.notifications.mark_read': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.notifications.mark_all_read': { paramsTuple?: []; params?: {} }
    'admin.notifications.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.categories.index': { paramsTuple?: []; params?: {} }
    'admin.categories.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.cars.index': { paramsTuple?: []; params?: {} }
    'admin.cars.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.cars.odometer_history': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.car_blocks.index': { paramsTuple: [ParamValue]; params: {'carId': ParamValue} }
    'admin.vehicle_documents.index': { paramsTuple: [ParamValue]; params: {'carId': ParamValue} }
    'admin.vehicle_documents.show': { paramsTuple: [ParamValue,ParamValue]; params: {'carId': ParamValue,'id': ParamValue} }
    'admin.vehicle_documents.expiring': { paramsTuple?: []; params?: {} }
    'admin.categories.store': { paramsTuple?: []; params?: {} }
    'admin.categories.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.categories.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.cars.store': { paramsTuple?: []; params?: {} }
    'admin.cars.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.cars.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.cars.update_status': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.cars.update_odometer': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.cars.add_photo': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.cars.reorder_photos': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.cars.set_cover_photo': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'photoId': ParamValue} }
    'admin.cars.delete_photo': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'photoId': ParamValue} }
    'admin.car_blocks.store': { paramsTuple: [ParamValue]; params: {'carId': ParamValue} }
    'admin.car_blocks.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'carId': ParamValue,'id': ParamValue} }
    'admin.vehicle_documents.store': { paramsTuple: [ParamValue]; params: {'carId': ParamValue} }
    'admin.vehicle_documents.update': { paramsTuple: [ParamValue,ParamValue]; params: {'carId': ParamValue,'id': ParamValue} }
    'admin.vehicle_documents.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'carId': ParamValue,'id': ParamValue} }
    'admin.customers.index': { paramsTuple?: []; params?: {} }
    'admin.customers.duplicates': { paramsTuple?: []; params?: {} }
    'admin.customers.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.blacklist.check': { paramsTuple?: []; params?: {} }
    'admin.customers.store': { paramsTuple?: []; params?: {} }
    'admin.customers.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.customers.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.customer_identities.store': { paramsTuple: [ParamValue]; params: {'customerId': ParamValue} }
    'admin.customer_identities.update': { paramsTuple: [ParamValue,ParamValue]; params: {'customerId': ParamValue,'id': ParamValue} }
    'admin.customer_identities.verify': { paramsTuple: [ParamValue,ParamValue]; params: {'customerId': ParamValue,'id': ParamValue} }
    'admin.customer_identities.reject': { paramsTuple: [ParamValue,ParamValue]; params: {'customerId': ParamValue,'id': ParamValue} }
    'admin.blacklist.index': { paramsTuple?: []; params?: {} }
    'admin.blacklist.store': { paramsTuple?: []; params?: {} }
    'admin.blacklist.lift': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.availability.index': { paramsTuple?: []; params?: {} }
    'admin.today.show': { paramsTuple?: []; params?: {} }
    'admin.calendar.index': { paramsTuple?: []; params?: {} }
    'admin.bookings.index': { paramsTuple?: []; params?: {} }
    'admin.bookings.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.bookings.history': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.bookings.agreement': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.bookings.check_in_report': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.bookings.cancellation_preview': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.quotes.store': { paramsTuple?: []; params?: {} }
    'admin.bookings.store': { paramsTuple?: []; params?: {} }
    'admin.bookings.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.bookings.confirm': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.bookings.preview_modification': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.bookings.modify': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.bookings.assign_driver': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.bookings.cancel': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.bookings.no_show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.payments.for_booking': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.payments.index': { paramsTuple?: []; params?: {} }
    'admin.payments.receipt': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.payments.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.payments.settle_deposit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.payments.verify': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.payments.reject': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.payments.void': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.reports.overview': { paramsTuple?: []; params?: {} }
    'admin.reports.export': { paramsTuple: [ParamValue]; params: {'type': ParamValue} }
    'admin.handover.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.handover.save': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.handover.add_damage': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.handover.remove_damage': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'damageId': ParamValue} }
    'admin.handover.complete_check_out': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.checkIn.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.checkIn.save': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.checkIn.addDamage': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.checkIn.removeDamage': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'damageId': ParamValue} }
    'admin.handover.complete_check_in': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.terms.show': { paramsTuple?: []; params?: {} }
    'admin.terms.checklist': { paramsTuple?: []; params?: {} }
    'admin.terms.store': { paramsTuple?: []; params?: {} }
    'admin.terms.save_checklist': { paramsTuple?: []; params?: {} }
    'admin.drivers.index': { paramsTuple?: []; params?: {} }
    'admin.drivers.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.drivers.store': { paramsTuple?: []; params?: {} }
    'admin.drivers.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.rate_plans.index': { paramsTuple?: []; params?: {} }
    'admin.rate_plans.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.pricing_rules.index': { paramsTuple?: []; params?: {} }
    'admin.pricing_rules.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.extras.index': { paramsTuple?: []; params?: {} }
    'admin.protection_plans.index': { paramsTuple?: []; params?: {} }
    'admin.delivery_zones.index': { paramsTuple?: []; params?: {} }
    'admin.fees.index': { paramsTuple?: []; params?: {} }
    'admin.taxes.index': { paramsTuple?: []; params?: {} }
    'admin.rate_plans.store': { paramsTuple?: []; params?: {} }
    'admin.rate_plans.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.pricing_rules.store': { paramsTuple?: []; params?: {} }
    'admin.pricing_rules.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.pricing_rules.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.protection_plans.store': { paramsTuple?: []; params?: {} }
    'admin.protection_plans.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.delivery_zones.store': { paramsTuple?: []; params?: {} }
    'admin.delivery_zones.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.fees.store': { paramsTuple?: []; params?: {} }
    'admin.fees.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.extras.store': { paramsTuple?: []; params?: {} }
    'admin.extras.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.taxes.store': { paramsTuple?: []; params?: {} }
    'admin.taxes.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.settings.index': { paramsTuple?: []; params?: {} }
    'admin.settings.update': { paramsTuple?: []; params?: {} }
    'admin.business.show': { paramsTuple?: []; params?: {} }
    'admin.business.update': { paramsTuple?: []; params?: {} }
    'admin.business.update_logo': { paramsTuple?: []; params?: {} }
    'admin.business.remove_logo': { paramsTuple?: []; params?: {} }
    'admin.business.update_cover': { paramsTuple?: []; params?: {} }
    'admin.business.remove_cover': { paramsTuple?: []; params?: {} }
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
    'admin.alert_recipients.index': { paramsTuple?: []; params?: {} }
    'admin.alert_recipients.store': { paramsTuple?: []; params?: {} }
    'admin.alert_recipients.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.alert_recipients.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.alert_recipients.test': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  GET: {
    'public.public.site': { paramsTuple?: []; params?: {} }
    'public.public.cars': { paramsTuple?: []; params?: {} }
    'public.public.car': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'public.public.booking': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'account.profile.show': { paramsTuple?: []; params?: {} }
    'admin.users.index': { paramsTuple?: []; params?: {} }
    'admin.users.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.roles.index': { paramsTuple?: []; params?: {} }
    'admin.roles.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.permissions.index': { paramsTuple?: []; params?: {} }
    'admin.audit_logs.index': { paramsTuple?: []; params?: {} }
    'admin.audit_logs.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.lookups.lookups.business': { paramsTuple?: []; params?: {} }
    'admin.lookups.lookups.roles': { paramsTuple?: []; params?: {} }
    'admin.lookups.lookups.branches': { paramsTuple?: []; params?: {} }
    'admin.lookups.lookups.staff': { paramsTuple?: []; params?: {} }
    'admin.lookups.lookups.categories': { paramsTuple?: []; params?: {} }
    'admin.files.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.files.signed_url': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.notifications.index': { paramsTuple?: []; params?: {} }
    'admin.notifications.unread_count': { paramsTuple?: []; params?: {} }
    'admin.categories.index': { paramsTuple?: []; params?: {} }
    'admin.categories.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.cars.index': { paramsTuple?: []; params?: {} }
    'admin.cars.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.cars.odometer_history': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.car_blocks.index': { paramsTuple: [ParamValue]; params: {'carId': ParamValue} }
    'admin.vehicle_documents.index': { paramsTuple: [ParamValue]; params: {'carId': ParamValue} }
    'admin.vehicle_documents.show': { paramsTuple: [ParamValue,ParamValue]; params: {'carId': ParamValue,'id': ParamValue} }
    'admin.vehicle_documents.expiring': { paramsTuple?: []; params?: {} }
    'admin.customers.index': { paramsTuple?: []; params?: {} }
    'admin.customers.duplicates': { paramsTuple?: []; params?: {} }
    'admin.customers.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.blacklist.check': { paramsTuple?: []; params?: {} }
    'admin.blacklist.index': { paramsTuple?: []; params?: {} }
    'admin.availability.index': { paramsTuple?: []; params?: {} }
    'admin.today.show': { paramsTuple?: []; params?: {} }
    'admin.calendar.index': { paramsTuple?: []; params?: {} }
    'admin.bookings.index': { paramsTuple?: []; params?: {} }
    'admin.bookings.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.bookings.history': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.bookings.agreement': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.bookings.check_in_report': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.bookings.cancellation_preview': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.payments.for_booking': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.payments.index': { paramsTuple?: []; params?: {} }
    'admin.payments.receipt': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.reports.overview': { paramsTuple?: []; params?: {} }
    'admin.reports.export': { paramsTuple: [ParamValue]; params: {'type': ParamValue} }
    'admin.handover.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.checkIn.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.terms.show': { paramsTuple?: []; params?: {} }
    'admin.terms.checklist': { paramsTuple?: []; params?: {} }
    'admin.drivers.index': { paramsTuple?: []; params?: {} }
    'admin.drivers.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.rate_plans.index': { paramsTuple?: []; params?: {} }
    'admin.rate_plans.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.pricing_rules.index': { paramsTuple?: []; params?: {} }
    'admin.pricing_rules.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.extras.index': { paramsTuple?: []; params?: {} }
    'admin.protection_plans.index': { paramsTuple?: []; params?: {} }
    'admin.delivery_zones.index': { paramsTuple?: []; params?: {} }
    'admin.fees.index': { paramsTuple?: []; params?: {} }
    'admin.taxes.index': { paramsTuple?: []; params?: {} }
    'admin.settings.index': { paramsTuple?: []; params?: {} }
    'admin.business.show': { paramsTuple?: []; params?: {} }
    'admin.branches.index': { paramsTuple?: []; params?: {} }
    'admin.branches.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.opening_hours.index': { paramsTuple: [ParamValue]; params: {'branchId': ParamValue} }
    'admin.closure_dates.index': { paramsTuple: [ParamValue]; params: {'branchId': ParamValue} }
    'admin.alert_recipients.index': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'public.public.site': { paramsTuple?: []; params?: {} }
    'public.public.cars': { paramsTuple?: []; params?: {} }
    'public.public.car': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'public.public.booking': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'account.profile.show': { paramsTuple?: []; params?: {} }
    'admin.users.index': { paramsTuple?: []; params?: {} }
    'admin.users.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.roles.index': { paramsTuple?: []; params?: {} }
    'admin.roles.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.permissions.index': { paramsTuple?: []; params?: {} }
    'admin.audit_logs.index': { paramsTuple?: []; params?: {} }
    'admin.audit_logs.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.lookups.lookups.business': { paramsTuple?: []; params?: {} }
    'admin.lookups.lookups.roles': { paramsTuple?: []; params?: {} }
    'admin.lookups.lookups.branches': { paramsTuple?: []; params?: {} }
    'admin.lookups.lookups.staff': { paramsTuple?: []; params?: {} }
    'admin.lookups.lookups.categories': { paramsTuple?: []; params?: {} }
    'admin.files.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.files.signed_url': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.notifications.index': { paramsTuple?: []; params?: {} }
    'admin.notifications.unread_count': { paramsTuple?: []; params?: {} }
    'admin.categories.index': { paramsTuple?: []; params?: {} }
    'admin.categories.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.cars.index': { paramsTuple?: []; params?: {} }
    'admin.cars.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.cars.odometer_history': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.car_blocks.index': { paramsTuple: [ParamValue]; params: {'carId': ParamValue} }
    'admin.vehicle_documents.index': { paramsTuple: [ParamValue]; params: {'carId': ParamValue} }
    'admin.vehicle_documents.show': { paramsTuple: [ParamValue,ParamValue]; params: {'carId': ParamValue,'id': ParamValue} }
    'admin.vehicle_documents.expiring': { paramsTuple?: []; params?: {} }
    'admin.customers.index': { paramsTuple?: []; params?: {} }
    'admin.customers.duplicates': { paramsTuple?: []; params?: {} }
    'admin.customers.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.blacklist.check': { paramsTuple?: []; params?: {} }
    'admin.blacklist.index': { paramsTuple?: []; params?: {} }
    'admin.availability.index': { paramsTuple?: []; params?: {} }
    'admin.today.show': { paramsTuple?: []; params?: {} }
    'admin.calendar.index': { paramsTuple?: []; params?: {} }
    'admin.bookings.index': { paramsTuple?: []; params?: {} }
    'admin.bookings.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.bookings.history': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.bookings.agreement': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.bookings.check_in_report': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.bookings.cancellation_preview': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.payments.for_booking': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.payments.index': { paramsTuple?: []; params?: {} }
    'admin.payments.receipt': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.reports.overview': { paramsTuple?: []; params?: {} }
    'admin.reports.export': { paramsTuple: [ParamValue]; params: {'type': ParamValue} }
    'admin.handover.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.checkIn.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.terms.show': { paramsTuple?: []; params?: {} }
    'admin.terms.checklist': { paramsTuple?: []; params?: {} }
    'admin.drivers.index': { paramsTuple?: []; params?: {} }
    'admin.drivers.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.rate_plans.index': { paramsTuple?: []; params?: {} }
    'admin.rate_plans.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.pricing_rules.index': { paramsTuple?: []; params?: {} }
    'admin.pricing_rules.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.extras.index': { paramsTuple?: []; params?: {} }
    'admin.protection_plans.index': { paramsTuple?: []; params?: {} }
    'admin.delivery_zones.index': { paramsTuple?: []; params?: {} }
    'admin.fees.index': { paramsTuple?: []; params?: {} }
    'admin.taxes.index': { paramsTuple?: []; params?: {} }
    'admin.settings.index': { paramsTuple?: []; params?: {} }
    'admin.business.show': { paramsTuple?: []; params?: {} }
    'admin.branches.index': { paramsTuple?: []; params?: {} }
    'admin.branches.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.opening_hours.index': { paramsTuple: [ParamValue]; params: {'branchId': ParamValue} }
    'admin.closure_dates.index': { paramsTuple: [ParamValue]; params: {'branchId': ParamValue} }
    'admin.alert_recipients.index': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'auth.access_tokens.store': { paramsTuple?: []; params?: {} }
    'public.public.quote': { paramsTuple?: []; params?: {} }
    'public.public.book': { paramsTuple?: []; params?: {} }
    'public.public.lookup': { paramsTuple?: []; params?: {} }
    'public.public.upload_proof': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'public.public.submit_payment': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'account.access_tokens.destroy': { paramsTuple?: []; params?: {} }
    'account.change_password.store': { paramsTuple?: []; params?: {} }
    'admin.users.store': { paramsTuple?: []; params?: {} }
    'admin.users.reset_password': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.roles.store': { paramsTuple?: []; params?: {} }
    'admin.files.upload': { paramsTuple?: []; params?: {} }
    'admin.files.import_from_url': { paramsTuple?: []; params?: {} }
    'admin.notifications.mark_all_read': { paramsTuple?: []; params?: {} }
    'admin.categories.store': { paramsTuple?: []; params?: {} }
    'admin.cars.store': { paramsTuple?: []; params?: {} }
    'admin.cars.update_odometer': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.cars.add_photo': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.car_blocks.store': { paramsTuple: [ParamValue]; params: {'carId': ParamValue} }
    'admin.vehicle_documents.store': { paramsTuple: [ParamValue]; params: {'carId': ParamValue} }
    'admin.customers.store': { paramsTuple?: []; params?: {} }
    'admin.customer_identities.store': { paramsTuple: [ParamValue]; params: {'customerId': ParamValue} }
    'admin.customer_identities.verify': { paramsTuple: [ParamValue,ParamValue]; params: {'customerId': ParamValue,'id': ParamValue} }
    'admin.customer_identities.reject': { paramsTuple: [ParamValue,ParamValue]; params: {'customerId': ParamValue,'id': ParamValue} }
    'admin.blacklist.store': { paramsTuple?: []; params?: {} }
    'admin.blacklist.lift': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.quotes.store': { paramsTuple?: []; params?: {} }
    'admin.bookings.store': { paramsTuple?: []; params?: {} }
    'admin.bookings.confirm': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.bookings.preview_modification': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.bookings.modify': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.bookings.cancel': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.bookings.no_show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.payments.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.payments.settle_deposit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.payments.verify': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.payments.reject': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.payments.void': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.handover.add_damage': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.handover.complete_check_out': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.checkIn.addDamage': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.handover.complete_check_in': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.terms.store': { paramsTuple?: []; params?: {} }
    'admin.drivers.store': { paramsTuple?: []; params?: {} }
    'admin.rate_plans.store': { paramsTuple?: []; params?: {} }
    'admin.pricing_rules.store': { paramsTuple?: []; params?: {} }
    'admin.protection_plans.store': { paramsTuple?: []; params?: {} }
    'admin.delivery_zones.store': { paramsTuple?: []; params?: {} }
    'admin.fees.store': { paramsTuple?: []; params?: {} }
    'admin.extras.store': { paramsTuple?: []; params?: {} }
    'admin.taxes.store': { paramsTuple?: []; params?: {} }
    'admin.branches.store': { paramsTuple?: []; params?: {} }
    'admin.closure_dates.store': { paramsTuple: [ParamValue]; params: {'branchId': ParamValue} }
    'admin.alert_recipients.store': { paramsTuple?: []; params?: {} }
    'admin.alert_recipients.test': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  PUT: {
    'admin.users.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.roles.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.roles.sync_permissions': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.categories.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.cars.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.cars.update_status': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.cars.reorder_photos': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.cars.set_cover_photo': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'photoId': ParamValue} }
    'admin.vehicle_documents.update': { paramsTuple: [ParamValue,ParamValue]; params: {'carId': ParamValue,'id': ParamValue} }
    'admin.customers.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.customer_identities.update': { paramsTuple: [ParamValue,ParamValue]; params: {'customerId': ParamValue,'id': ParamValue} }
    'admin.bookings.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.bookings.assign_driver': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.handover.save': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.checkIn.save': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.terms.save_checklist': { paramsTuple?: []; params?: {} }
    'admin.drivers.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.rate_plans.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.pricing_rules.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.protection_plans.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.delivery_zones.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.fees.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.extras.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.taxes.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.settings.update': { paramsTuple?: []; params?: {} }
    'admin.business.update': { paramsTuple?: []; params?: {} }
    'admin.business.update_logo': { paramsTuple?: []; params?: {} }
    'admin.business.update_cover': { paramsTuple?: []; params?: {} }
    'admin.branches.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.opening_hours.update': { paramsTuple: [ParamValue]; params: {'branchId': ParamValue} }
    'admin.alert_recipients.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  DELETE: {
    'admin.roles.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.files.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.notifications.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.categories.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.cars.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.cars.delete_photo': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'photoId': ParamValue} }
    'admin.car_blocks.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'carId': ParamValue,'id': ParamValue} }
    'admin.vehicle_documents.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'carId': ParamValue,'id': ParamValue} }
    'admin.customers.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.handover.remove_damage': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'damageId': ParamValue} }
    'admin.checkIn.removeDamage': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'damageId': ParamValue} }
    'admin.pricing_rules.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.business.remove_logo': { paramsTuple?: []; params?: {} }
    'admin.business.remove_cover': { paramsTuple?: []; params?: {} }
    'admin.branches.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.closure_dates.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'branchId': ParamValue,'id': ParamValue} }
    'admin.alert_recipients.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  PATCH: {
    'admin.notifications.mark_read': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}