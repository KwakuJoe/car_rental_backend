import { test } from '@japa/runner'
import ace from '@adonisjs/core/services/ace'
import testUtils from '@adonisjs/core/services/test_utils'
import BusinessCreate from '../../../commands/business_create.js'
import Business from '#models/business'
import User from '#models/user'

function trapPrompts(command: BusinessCreate) {
  command.prompt.trap('Business name').replyWith('Sunrise Car Rentals')
  command.prompt.trap('Business email').replyWith('hello@sunrise.test')
  command.prompt.trap('Business phone (optional)').replyWith('0302000000')
  command.prompt.trap('City').replyWith('Accra')
  command.prompt.trap('Region').replyWith('Greater Accra')
  command.prompt.trap('Owner name').replyWith('Ada Owusu')
  command.prompt.trap('Owner email').replyWith('ada@sunrise.test')
}

test.group('business:create', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('creates the business, main branch, opening hours, roles and owner', async ({ assert }) => {
    const command = await ace.create(BusinessCreate, [])
    trapPrompts(command)

    await command.exec()

    command.assertSucceeded()

    const business = await Business.query()
      .preload('mainBranch', (query) => query.preload('openingHours'))
      .firstOrFail()
    assert.equal(business.name, 'Sunrise Car Rentals')
    assert.equal(business.currency, 'GHS')
    assert.equal(business.timezone, 'Africa/Accra')
    assert.equal(business.mainBranch.name, 'Sunrise Car Rentals - Main Branch')
    assert.isTrue(business.mainBranch.isMain)
    assert.lengthOf(business.mainBranch.openingHours, 7)

    const owner = await User.query()
      .where('email', 'ada@sunrise.test')
      .preload('role')
      .preload('branches')
      .firstOrFail()
    assert.isTrue(owner.mustResetPassword)
    assert.equal(owner.role.slug, 'owner')
    assert.isTrue(owner.role.isSuperAdmin)
    assert.deepEqual(
      owner.branches.map((branch) => branch.id),
      [business.mainBranch.id]
    )
  })

  test('refuses to run again once a business exists', async ({ assert }) => {
    await Business.create({ name: 'Existing Rentals', email: 'hi@existing.test' })

    const command = await ace.create(BusinessCreate, [])
    await command.exec()

    command.assertFailed()
    assert.equal(
      await Business.query()
        .count('* as total')
        .then((r) => Number(r[0].$extras.total)),
      1
    )
  })
})
