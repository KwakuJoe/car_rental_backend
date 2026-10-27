import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import OutboundMessage from '#models/outbound_message'
import MessageService from '#services/messages/message_service'

const message = (overrides: Partial<OutboundMessage> = {}) =>
  OutboundMessage.create({
    channel: 'sms',
    to: '+233241112233',
    kind: 'booking_received',
    body: 'Hello',
    status: 'pending',
    attempts: 0,
    nextAttemptAt: DateTime.now(),
    ...overrides,
  })

/** Backdate a row's updated_at (Lucid would stamp "now" on save). */
const touchedAgo = (id: string, minutes: number) =>
  db
    .from('outbound_messages')
    .where('id', id)
    .update({ updated_at: DateTime.now().minus({ minutes }).toSQL() })

test.group('message outbox', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('a message another process is sending is left alone (nothing goes out twice)', async ({
    assert,
  }) => {
    const taken = await message({ status: 'sending' })
    const result = await MessageService.deliver(taken.id)
    assert.equal(result!.status, 'sending')
    assert.equal(result!.attempts, 0)
    assert.isNull(result!.lastError)
  })

  test('two tries at once: only one claims it', async ({ assert }) => {
    const queued = await message()
    const claims = await Promise.all([
      db
        .from('outbound_messages')
        .where('id', queued.id)
        .where('status', 'pending')
        .update({ status: 'sending' }),
      db
        .from('outbound_messages')
        .where('id', queued.id)
        .where('status', 'pending')
        .update({ status: 'sending' }),
    ])
    assert.deepEqual(claims.map(Number).sort(), [0, 1])
  })

  test('the retry job puts back sends that never finished, and tries them again', async ({
    assert,
  }) => {
    const stuck = await message({ status: 'sending' })
    await touchedAgo(stuck.id, 30)
    const busy = await message({ status: 'sending' })
    await touchedAgo(busy.id, 2)

    await MessageService.deliverDue()

    await stuck.refresh()
    await busy.refresh()
    // Tried again (and, in tests, recorded as not sent)
    assert.equal(stuck.status, 'skipped')
    // Claimed a moment ago: still someone else's
    assert.equal(busy.status, 'sending')
  })
})
