import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import router from '@adonisjs/core/services/router'
import Role from '#models/role'
import User from '#models/user'
import Branch from '#models/branch'
import Business from '#models/business'

/**
 * Every JSON endpoint answers { message, data, ... } (see
 * prompt-reference/controller_response.txt). The frontend reads `data`; a bare
 * body (e.g. { count }) breaks it silently - this happened with the
 * notifications unread count.
 *
 * Calls every admin GET route without path params as the owner, so new
 * endpoints are covered automatically.
 */
test.group('API response envelope', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('every admin GET endpoint returns { message, data }', async ({ client, assert }) => {
    const business = await Business.create({ name: 'Wynk Car Rentals', email: 'admin@wynk.test' })
    await Branch.create({ businessId: business.id, name: 'Main', code: 'MAIN', isMain: true })
    const role = await Role.create({ name: 'Owner', slug: 'owner', isSuperAdmin: true })
    const owner = await User.create({
      email: 'owner@wynk.test',
      password: 'Password123!',
      roleId: role.id,
    })

    const patterns = Object.values(router.toJSON())
      .flat()
      .filter((route) => route.methods.includes('GET'))
      .map((route) => route.pattern)
      .filter((pattern) => pattern.startsWith('/api/v1/admin/') && !pattern.includes(':'))

    assert.isAbove(patterns.length, 10, 'expected to find the admin GET routes')

    const broken: string[] = []
    for (const pattern of patterns) {
      const response = await client.get(pattern).loginAs(owner)
      const body = response.body() as Record<string, unknown>
      if (response.status() !== 200) {
        broken.push(`${pattern} -> HTTP ${response.status()}`)
      } else if (typeof body?.message !== 'string' || !('data' in body)) {
        broken.push(`${pattern} -> keys: ${Object.keys(body ?? {}).join(', ')}`)
      }
    }
    assert.deepEqual(broken, [], `Endpoints not using the { message, data } envelope`)
  })
})
