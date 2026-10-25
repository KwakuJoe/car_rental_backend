import { BaseTransformer } from '@adonisjs/core/transformers'
import type Notification from '#models/notification'

export default class NotificationTransformer extends BaseTransformer<Notification> {
  toObject() {
    return {
      id: this.resource.id,
      userId: this.resource.userId,
      type: this.resource.type,
      title: this.resource.title,
      body: this.resource.body,
      link: this.resource.link,
      readAt: this.resource.readAt,
      isRead: Boolean(this.resource.readAt),
      createdAt: this.resource.createdAt,
      updatedAt: this.resource.updatedAt,
    }
  }
}
