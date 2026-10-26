import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Role from '#models/role'
import Permission from '#models/permission'
import User from '#models/user'
import Business from '#models/business'
import Branch from '#models/branch'
import Customer from '#models/customer'
import File from '#models/file'
import AuditLog from '#models/audit_log'
import { normalizeDocumentNumber, normalizePhone } from '#helpers/phone'
import FileService from '#services/file_service'
import { DateTime } from 'luxon'

const json = (response: { body(): unknown }) => response.body() as Record<string, any>

/** A customer's blacklist severity, read fresh from the database. */
async function severityOf(id: string) {
  const customer = await Customer.findOrFail(id)
  return customer.blacklistSeverity
}

test.group('phone and document numbers', () => {
  test('phones normalise to E.164', ({ assert }) => {
    assert.equal(normalizePhone('0241234567'), '+233241234567')
    assert.equal(normalizePhone('024 123 4567'), '+233241234567')
    assert.equal(normalizePhone('233241234567'), '+233241234567')
    assert.equal(normalizePhone('+233 24 123 4567'), '+233241234567')
    assert.equal(normalizePhone('+44 7700 900123'), '+447700900123')
    assert.isNull(normalizePhone('12345'))
    assert.isNull(normalizePhone(''))
  })

  test('Ghana Card numbers normalise to GHA-XXXXXXXXX-X', ({ assert }) => {
    assert.equal(normalizeDocumentNumber('ghana_card', 'gha 123456789 0'), 'GHA-123456789-0')
    assert.equal(normalizeDocumentNumber('ghana_card', 'GHA1234567890'), 'GHA-123456789-0')
    assert.equal(normalizeDocumentNumber('passport', ' g123 4567 '), 'G1234567')
  })
})

async function setup() {
  const business = await Business.create({ name: 'Wynk Car Rentals', email: 'admin@wynk.test' })
  await Branch.create({ businessId: business.id, name: 'Main', code: 'MAIN', isMain: true })
  const perms: Record<string, Permission> = {}
  for (const slug of [
    'customers.view',
    'customers.manage',
    'customers.verify',
    'customers.view_documents',
    'customers.blacklist',
  ]) {
    perms[slug] = await Permission.create({ name: slug, slug, group: 'customers' })
  }
  const role = async (slug: string, grants: string[]) => {
    const created = await Role.create({ name: slug, slug })
    await created.related('permissions').attach(grants.map((grant) => perms[grant].id))
    return created
  }
  const ownerRole = await Role.create({ name: 'Owner', slug: 'owner', isSuperAdmin: true })
  const deskRole = await role('front-desk', [
    'customers.view',
    'customers.manage',
    'customers.verify',
    'customers.view_documents',
  ])
  const accountantRole = await role('accountant', ['customers.view'])
  const driverRole = await role('driver', [])
  const user = (email: string, roleId: string) =>
    User.create({ email, password: 'Password123!', roleId })
  return {
    owner: await user('owner@wynk.test', ownerRole.id),
    desk: await user('desk@wynk.test', deskRole.id),
    accountant: await user('accountant@wynk.test', accountantRole.id),
    driver: await user('driver@wynk.test', driverRole.id),
  }
}

let fileSeq = 0
function privateFile(purpose: 'id_front' | 'id_back' | 'licence' | 'car_photo') {
  fileSeq++
  return File.create({
    disk: 'cloudinary',
    path: `wynk/${purpose}/${fileSeq}`,
    url: `https://res.cloudinary.com/test/${purpose}/${fileSeq}.jpg`,
    originalName: `${purpose}.jpg`,
    mime: 'image/jpeg',
    size: 1000,
    purpose,
    isPrivate: purpose !== 'car_photo',
    metadata: {},
  })
}

const ama = { fullName: 'Ama Owusu', phone: '024 123 4567', dateOfBirth: '1990-05-14' }

