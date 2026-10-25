import { DateTime } from 'luxon'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import Notification from '#models/notification'
import User from '#models/user'

export default class NotificationService {
  /**
   * Send notification to one or multiple specific users.
   */
  static async send(
    userIds: string | string[],
    payload: {
      type: string
      title: string
      body: string
      link?: string | null
    },
    client?: TransactionClientContract
  ) {
    const ids = Array.isArray(userIds) ? userIds : [userIds]
    if (ids.length === 0) return []

    const records = ids.map((userId) => ({
      userId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      link: payload.link ?? null,
      readAt: null,
    }))

    return Notification.createMany(records, { client })
  }

  /**
   * Send notification to all active users holding a specific permission.
   */
  static async sendToPermission(
    permissionSlug: string,
    payload: {
      type: string
      title: string
      body: string
      link?: string | null
    },
    client?: TransactionClientContract
  ) {
    const activeUsers = await User.query({ client })
      .where('is_active', true)
      .preload('role', (rq) => rq.preload('permissions'))

    const recipientIds: string[] = []
    for (const user of activeUsers) {
      const override = user.permissionsOverride?.[permissionSlug]
      if (override === false) continue
      if (override === true) {
        recipientIds.push(user.id)
        continue
      }
      if (
        user.role?.isSuperAdmin ||
        user.role?.permissions.some((p) => p.slug === permissionSlug)
      ) {
        recipientIds.push(user.id)
      }
    }

    return this.send(recipientIds, payload, client)
  }

  /**
   * Send notification to all active users with specific role slugs.
   */
  static async sendToRoles(
    roleSlugs: string[],
    payload: {
      type: string
      title: string
      body: string
      link?: string | null
    },
    client?: TransactionClientContract
  ) {
    const activeUsers = await User.query({ client })
      .where('is_active', true)
      .whereHas('role', (rq) => {
        rq.whereIn('slug', roleSlugs).orWhere('is_super_admin', true)
      })

    const recipientIds = activeUsers.map((u) => u.id)
    return this.send(recipientIds, payload, client)
  }

  /**
   * Mark a single notification as read.
   */
  static async markAsRead(userId: string, notificationId: string) {
    const notification = await Notification.query()
      .where('id', notificationId)
      .where('user_id', userId)
      .firstOrFail()

    if (!notification.readAt) {
      notification.readAt = DateTime.now()
      await notification.save()
    }

    return notification
  }

  /**
   * Mark all notifications as read for a user.
   */
  static async markAllAsRead(userId: string) {
    await Notification.query()
      .where('user_id', userId)
      .whereNull('read_at')
      .update({ read_at: DateTime.now().toSQL() })

    return { success: true }
  }
}
