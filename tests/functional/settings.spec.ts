import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Business from '#models/business'
import Branch from '#models/branch'
import OpeningHour from '#models/opening_hour'
import Role from '#models/role'
import User from '#models/user'
import File from '#models/file'
import AuditLog from '#models/audit_log'
import FileService from '#services/file_service'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const json = (response: { body(): unknown }) => response.body() as Record<string, any>

async function setup() {
  const business = await Business.create({ name: 'Sunrise Car Rentals', email: 'hi@sunrise.test' })
  const main = await Branch.create({
    businessId: business.id,
    name: 'Main Branch',
    code: 'MAIN',
    isMain: true,
  })
  await OpeningHour.createMany(
    Array.from({ length: 7 }, (_, weekday) => ({
      branchId: main.id,
      weekday,
      isClosed: weekday === 0,
      opensAt: weekday === 0 ? null : '08:00',
      closesAt: weekday === 0 ? null : '18:00',
    }))
  )
  const ownerRole = await Role.create({ name: 'Owner', slug: 'owner', isSuperAdmin: true })
  const frontDeskRole = await Role.create({ name: 'Front Desk', slug: 'front-desk' })
  const owner = await User.create({
    email: 'owner@sunrise.test',
    password: 'OwnerPass123',
    roleId: ownerRole.id,
  })
  const frontDesk = await User.create({
    email: 'desk@sunrise.test',
    password: 'DeskPass123',
    roleId: frontDeskRole.id,
  })
  return { business, main, owner, frontDesk }
}

test.group('lookups', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('any signed-in staff member can read business, roles and active branches', async ({
    client,
    assert,
  }) => {
    const { frontDesk, main } = await setup()
    await Branch.create({
      businessId: main.businessId,
      name: 'Closed Branch',
      code: 'OLD',
      isActive: false,
    })

    const business = await client.get('/api/v1/admin/lookups/business').loginAs(frontDesk)
    business.assertStatus(200)
    assert.equal(json(business).data.name, 'Sunrise Car Rentals')
    assert.equal(json(business).data.currency, 'GHS')

    const roles = await client.get('/api/v1/admin/lookups/roles').loginAs(frontDesk)
    roles.assertStatus(200)
    assert.sameMembers(
      json(roles).data.map((role: { slug: string }) => role.slug),
      ['owner', 'front-desk']
    )

    const branches = await client.get('/api/v1/admin/lookups/branches').loginAs(frontDesk)
    assert.deepEqual(
      json(branches).data.map((branch: { code: string }) => branch.code),
      ['MAIN']
    )
  })
})

test.group('business profile', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('requires settings.manage', async ({ client }) => {
    const { frontDesk } = await setup()
    const response = await client.get('/api/v1/admin/business').loginAs(frontDesk)
    response.assertStatus(403)
  })

  test('owner updates the profile; turning VAT off clears the VAT number', async ({
    client,
    assert,
  }) => {
    const { owner } = await setup()

    const withVat = await client.put('/api/v1/admin/business').loginAs(owner).json({
      tin: 'C0012345678',
      vatRegistered: true,
      vatNumber: 'V123',
      whatsappPhone: '0244000000',
    })
    withVat.assertStatus(200)
    assert.equal(json(withVat).data.vatNumber, 'V123')

    const withoutVat = await client
      .put('/api/v1/admin/business')
      .loginAs(owner)
      .json({ vatRegistered: false })
    assert.isNull(json(withoutVat).data.vatNumber)
    assert.equal(json(withoutVat).data.currency, 'GHS')
  })
})

test.group('business logo', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.setup(() => {
    FileService.setMockUploader(async (file, options) => ({
      url: `https://res.cloudinary.com/test/${options.purpose}/${file.clientName}`,
      publicId: `wynk/${options.purpose}/mock_${file.clientName}`,
      bytes: file.size,
      format: 'png',
      resourceType: 'image',
    }))
    return () => FileService.setMockUploader(null)
  })

  // 1x1 transparent PNG
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    'base64'
  )
  const tempFile = (name: string, content: Buffer) => {
    const filePath = path.join(os.tmpdir(), name)
    fs.writeFileSync(filePath, content)
    return filePath
  }

  test('owner uploads, replaces and removes the logo; the old file goes', async ({
    client,
    assert,
  }) => {
    const { owner } = await setup()
    const upload = (name: string) =>
      client
        .put('/api/v1/admin/business/logo')
        .file('file', tempFile(name, png), { filename: name, contentType: 'image/png' })
        .loginAs(owner)

    const first = await upload('logo-a.png')
    first.assertStatus(200)
    assert.match(json(first).data.logoUrl, /logo-a\.png$/)
    const firstFile = await File.findByOrFail('original_name', 'logo-a.png')
    assert.equal(firstFile.purpose, 'business_logo')
    assert.isFalse(firstFile.isPrivate)

    const second = await upload('logo-b.png')
    assert.match(json(second).data.logoUrl, /logo-b\.png$/)
    assert.isNull(await File.find(firstFile.id))

    const lookup = await client.get('/api/v1/admin/lookups/business').loginAs(owner)
    assert.match(json(lookup).data.logoUrl, /logo-b\.png$/)

    const removed = await client.delete('/api/v1/admin/business/logo').loginAs(owner)
    removed.assertStatus(200)
    assert.isNull(json(removed).data.logoUrl)
    assert.lengthOf(await File.query().where('purpose', 'business_logo'), 0)
    const logs = await AuditLog.query().where('subject_type', 'business')
    const actions = logs.map((log) => log.action)
    assert.includeMembers(actions, ['business.logo_updated', 'business.logo_removed'])
  })

  test('only images, and only for settings.manage', async ({ client }) => {
    const { owner, frontDesk } = await setup()
    const pdf = await client
      .put('/api/v1/admin/business/logo')
      .file('file', tempFile('logo.pdf', Buffer.from('%PDF-1.4')), {
        filename: 'logo.pdf',
        contentType: 'application/pdf',
      })
      .loginAs(owner)
    pdf.assertStatus(422)

    const desk = await client
      .put('/api/v1/admin/business/logo')
      .file('file', tempFile('logo-c.png', png), {
        filename: 'logo-c.png',
        contentType: 'image/png',
      })
      .loginAs(frontDesk)
    desk.assertStatus(403)
  })
})

