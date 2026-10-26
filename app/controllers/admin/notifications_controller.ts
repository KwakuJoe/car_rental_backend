import type { HttpContext } from '@adonisjs/core/http'
import Notification from '#models/notification'
import NotificationTransformer from '#transformers/notification_transformer'
import NotificationService from '#services/notification_service'
import { listNotificationsValidator } from '#validators/notification'

export default class NotificationsController {
  async index({ auth, request, response, serialize }: HttpContext) {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(listNotificationsValidator)

    const query = Notification.query().where('user_id', user.id).orderBy('created_at', 'desc')

    if (payload.unreadOnly) {
      query.whereNull('read_at')
    }

    const notifications = await query.paginate(payload.page ?? 1, payload.limit ?? 20)
    const transformed = await serialize(
      NotificationTransformer.paginate(notifications.all(), notifications.getMeta())
    )

    return response.ok({
      message: 'Notifications fetched successfully',
      data: transformed.data,
      meta: transformed.metadata,
    })
  }

  async unreadCount({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const result = await Notification.query()
      .where('user_id', user.id)
      .whereNull('read_at')
      .count('* as total')

    return response.ok({
      message: 'Unread notifications counted',
      data: { count: Number(result[0].$extras.total) },
    })
  }

  async markRead({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const notification = await NotificationService.markAsRead(user.id, params.id)

    return response.ok({
      message: 'Notification marked as read',
      data: new NotificationTransformer(notification).toObject(),
    })
  }

  async markAllRead({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    await NotificationService.markAllAsRead(user.id)

    return response.ok({
      message: 'All notifications marked as read',
    })
  }

  async destroy({ auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const notification = await Notification.query()
      .where('id', params.id)
      .where('user_id', user.id)
      .firstOrFail()

    await notification.delete()

    return response.ok({
      message: 'Notification deleted successfully',
    })
  }
}