test.group('customers', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('create: phone normalised, unique among active customers, audited', async ({
    client,
    assert,
  }) => {
    const { desk } = await setup()
    const created = await client.post('/api/v1/admin/customers').json(ama).loginAs(desk)
    created.assertStatus(201)
    const data = json(created).data
    assert.equal(data.phone, '+233241234567')
    assert.equal(data.verificationStatus, 'unverified')
    assert.isNull(data.blacklistSeverity)

    const again = await client
      .post('/api/v1/admin/customers')
      .json({ fullName: 'Someone Else', phone: '0241234567' })
      .loginAs(desk)
    again.assertStatus(422)
    assert.equal(json(again).message, 'This phone number already belongs to Ama Owusu.')

    const badPhone = await client
      .post('/api/v1/admin/customers')
      .json({ fullName: 'Kofi', phone: '12' })
      .loginAs(desk)
    badPhone.assertStatus(422)

    const audit = await AuditLog.findByOrFail('action', 'customer.created')
    assert.equal(audit.subjectId, data.id)
  })

  test('archived customers leave the list and free their phone number', async ({
    client,
    assert,
  }) => {
    const { owner } = await setup()
    const created = await client.post('/api/v1/admin/customers').json(ama).loginAs(owner)
    const id = json(created).data.id

    const archived = await client.delete(`/api/v1/admin/customers/${id}`).loginAs(owner)
    archived.assertStatus(200)
    const list = await client.get('/api/v1/admin/customers').loginAs(owner)
    assert.lengthOf(json(list).data, 0)
    const archivedList = await client.get('/api/v1/admin/customers?archived=true').loginAs(owner)
    assert.lengthOf(json(archivedList).data, 1)

    const reused = await client.post('/api/v1/admin/customers').json(ama).loginAs(owner)
    reused.assertStatus(201)
  })

  test('search finds name, any phone format and document numbers', async ({ client, assert }) => {
    const { owner } = await setup()
    const created = await client.post('/api/v1/admin/customers').json(ama).loginAs(owner)
    const id = json(created).data.id
    await client
      .post(`/api/v1/admin/customers/${id}/identities`)
      .json({ type: 'ghana_card', number: 'GHA-123456789-0' })
      .loginAs(owner)
    await client
      .post('/api/v1/admin/customers')
      .json({ fullName: 'Kwame Mensah', phone: '0201112222' })
      .loginAs(owner)

    for (const term of ['ama', '0241234567', '+233 24 123 4567', '123456789']) {
      const found = await client
        .get(`/api/v1/admin/customers?search=${encodeURIComponent(term)}`)
        .loginAs(owner)
      assert.deepEqual(
        json(found).data.map((customer: any) => customer.fullName),
        ['Ama Owusu'],
        term
      )
    }
  })

  test('documents: rules, masking, verification status', async ({ client, assert }) => {
    const { owner, accountant } = await setup()
    const created = await client.post('/api/v1/admin/customers').json(ama).loginAs(owner)
    const id = json(created).data.id
    const add = (body: Record<string, unknown>) =>
      client.post(`/api/v1/admin/customers/${id}/identities`).json(body).loginAs(owner)

    const badCard = await add({ type: 'ghana_card', number: 'GHA-12345' })
    badCard.assertStatus(422)
    assert.equal(json(badCard).message, 'A Ghana Card number looks like GHA-123456789-0.')
    const noExpiry = await add({ type: 'drivers_licence', number: 'DL-777' })
    noExpiry.assertStatus(422)

    const front = await privateFile('id_front')
    const card = await add({ type: 'ghana_card', number: 'gha 123456789 0', frontFileId: front.id })
    card.assertStatus(201)
    assert.equal(json(card).data.number, 'GHA-123456789-0') // owner can see it
    assert.equal(json(card).data.status, 'pending')

    // Without customers.view_documents: masked, no file ids
    const masked = await client.get(`/api/v1/admin/customers/${id}`).loginAs(accountant)
    const identity = json(masked).data.identities[0]
    assert.equal(identity.number, 'GHA-•••••••89-0')
    assert.isTrue(identity.numberMasked)
    assert.isNull(identity.frontFileId)
    assert.isTrue(identity.hasFront)

    // Verify the ID -> id_verified; add and verify a licence -> verified
    const cardId = json(card).data.id
    const verified = await client
      .post(`/api/v1/admin/customers/${id}/identities/${cardId}/verify`)
      .loginAs(owner)
    verified.assertStatus(200)
    let customer = await Customer.findOrFail(id)
    assert.equal(customer.verificationStatus, 'id_verified')

    const licence = await add({
      type: 'drivers_licence',
      number: 'DL-777',
      expiresOn: '2031-01-01',
      licenceClass: 'b',
    })
    await client
      .post(`/api/v1/admin/customers/${id}/identities/${json(licence).data.id}/verify`)
      .loginAs(owner)
    customer = await Customer.findOrFail(id)
    assert.equal(customer.verificationStatus, 'verified')

    // Editing a verified document sends it back for checking
    const edited = await client
      .put(`/api/v1/admin/customers/${id}/identities/${json(licence).data.id}`)
      .json({ type: 'drivers_licence', number: 'DL-778', expiresOn: '2031-01-01' })
      .loginAs(owner)
    assert.equal(json(edited).data.status, 'pending')
    customer = await Customer.findOrFail(id)
    assert.equal(customer.verificationStatus, 'id_verified')

    // Expired documents can't be verified; rejection keeps the reason
    const old = await add({ type: 'passport', number: 'G0001', expiresOn: '2020-01-01' })
    const expired = await client
      .post(`/api/v1/admin/customers/${id}/identities/${json(old).data.id}/verify`)
      .loginAs(owner)
    expired.assertStatus(422)
    const rejected = await client
      .post(`/api/v1/admin/customers/${id}/identities/${json(old).data.id}/reject`)
      .json({ reason: 'Photo unreadable' })
      .loginAs(owner)
    assert.include(json(rejected).data, { status: 'rejected', rejectionReason: 'Photo unreadable' })
  })

  test('document images must be private files', async ({ client }) => {
    const { owner } = await setup()
    const created = await client.post('/api/v1/admin/customers').json(ama).loginAs(owner)
    const publicFile = await privateFile('car_photo')
    const response = await client
      .post(`/api/v1/admin/customers/${json(created).data.id}/identities`)
      .json({ type: 'ghana_card', number: 'GHA-123456789-0', frontFileId: publicFile.id })
      .loginAs(owner)
    response.assertStatus(422)
  })

  test("ID scans: no moving another document's file, 5-minute links, orphans cleaned up", async ({
    client,
    assert,
  }) => {
    const { owner } = await setup()
    // Deleting files would otherwise call Cloudinary
    FileService.setMockUploader(async () => ({}) as any)
    try {
      const created = await client.post('/api/v1/admin/customers').json(ama).loginAs(owner)
      const url = `/api/v1/admin/customers/${json(created).data.id}/identities`
      const front = await privateFile('id_front')
      const doc = await client
        .post(url)
        .json({ type: 'ghana_card', number: 'GHA-123456789-0', frontFileId: front.id })
        .loginAs(owner)
      doc.assertStatus(201)

      // Another document can't take this one's image...
      const stolen = await client
        .post(url)
        .json({
          type: 'passport',
          number: 'G1234567',
          expiresOn: '2031-01-01',
          frontFileId: front.id,
        })
        .loginAs(owner)
      stolen.assertStatus(422)
      // ...but saving the same document again with its own image is fine
      const resaved = await client
        .put(`${url}/${json(doc).data.id}`)
        .json({ type: 'ghana_card', number: 'GHA-123456789-0', frontFileId: front.id })
        .loginAs(owner)
      resaved.assertStatus(200)

      // Replacing the image deletes the old scan
      const replacement = await privateFile('id_front')
      await client
        .put(`${url}/${json(doc).data.id}`)
        .json({ type: 'ghana_card', number: 'GHA-123456789-0', frontFileId: replacement.id })
        .loginAs(owner)
      assert.isNull(await File.find(front.id))

      // Links to ID scans live 5 minutes, even when asked for longer
      const link = await client
        .get(`/api/v1/admin/files/${replacement.id}/url`)
        .qs({ expiresInSeconds: 86400 })
        .loginAs(owner)
      assert.equal(json(link).data.expiresInSeconds, 300)

      // Cleanup: only private uploads never attached, older than 24h
      const fresh = await privateFile('id_back')
      const old = await privateFile('id_back')
      old.createdAt = DateTime.now().minus({ hours: 25 })
      await old.save()
      const oldPhoto = await privateFile('car_photo')
      oldPhoto.createdAt = DateTime.now().minus({ hours: 25 })
      await oldPhoto.save()
      assert.equal(await FileService.deleteUnattached({ olderThanHours: 24 }), 1)
      assert.isNull(await File.find(old.id))
      assert.isNotNull(await File.find(fresh.id))
      assert.isNotNull(await File.find(oldPhoto.id))
      assert.isNotNull(await File.find(replacement.id))
    } finally {
      FileService.setMockUploader(null)
    }
  })

  test('duplicate check: same phone, same name and birth date, same document', async ({
    client,
    assert,
  }) => {
    const { owner } = await setup()
    const created = await client.post('/api/v1/admin/customers').json(ama).loginAs(owner)
    await client
      .post(`/api/v1/admin/customers/${json(created).data.id}/identities`)
      .json({ type: 'ghana_card', number: 'GHA-123456789-0' })
      .loginAs(owner)

    const check = await client
      .get(
        '/api/v1/admin/customers/duplicates?phone=0241234567&fullName=AMA%20OWUSU&dateOfBirth=1990-05-14&documentNumber=GHA1234567890'
      )
      .loginAs(owner)
    check.assertStatus(200)
    assert.deepEqual(json(check).data.customers[0].reasons, [
      'Same phone number',
      'Same name and date of birth',
      'Same document number',
    ])
  })

  test('permissions: drivers see nothing; accountants only look', async ({ client }) => {
    const { driver, accountant } = await setup()
    const driverList = await client.get('/api/v1/admin/customers').loginAs(driver)
    driverList.assertStatus(403)
    const accountantList = await client.get('/api/v1/admin/customers').loginAs(accountant)
    accountantList.assertStatus(200)
    const accountantCreate = await client
      .post('/api/v1/admin/customers')
      .json(ama)
      .loginAs(accountant)
    accountantCreate.assertStatus(403)
  })
})

