import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Role from '#models/role'
import User from '#models/user'
import Notification from '#models/notification'
import NotificationService from '#services/notification_service'

const json = (response: { body(): unknown }) => response.body() as Record<string, any>

test.group('notifications (in-app notifications M1.8)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  async function setupFixture() {
    const role = await Role.create({ name: 'Staff Member', slug: `staff-${Date.now()}` })
    const user = await User.create({
      fullName: 'Test User',
      email: `notify-${Date.now()}@wynk.test`,
      password: 'password123',
      roleId: role.id,
      isActive: true,
      mustResetPassword: false,
    })

    return { user }
  }

  test('staff can list their own notifications and get unread count', async ({
    client,
    assert,
  }) => {
    const { user } = await setupFixture()

    await NotificationService.send(user.id, {
      type: 'system',
      title: 'Welcome to Wynk',
      body: 'Your account has been set up.',
    })
    await NotificationService.send(user.id, {
      type: 'document_expiring',
      title: 'Inspection due',
      body: 'Toyota Corolla inspection is due.',
      link: '/dashboard/cars',
    })

    const countRes = await client.get('/api/v1/admin/notifications/unread-count').loginAs(user)
    countRes.assertStatus(200)
    assert.equal(json(countRes).count, 2)

    const listRes = await client.get('/api/v1/admin/notifications?unreadOnly=true').loginAs(user)
    listRes.assertStatus(200)
    const listBody = json(listRes)
    assert.equal(listBody.data.length, 2)
    assert.equal(listBody.data[0].userId, user.id)
  })

  test('staff can mark single notification and all notifications as read', async ({
    client,
    assert,
  }) => {
    const { user } = await setupFixture()

    const [first] = await NotificationService.send(user.id, {
      type: 'system',
      title: 'First Alert',
      body: 'Message 1',
    })

    await NotificationService.send(user.id, {
      type: 'system',
      title: 'Second Alert',
      body: 'Message 2',
    })

    // Mark single as read
    const readRes = await client.patch(`/api/v1/admin/notifications/${first.id}/read`).loginAs(user)
    readRes.assertStatus(200)
    assert.isTrue(json(readRes).data.isRead)

    let countRes = await client.get('/api/v1/admin/notifications/unread-count').loginAs(user)
    assert.equal(json(countRes).count, 1)

    // Mark all as read
    const allRes = await client.post('/api/v1/admin/notifications/read-all').loginAs(user)
    allRes.assertStatus(200)

    countRes = await client.get('/api/v1/admin/notifications/unread-count').loginAs(user)
    assert.equal(json(countRes).count, 0)
  })

  test('staff can delete a notification', async ({ client, assert }) => {
    const { user } = await setupFixture()

    const [item] = await NotificationService.send(user.id, {
      type: 'system',
      title: 'Disposable Alert',
      body: 'Delete me',
    })

    const delRes = await client.delete(`/api/v1/admin/notifications/${item.id}`).loginAs(user)
    delRes.assertStatus(200)

    const found = await Notification.find(item.id)
    assert.isNull(found)
  })
})
