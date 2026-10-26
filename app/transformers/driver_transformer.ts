import { DateTime } from 'luxon'
import type Driver from '#models/driver'

export function driverToJson(driver: Driver) {
  const today = DateTime.now().startOf('day')
  const daysLeft = Math.floor(driver.licenceExpiresOn.diff(today, 'days').days)
  return {
    id: driver.id,
    userId: driver.userId,
    fullName: driver.fullName,
    phone: driver.phone,
    licenceNo: driver.licenceNo,
    licenceClass: driver.licenceClass,
    licenceExpiresOn: driver.licenceExpiresOn.toISODate(),
    licenceExpired: daysLeft < 0,
    licenceExpiresInDays: daysLeft,
    status: driver.status,
    dailyRateAmount: driver.dailyRateAmount,
    notes: driver.notes,
    createdAt: driver.createdAt.toISO(),
  }
}
