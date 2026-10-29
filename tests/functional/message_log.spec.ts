import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import OutboundMessage from '#models/outbound_message'
import Role from '#models/role'
import User from '#models/user'

const json = (response: { body(): unknown }) => response.body() as Record<string, any>

test.group('message log', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('lists what was sent and why not; a skipped one can be sent again', async ({
    client,
    assert,
  }) => {
    const ownerRole = await Role.create({ name: 'Owner', slug: 'owner', isSuperAdmin: true })
    const deskRole = await Role.create({ name: 'Desk', slug: 'desk' })
    const owner = await User.create({
      email: 'owner@wynk.test',
      password: 'Password123!',
      roleId: ownerRole.id,
    })
    const desk = await User.create({
      email: 'desk@wynk.test',
      password: 'Password123!',
      roleId: deskRole.id,
    })
    const skipped = await OutboundMessage.create({
      channel: 'email',
      to: 'ama@example.test',
      kind: 'staff_booking_confirmed',
      subject: 'Booking confirmed - WYK-2026-00001',
      body: 'Hello',
      status: 'skipped',
      attempts: 0,
      lastError: 'Email isn’t set up on the server (SMTP_HOST is empty)',
    })
    await OutboundMessage.create({
      channel: 'sms',
      to: '+233241234567',
      kind: 'pickup_reminder',
      body: 'Reminder',
      status: 'sent',
      attempts: 1,
    })

    const list = await client.get('/api/v1/admin/messages').loginAs(owner)
    list.assertStatus(200)
    assert.lengthOf(json(list).data, 2)
    assert.sameMembers(Object.keys(json(list).meta.providers), ['email', 'sms'])
    assert.equal(json(list).meta.lastWeek.skipped, 1)
    const emails = await client
      .get('/api/v1/admin/messages')
      .qs({ channel: 'email', search: 'ama@' })
      .loginAs(owner)
    assert.equal(
      json(emails).data[0].error,
      'Email isn’t set up on the server (SMTP_HOST is empty)'
    )

    // One in full
    const one = await client.get(`/api/v1/admin/messages/${skipped.id}`).loginAs(owner)
    one.assertStatus(200)
    assert.equal(json(one).data.body, 'Hello')
    assert.equal(json(one).data.subject, 'Booking confirmed - WYK-2026-00001')

    const retried = await client.post(`/api/v1/admin/messages/${skipped.id}/retry`).loginAs(owner)
    retried.assertStatus(200)
    await skipped.refresh()
    // Queued again; in tests the sync queue runs it at once and it's skipped again (nothing leaves tests)
    assert.equal(skipped.lastError, 'Not sent from tests')

    const denied = await client.get('/api/v1/admin/messages').loginAs(desk)
    denied.assertStatus(403)
  })
})
