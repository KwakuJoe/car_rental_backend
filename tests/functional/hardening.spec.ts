import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import env from '#start/env'
import Business from '#models/business'
import File from '#models/file'
import Role from '#models/role'
import User from '#models/user'

const PASSWORD = 'Password123!'

async function setup() {
  await Business.create({ name: 'Wynk', email: 'admin@wynk.test', timezone: 'Africa/Accra' })
  const ownerRole = await Role.create({ name: 'Owner', slug: 'owner', isSuperAdmin: true })
  const deskRole = await Role.create({ name: 'Front desk', slug: 'front-desk' })
  const owner = await User.create({
    email: 'owner@wynk.test',
    password: PASSWORD,
    roleId: ownerRole.id,
  })
  const desk = await User.create({
    email: 'desk@wynk.test',
    password: PASSWORD,
    roleId: deskRole.id,
  })
  return { owner, desk }
}

async function signIn(client: any, email: string) {
  const response = await client.post('/api/v1/auth/login').json({ email, password: PASSWORD })
  response.assertStatus(200)
  return response.body().data.token as string
}

const tokenRows = (user: User) => db.from('auth_access_tokens').where('tokenable_id', user.id)

test.group('hardening: sessions', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('signed out after 2 idle hours; background refreshes do not count as use', async ({
    client,
    assert,
  }) => {
    const { desk } = await setup()
    const token = await signIn(client, desk.email)
    const profile = () =>
      client.get('/api/v1/account/profile').header('Authorization', `Bearer ${token}`)

    // Last used 3 hours ago: refused and removed
    const idle = new Date(Date.now() - 3 * 3600_000)
    await tokenRows(desk).update({ last_used_at: idle, created_at: idle })
    const refused = await profile()
    refused.assertStatus(401)
    assert.lengthOf(await tokenRows(desk), 0)

    // A fresh sign-in: a background refresh leaves "last used" alone, a real request moves it
    const fresh = await signIn(client, desk.email)
    const hourAgo = new Date(Date.now() - 3600_000)
    await tokenRows(desk).update({ last_used_at: hourAgo })
    const background = await client
      .get('/api/v1/account/profile')
      .header('Authorization', `Bearer ${fresh}`)
      .header('X-Background', '1')
    background.assertStatus(200)
    const [afterBackground] = await tokenRows(desk)
    assert.equal(new Date(afterBackground.last_used_at).getTime(), hourAgo.getTime())
    const used = await client
      .get('/api/v1/account/profile')
      .header('Authorization', `Bearer ${fresh}`)
    used.assertStatus(200)
    const [afterUse] = await tokenRows(desk)
    assert.isAbove(new Date(afterUse.last_used_at).getTime(), Date.now() - 60_000)

    // 12 hours at most
    assert.isBelow(new Date(afterUse.expires_at).getTime(), Date.now() + 12 * 3600_000 + 60_000)
  })

  test('a password reset or deactivation signs the person out everywhere', async ({
    client,
    assert,
  }) => {
    const { owner, desk } = await setup()
    const ownerToken = await signIn(client, owner.email)
    await signIn(client, desk.email)
    await signIn(client, desk.email)
    assert.lengthOf(await tokenRows(desk), 2)

    const reset = await client
      .post(`/api/v1/admin/users/${desk.id}/reset-password`)
      .header('Authorization', `Bearer ${ownerToken}`)
    reset.assertStatus(200)
    assert.lengthOf(await tokenRows(desk), 0)

    // Deactivated (signed in again with the temporary password first)
    const temporary = reset.body().data.temporaryPassword
    const again = await client
      .post('/api/v1/auth/login')
      .json({ email: desk.email, password: temporary })
    again.assertStatus(200)
    assert.lengthOf(await tokenRows(desk), 1)
    const deactivated = await client
      .put(`/api/v1/admin/users/${desk.id}`)
      .header('Authorization', `Bearer ${ownerToken}`)
      .json({ isActive: false })
    deactivated.assertStatus(200)
    assert.lengthOf(await tokenRows(desk), 0)
  })

  test('changing your password signs out your other devices, not this one', async ({
    client,
    assert,
  }) => {
    const { desk } = await setup()
    await signIn(client, desk.email)
    const here = await signIn(client, desk.email)
    const changed = await client
      .post('/api/v1/account/change-password')
      .header('Authorization', `Bearer ${here}`)
      .json({
        currentPassword: PASSWORD,
        password: 'NewPassword456!',
        passwordConfirmation: 'NewPassword456!',
      })
    changed.assertStatus(200)
    assert.lengthOf(await tokenRows(desk), 1)
    const still = await client
      .get('/api/v1/account/profile')
      .header('Authorization', `Bearer ${here}`)
    still.assertStatus(200)
  })
})

test.group('hardening: visitor IP for rate limits', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(() => {
    const previous = env.get('PROXY_SECRET')
    env.set('PROXY_SECRET', 'test-proxy-secret')
    return () => env.set('PROXY_SECRET', previous ?? '')
  })

  test('the visitor IP from the frontend counts only with the shared secret', async ({
    client,
    assert,
  }) => {
    await setup()
    const lookup = async (ip: string, secret = 'test-proxy-secret') => {
      const response = await client
        .post('/api/v1/public/bookings/lookup')
        .header('X-Client-IP', ip)
        .header('X-Proxy-Secret', secret)
        .json({ reference: 'WYK-2026-99999', phone: '+233241234567' })
      return response.status()
    }

    // One visitor uses up their 5 lookups...
    for (let i = 0; i < 5; i++) assert.equal(await lookup('198.51.100.7'), 200)
    assert.equal(await lookup('198.51.100.7'), 429)
    // ...another visitor behind the same frontend is unaffected
    assert.equal(await lookup('198.51.100.8'), 200)
    // A made-up address without the secret is ignored (counted as the real sender)
    for (let i = 0; i < 5; i++) assert.equal(await lookup(`203.0.113.${i}`, 'wrong'), 200)
    assert.equal(await lookup('203.0.113.99', 'wrong'), 429)
  })
})

test.group('hardening: files', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('the uploader cannot delete a file that is part of a saved record', async ({ client }) => {
    const { desk } = await setup()
    const token = await signIn(client, desk.email)
    const attached = await File.create({
      disk: 'cloudinary',
      path: 'wynk/receipt_proof/proof',
      url: 'https://res.cloudinary.com/demo/proof.jpg',
      originalName: 'proof.jpg',
      mime: 'image/jpeg',
      size: 1000,
      purpose: 'receipt_proof',
      isPrivate: true,
      uploadedBy: desk.id,
      attachableType: 'payment',
      attachableId: '01HXAMPLEPAYMENT000000000A',
    })
    const refused = await client
      .delete(`/api/v1/admin/files/${attached.id}`)
      .header('Authorization', `Bearer ${token}`)
    refused.assertStatus(403)
  })
})
