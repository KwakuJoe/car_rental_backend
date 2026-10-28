import { DateTime } from 'luxon'
import MaintenanceSchedule from '#models/maintenance_schedule'
import Notification from '#models/notification'
import MaintenanceService from '#services/maintenance/maintenance_service'
import { currentBusiness } from '#services/memo'
import NotificationService from '#services/notification_service'
import StaffAlerts from '#services/messages/staff_alerts'

/**
 * Daily (06:00 Accra): services reaching their reminder day, due today, or
 * overdue (again each week while overdue). Each schedule shows in the
 * bell once per milestone (dedupe key); the team gets ONE SMS / email
 * listing them all - per "Service due" in Settings → Notifications, which
 * can be switched on or off per person and channel.
 */
export default class MaintenanceAlerts {
  static async check() {
    const business = await currentBusiness()
    const today = DateTime.now()
      .setZone(business?.timezone || 'Africa/Accra')
      .toISODate()!
    const schedules = await MaintenanceSchedule.query()
      .where('active', true)
      .where('next_due_on', '<=', DateTime.fromISO(today).plus({ days: 90 }).toISODate()!)
      .whereHas('car', (car) => car.whereNull('archived_at').whereNot('status', 'retired'))
      .preload('car')

    const fresh: { schedule: MaintenanceSchedule; daysLeft: number }[] = []
    for (const schedule of schedules) {
      const { daysLeft } = MaintenanceService.state(schedule, today)
      const milestone =
        daysLeft === schedule.remindDaysBefore ||
        daysLeft === 0 ||
        (daysLeft < 0 && -daysLeft % 7 === 0)
      if (!milestone) continue
      const dedupeKey = `maintenance:${schedule.id}:${schedule.nextDueOn.toISODate()}:${daysLeft}`
      if (await Notification.query().where('dedupe_key', dedupeKey).first()) continue

      const car = `${schedule.car.make} ${schedule.car.model} (${schedule.car.registrationNo})`
      await NotificationService.sendToPermission('maintenance.manage', {
        type: 'maintenance_due',
        title:
          daysLeft < 0
            ? `Service overdue: ${schedule.car.registrationNo}`
            : `Service due: ${schedule.car.registrationNo}`,
        body: `${schedule.task} for ${car} ${this.when(daysLeft, schedule)}.`,
        link: `/dashboard/maintenance?car=${schedule.carId}`,
        dedupeKey,
      })
      fresh.push({ schedule, daysLeft })
    }

    if (fresh.length > 0) {
      const overdue = fresh.filter((item) => item.daysLeft < 0).length
      const first = fresh[0]
      await StaffAlerts.send('maintenance_due', {
        sms:
          fresh.length === 1
            ? `${first.schedule.task} for ${first.schedule.car.registrationNo} ${this.when(first.daysLeft, first.schedule)}.`
            : `${fresh.length} services need booking in${overdue ? ` (${overdue} overdue)` : ''}: ${fresh
                .slice(0, 4)
                .map((item) => item.schedule.car.registrationNo)
                .join(', ')}${fresh.length > 4 ? '…' : ''}. See Maintenance.`,
        email: {
          subject:
            fresh.length === 1
              ? `Service due: ${first.schedule.car.registrationNo} - ${first.schedule.task}`
              : `${fresh.length} services due${overdue ? ` (${overdue} overdue)` : ''}`,
          preheader: 'Services coming up or overdue - book them in before the cars go out again.',
          eyebrow: {
            text: overdue ? 'Overdue' : 'Coming up',
            color: overdue ? '#fb242f' : '#d97706',
          },
          heading: fresh.length === 1 ? 'A service is due' : 'Services are due',
          paragraphs: ['Book these in, or open a job card when the car goes to the garage.'],
          details: {
            rows: fresh.map((item) => ({
              label: `${item.schedule.car.registrationNo} · ${item.schedule.task}`,
              value: this.when(item.daysLeft, item.schedule),
            })),
          },
          path: '/dashboard/maintenance',
          buttonLabel: 'Open Maintenance',
        },
      })
    }
    return { checked: schedules.length, alerted: fresh.length }
  }

  private static when(daysLeft: number, schedule: MaintenanceSchedule) {
    const date = schedule.nextDueOn.toFormat('d LLL yyyy')
    if (daysLeft === 0) return 'is due today'
    if (daysLeft < 0) return `was due ${date} (${-daysLeft} day${daysLeft === -1 ? '' : 's'} ago)`
    return `is due ${date} (in ${daysLeft} day${daysLeft === 1 ? '' : 's'})`
  }
}