test.group('branches', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('a new branch gets an uppercase code and a copy of the main branch hours', async ({
    client,
    assert,
  }) => {
    const { owner } = await setup()

    const response = await client
      .post('/api/v1/admin/branches')
      .loginAs(owner)
      .json({ name: 'Airport Branch', code: 'kia', city: 'Accra' })
    response.assertStatus(201)
    assert.equal(json(response).data.code, 'KIA')
    assert.isFalse(json(response).data.isMain)

    const hours = await client
      .get(`/api/v1/admin/branches/${json(response).data.id}/opening-hours`)
      .loginAs(owner)
    assert.lengthOf(json(hours).data, 7)
    assert.deepEqual(json(hours).data[1], {
      weekday: 1,
      isClosed: false,
      opensAt: '08:00',
      closesAt: '18:00',
    })

    const duplicate = await client
      .post('/api/v1/admin/branches')
      .loginAs(owner)
      .json({ name: 'Another', code: 'KIA' })
    duplicate.assertStatus(422)
  })

  test('promoting a branch demotes the old main; the main branch cannot be unset or deactivated', async ({
    client,
    assert,
  }) => {
    const { owner, main } = await setup()
    const airport = await Branch.create({
      businessId: main.businessId,
      name: 'Airport',
      code: 'KIA',
    })

    const unset = await client
      .put(`/api/v1/admin/branches/${main.id}`)
      .loginAs(owner)
      .json({ isMain: false })
    unset.assertStatus(400)
    const deactivate = await client
      .put(`/api/v1/admin/branches/${main.id}`)
      .loginAs(owner)
      .json({ isActive: false })
    deactivate.assertStatus(400)

    const promote = await client
      .put(`/api/v1/admin/branches/${airport.id}`)
      .loginAs(owner)
      .json({ isMain: true })
    promote.assertStatus(200)
    assert.isTrue(json(promote).data.isMain)
    await main.refresh()
    assert.isFalse(main.isMain)
  })

  test('only an empty, non-main branch can be deleted', async ({ client }) => {
    const { owner, main, frontDesk } = await setup()
    const airport = await Branch.create({
      businessId: main.businessId,
      name: 'Airport',
      code: 'KIA',
    })
    const empty = await Branch.create({ businessId: main.businessId, name: 'Kumasi', code: 'KSI' })
    await frontDesk.related('branches').attach([airport.id])

    {
      const response = await client.delete(`/api/v1/admin/branches/${main.id}`).loginAs(owner)
      response.assertStatus(400)
    }
    {
      const response = await client.delete(`/api/v1/admin/branches/${airport.id}`).loginAs(owner)
      response.assertStatus(409)
    }
    {
      const response = await client.delete(`/api/v1/admin/branches/${empty.id}`).loginAs(owner)
      response.assertStatus(200)
    }
  })
})

test.group('opening hours and closure dates', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  const week = (overrides: Record<number, object> = {}) =>
    Array.from({ length: 7 }, (_, weekday) => ({
      weekday,
      isClosed: false,
      opensAt: '07:30',
      closesAt: '19:00',
      ...overrides[weekday],
    }))

  test('replaces the full week and rejects invalid days', async ({ client, assert }) => {
    const { owner, main } = await setup()
    const url = `/api/v1/admin/branches/${main.id}/opening-hours`

    const ok = await client
      .put(url)
      .loginAs(owner)
      .json({ days: week({ 0: { isClosed: true } }) })
    ok.assertStatus(200)
    assert.deepEqual(json(ok).data[0], {
      weekday: 0,
      isClosed: true,
      opensAt: null,
      closesAt: null,
    })
    assert.equal(json(ok).data[3].opensAt, '07:30')

    const backwards = await client
      .put(url)
      .loginAs(owner)
      .json({ days: week({ 2: { opensAt: '18:00', closesAt: '08:00' } }) })
    backwards.assertStatus(422)

    const short = await client
      .put(url)
      .loginAs(owner)
      .json({ days: week().slice(0, 6) })
    short.assertStatus(422)
  })

  test('adds, lists, rejects duplicates of, and removes closure dates', async ({
    client,
    assert,
  }) => {
    const { owner, main } = await setup()
    const url = `/api/v1/admin/branches/${main.id}/closure-dates`

    const created = await client
      .post(url)
      .loginAs(owner)
      .json({ date: '2099-12-25', reason: 'Christmas Day' })
    created.assertStatus(201)
    assert.equal(json(created).data.date, '2099-12-25')

    {
      const response = await client.post(url).loginAs(owner).json({ date: '2099-12-25' })
      response.assertStatus(422)
    }

    const list = await client.get(url).loginAs(owner)
    assert.deepEqual(
      json(list).data.map((closure: { date: string }) => closure.date),
      ['2099-12-25']
    )

    {
      const response = await client.delete(`${url}/${json(created).data.id}`).loginAs(owner)
      response.assertStatus(200)
    }
  })
})
