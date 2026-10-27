import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import AlertRecipient from '#models/alert_recipient'
import Business from '#models/business'
import OutboundMessage from '#models/outbound_message'
import Role from '#models/role'
import User from '#models/user'

const json = (response: { body(): unknown }) => response.body() as Record<string, any>

async function owner() {
  await Business.create({ name: 'Wynk', email: 'admin@wynk.test', timezone: 'Africa/Accra' })
  const role = await Role.create({ name: 'Owner', slug: 'owner', isSuperAdmin: true })
  return User.create({ email: 'owner@wynk.test', password: 'Password123!', roleId: role.id })
}

test.group('alert recipients (Settings → Notifications)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('add, change and remove people; the alert list comes with them', async ({
    client,
    assert,
  }) => {
    const user = await owner()
    const added = await client
      .post('/api/v1/admin/alert-recipients')
      .loginAs(user)
      .json({
        name: 'Ama Owner',
        phone: '024 111 2222',
        email: 'AMA@wynk.test',
        alerts: { online_booking: ['sms', 'email'], documents_expiring: [] },
      })
    added.assertStatus(201)
    const ama = json(added).data
    assert.equal(ama.phone, '+233241112222')
    assert.equal(ama.email, 'ama@wynk.test')
    // Alerts with no channel are dropped
    assert.deepEqual(ama.alerts, { online_booking: ['sms', 'email'] })

    // Email-only person: SMS choices are dropped (nowhere to send them)
    const kofi = json(
      await client
        .post('/api/v1/admin/alert-recipients')
        .loginAs(user)
        .json({
          name: 'Kofi',
          email: 'kofi@wynk.test',
          alerts: { payment_to_verify: ['sms', 'email'] },
        })
    ).data
    assert.deepEqual(kofi.alerts, { payment_to_verify: ['email'] })

    const list = json(await client.get('/api/v1/admin/alert-recipients').loginAs(user))
    assert.lengthOf(list.data, 2)
    assert.includeMembers(
      list.alerts.map((alert: { key: string }) => alert.key),
      ['online_booking', 'payment_to_verify', 'return_overdue']
    )

    const changed = await client
      .put(`/api/v1/admin/alert-recipients/${ama.id}`)
      .loginAs(user)
      .json({
        name: 'Ama',
        phone: '0241112222',
        email: null,
        alerts: { return_overdue: ['sms'] },
        active: false,
      })
    changed.assertStatus(200)
    assert.isFalse(json(changed).data.active)
    assert.isNull(json(changed).data.email)

    // Test send: one SMS (Ama has no email now) - recorded in the outbox (never sent from tests)
    const tested = await client.post(`/api/v1/admin/alert-recipients/${ama.id}/test`).loginAs(user)
    tested.assertStatus(200)
    assert.deepEqual(json(tested).data.sent, ['sms'])
    const message = await OutboundMessage.findByOrFail('kind', 'staff_test')
    assert.equal(message.to, '+233241112222')

    const removed = await client.delete(`/api/v1/admin/alert-recipients/${kofi.id}`).loginAs(user)
    removed.assertStatus(200)
    assert.lengthOf(await AlertRecipient.all(), 1)
  })

  test('refused: no way to reach them, a bad phone, an unknown alert', async ({ client }) => {
    const user = await owner()
    const post = (body: Record<string, unknown>) =>
      client.post('/api/v1/admin/alert-recipients').loginAs(user).json(body)
    const nobody = await post({ name: 'Nobody', alerts: {} })
    nobody.assertStatus(422)
    const bad = await post({ name: 'Bad', phone: '12', alerts: {} })
    bad.assertStatus(422)
    // Unknown alerts are ignored, not stored
    const odd = await post({ name: 'Odd', email: 'a@b.test', alerts: { birthdays: ['email'] } })
    odd.assertStatus(201)
  })
})