test.group('blacklist', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('linking a customer catches a new profile with the same ID', async ({ client, assert }) => {
    const { owner } = await setup()
    const first = await client.post('/api/v1/admin/customers').json(ama).loginAs(owner)
    const firstId = json(first).data.id
    await client
      .post(`/api/v1/admin/customers/${firstId}/identities`)
      .json({ type: 'ghana_card', number: 'GHA-123456789-0' })
      .loginAs(owner)

    const added = await client
      .post('/api/v1/admin/blacklist')
      .json({ customerId: firstId, reason: 'damage', severity: 'block', details: 'Unpaid repairs' })
      .loginAs(owner)
    added.assertStatus(201)
    assert.equal(json(added).data.ghanaCardNo, 'GHA-123456789-0') // copied from the customer
    assert.equal(await severityOf(firstId), 'block')

    // Same person, new phone and profile: caught once the Ghana Card is added
    const second = await client
      .post('/api/v1/admin/customers')
      .json({ fullName: 'A. Owusu', phone: '0559998888' })
      .loginAs(owner)
    const secondId = json(second).data.id
    assert.isNull(json(second).data.blacklistSeverity)
    await client
      .post(`/api/v1/admin/customers/${secondId}/identities`)
      .json({ type: 'ghana_card', number: 'GHA 123456789 0' })
      .loginAs(owner)
    assert.equal(await severityOf(secondId), 'block')

    // Lifting clears both
    const lifted = await client
      .post(`/api/v1/admin/blacklist/${json(added).data.id}/lift`)
      .json({ reason: 'Paid in full' })
      .loginAs(owner)
    lifted.assertStatus(200)
    assert.isNull(await severityOf(firstId))
    assert.isNull(await severityOf(secondId))
  })

  test('check by phone; warn vs block; an entry needs something to match on', async ({
    client,
    assert,
  }) => {
    const { owner, desk } = await setup()
    await client
      .post('/api/v1/admin/blacklist')
      .json({ phone: '0241234567', reason: 'late_returns', severity: 'warn' })
      .loginAs(owner)

    const check = await client
      .get('/api/v1/admin/blacklist/check?phone=%2B233241234567')
      .loginAs(desk)
    assert.equal(json(check).data.severity, 'warn')

    const created = await client.post('/api/v1/admin/customers').json(ama).loginAs(owner)
    assert.equal(json(created).data.blacklistSeverity, 'warn')

    const nothing = await client
      .post('/api/v1/admin/blacklist')
      .json({ reason: 'other', severity: 'block' })
      .loginAs(owner)
    nothing.assertStatus(422)

    // Front desk can check but not add (customers.blacklist)
    const deskAdd = await client
      .post('/api/v1/admin/blacklist')
      .json({ phone: '0200000000', reason: 'other', severity: 'warn' })
      .loginAs(desk)
    deskAdd.assertStatus(403)
  })
})
