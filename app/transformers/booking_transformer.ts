import { DateTime } from 'luxon'
import type Booking from '#models/booking'

function coverUrl(booking: Booking) {
  const photos = booking.car.$preloaded.photos ? booking.car.photos : []
  const cover = photos.find((photo) => photo.isCover) ?? photos[0]
  return cover?.file?.url ?? null
}

/**
 * A booking for the dashboard. Expects customer, car (+ category) and extras
 * preloaded for the detail view; lists preload customer and car only.
 */
export function bookingToJson(booking: Booking, options: { graceMinutes?: number } = {}) {
  const customer = booking.$preloaded.customer ? booking.customer : null
  const car = booking.$preloaded.car ? booking.car : null
  const extras = booking.$preloaded.extras ? booking.extras : null
  const driver = booking.$preloaded.driver ? booking.driver : null
  const modifications = booking.$preloaded.modifications ? booking.modifications : null
  const grace = options.graceMinutes ?? 0
  return {
    id: booking.id,
    reference: booking.reference,
    status: booking.status,
    source: booking.source,
    driveType: booking.driveType,
    pickupAt: booking.pickupAt.toISO(),
    returnAt: booking.returnAt.toISO(),
    rentalDays: booking.priceSnapshot.rentalDays,
    holdExpiresAt: booking.holdExpiresAt?.toISO() ?? null,
    // Computed, never stored: on rent and past the return time plus grace
    overdue:
      booking.status === 'on_rent' && DateTime.now() > booking.returnAt.plus({ minutes: grace }),
    customer: customer && {
      id: customer.id,
      fullName: customer.fullName,
      phone: customer.phone,
      verificationStatus: customer.verificationStatus,
      blacklistSeverity: customer.blacklistSeverity,
    },
    car: car && {
      id: car.id,
      name: `${car.make} ${car.model} ${car.year}`,
      registrationNo: car.registrationNo,
      categoryName: car.$preloaded.category ? car.category.name : null,
      coverUrl: coverUrl(booking),
    },
    categoryId: booking.categoryId,
    deliveryZoneId: booking.deliveryZoneId,
    deliveryAddress: booking.deliveryAddress,
    collectionZoneId: booking.collectionZoneId,
    collectionAddress: booking.collectionAddress,
    outOfTown: booking.outOfTown,
    driverNightsAway: booking.driverNightsAway,
    destination: booking.destination,
    protectionPlanId: booking.protectionPlanId,
    driverId: booking.driverId,
    driver: driver && {
      id: driver.id,
      fullName: driver.fullName,
      phone: driver.phone,
      licenceExpiresOn: driver.licenceExpiresOn.toISODate(),
    },
    modifications:
      modifications?.map((modification) => ({
        id: modification.id,
        type: modification.type,
        before: modification.before,
        after: modification.after,
        priceDifferenceAmount: modification.priceDifferenceAmount,
        reason: modification.reason,
        createdByName: modification.creator?.fullName ?? modification.creator?.email ?? null,
        createdAt: modification.createdAt.toISO(),
      })) ?? null,
    extras:
      extras?.map((extra) => ({
        id: extra.id,
        extraId: extra.extraId,
        name: extra.name,
        quantity: extra.quantity,
        unitAmount: extra.unitAmount,
        totalAmount: extra.totalAmount,
      })) ?? null,
    subtotalAmount: booking.subtotalAmount,
    discountAmount: booking.discountAmount,
    discountReason: booking.discountReason,
    taxAmount: booking.taxAmount,
    totalAmount: booking.totalAmount,
    depositAmount: booking.depositAmount,
    reservationFeeAmount: booking.reservationFeeAmount,
    paidAmount: booking.paidAmount,
    balanceAmount: booking.balanceAmount,
    overrideReason: booking.overrideReason,
    confirmedAt: booking.confirmedAt?.toISO() ?? null,
    cancelledAt: booking.cancelledAt?.toISO() ?? null,
    cancelReason: booking.cancelReason,
    cancellationFeeAmount: booking.cancellationFeeAmount,
    noShowAt: booking.noShowAt?.toISO() ?? null,
    notes: booking.notes,
    createdAt: booking.createdAt.toISO(),
  }
}
