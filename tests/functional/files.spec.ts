import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Role from '#models/role'
import Permission from '#models/permission'
import User from '#models/user'
import File from '#models/file'
import FileService, { ImageImportError } from '#services/file_service'
import AuditLog from '#models/audit_log'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'

const json = (response: { body(): unknown }) => response.body() as Record<string, any>

async function setup() {
  const ownerRole = await Role.create({ name: 'Owner', slug: 'owner', isSuperAdmin: true })

  const viewDocsPerm = await Permission.create({
    name: 'View documents',
    slug: 'customers.view_documents',
    group: 'customers',
  })
  const fleetViewPerm = await Permission.create({
    name: 'View fleet',
    slug: 'fleet.view',
    group: 'fleet',
  })

  const fleetRole = await Role.create({ name: 'Fleet Officer', slug: 'fleet' })
  await fleetRole.related('permissions').attach([fleetViewPerm.id])

  const staffRole = await Role.create({ name: 'Front Desk', slug: 'front-desk' })

  const owner = await User.create({
    email: 'owner@wynk.test',
    password: 'OwnerPass123',
    roleId: ownerRole.id,
  })

  const fleetUser = await User.create({
    email: 'fleet@wynk.test',
    password: 'FleetPass123',
    roleId: fleetRole.id,
  })

  const regularStaff = await User.create({
    email: 'staff@wynk.test',
    password: 'StaffPass123',
    roleId: staffRole.id,
  })

  return { owner, fleetUser, regularStaff, viewDocsPerm }
}

const MINIMAL_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  'base64'
)

const MINIMAL_PDF = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 3 3]>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000010 00000 n\n0000000053 00000 n\n0000000102 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n149\n%%EOF'
)

test.group('files / upload and signed URLs', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  group.setup(() => {
    FileService.setMockUploader(async (file, options) => ({
      url: `https://res.cloudinary.com/test/${options.purpose}/${file.clientName}`,
      publicId: `wynk/${options.purpose}/mock_${file.clientName}`,
      width: 1200,
      height: 800,
      format: 'jpg',
      bytes: file.size,
      resourceType: file.type === 'image' ? 'image' : 'raw',
    }))
  })

  group.teardown(() => {
    FileService.setMockUploader(null)
  })

  test('staff can upload a car photo and it is audited', async ({ client, assert }) => {
    const { owner } = await setup()
    const tempFilePath = path.join(os.tmpdir(), 'test_car.jpg')
    fs.writeFileSync(tempFilePath, MINIMAL_JPEG)

    const response = await client
      .post('/api/v1/admin/files/upload')
      .file('file', tempFilePath, { filename: 'test_car.jpg', contentType: 'image/jpeg' })
      .fields({ purpose: 'car_photo' })
      .loginAs(owner)

    response.assertStatus(201)
    const body = json(response)
    assert.equal(body.message, 'File uploaded successfully')
    assert.equal(body.data.purpose, 'car_photo')
    assert.isFalse(body.data.isPrivate)
    assert.isString(body.data.url)
    assert.include(body.data.url, 'test_car.jpg')

    const file = await File.findOrFail(body.data.id)
    assert.equal(file.originalName, 'test_car.jpg')
    assert.equal(file.uploadedBy, owner.id)

    const audit = await AuditLog.findByOrFail('subject_id', file.id)
    assert.equal(audit.action, 'file.uploaded')

    fs.unlinkSync(tempFilePath)
  })

  test('uploading a vehicle document marks it private and generates a signed URL', async ({
    client,
    assert,
  }) => {
    const { fleetUser } = await setup()
    const tempFilePath = path.join(os.tmpdir(), 'insurance.pdf')
    fs.writeFileSync(tempFilePath, MINIMAL_PDF)

    const response = await client
      .post('/api/v1/admin/files/upload')
      .file('file', tempFilePath, { filename: 'insurance.pdf', contentType: 'application/pdf' })
      .fields({ purpose: 'vehicle_document' })
      .loginAs(fleetUser)

    response.assertStatus(201)
    const body = json(response)
    assert.isTrue(body.data.isPrivate)

    const urlResponse = await client
      .get(`/api/v1/admin/files/${body.data.id}/url`)
      .loginAs(fleetUser)

    urlResponse.assertStatus(200)
    const urlBody = json(urlResponse)
    assert.isTrue(urlBody.data.isPrivate)
    assert.isString(urlBody.data.url)
    assert.include(urlBody.data.url, '/s--')
    assert.include(urlBody.data.url, 'authenticated')

    fs.unlinkSync(tempFilePath)
  })

  test('private ID documents require customers.view_documents permission to get signed URL', async ({
    client,
    assert,
  }) => {
    const { owner, regularStaff, viewDocsPerm } = await setup()
    const tempFilePath = path.join(os.tmpdir(), 'ghana_card.jpg')
    fs.writeFileSync(tempFilePath, MINIMAL_JPEG)

    // Owner uploads customer ID
    const upload = await client
      .post('/api/v1/admin/files/upload')
      .file('file', tempFilePath, { filename: 'ghana_card.jpg', contentType: 'image/jpeg' })
      .fields({ purpose: 'id_front' as any })
      .loginAs(owner)

    upload.assertStatus(201)
    const fileId = json(upload).data.id

    // Regular staff without customers.view_documents is forbidden
    const forbidden = await client.get(`/api/v1/admin/files/${fileId}/url`).loginAs(regularStaff)
    forbidden.assertStatus(403)

    // Grant permission to staff
    await regularStaff.load('role')
    await regularStaff.role.related('permissions').attach([viewDocsPerm.id])

    // Now allowed and audited
    const allowed = await client.get(`/api/v1/admin/files/${fileId}/url`).loginAs(regularStaff)
    allowed.assertStatus(200)
    assert.isTrue(json(allowed).data.isPrivate)

    const audit = await AuditLog.findByOrFail('action', 'file.viewed_signed_url')
    assert.equal(audit.subjectId, fileId)

    fs.unlinkSync(tempFilePath)
  })

  test('rejects file upload when extension is not allowed for the purpose', async ({ client }) => {
    const { owner } = await setup()
    const tempFilePath = path.join(os.tmpdir(), 'script.sh')
    fs.writeFileSync(tempFilePath, Buffer.from('echo hello'))

    const response = await client
      .post('/api/v1/admin/files/upload')
      .file('file', tempFilePath, { filename: 'script.sh', contentType: 'text/plain' })
      .fields({ purpose: 'car_photo' })
      .loginAs(owner)

    response.assertStatus(422)

    fs.unlinkSync(tempFilePath)
  })

  test('deleting a file removes it and writes an audit log', async ({ client, assert }) => {
    const { owner } = await setup()
    const tempFilePath = path.join(os.tmpdir(), 'delete_me.jpg')
    fs.writeFileSync(tempFilePath, MINIMAL_JPEG)

    const upload = await client
      .post('/api/v1/admin/files/upload')
      .file('file', tempFilePath, { filename: 'delete_me.jpg', contentType: 'image/jpeg' })
      .fields({ purpose: 'car_photo' })
      .loginAs(owner)

    upload.assertStatus(201)
    const fileId = json(upload).data.id

    const delResponse = await client.delete(`/api/v1/admin/files/${fileId}`).loginAs(owner)
    delResponse.assertStatus(200)

    const found = await File.find(fileId)
    assert.isNull(found)

    const audit = await AuditLog.findByOrFail('action', 'file.deleted')
    assert.equal(audit.subjectId, fileId)

    fs.unlinkSync(tempFilePath)
  })
})

test.group('files / import from a link', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  group.setup(() => {
    FileService.setMockUrlImporter(async (url, options) => {
      if (url.includes('not-an-image')) {
        throw new ImageImportError(
          'That link is not a supported image. Use a JPG, PNG or WebP image.'
        )
      }
      return {
        url: `https://res.cloudinary.com/test/${options.purpose}/imported.jpg`,
        publicId: `wynk/${options.purpose}/imported`,
        width: 1600,
        height: 900,
        format: 'jpg',
        bytes: 120_000,
        resourceType: 'image',
      }
    })
  })

  group.teardown(() => {
    FileService.setMockUrlImporter(null)
  })

  test('imports an image link into our storage and audits it', async ({ client, assert }) => {
    const { owner } = await setup()
    const sourceUrl = 'https://images.example.com/fleet/land%20cruiser.jpg?w=2000'

    const response = await client
      .post('/api/v1/admin/files/import')
      .json({ url: sourceUrl, purpose: 'car_photo' })
      .loginAs(owner)

    response.assertStatus(201)
    const body = json(response)
    assert.equal(body.message, 'Image imported successfully')
    // Served from our storage, not hotlinked from the source
    assert.include(body.data.url, 'res.cloudinary.com')
    assert.equal(body.data.originalName, 'land cruiser.jpg')
    assert.equal(body.data.mime, 'image/jpeg')
    assert.isFalse(body.data.isPrivate)
    assert.equal(body.data.metadata.sourceUrl, sourceUrl)

    const audit = await AuditLog.findByOrFail('action', 'file.imported')
    assert.equal(audit.subjectId, body.data.id)
  })

  test('an imported image can be attached as a car photo', async ({ client, assert }) => {
    const { owner } = await setup()
    const imported = await client
      .post('/api/v1/admin/files/import')
      .json({ url: 'https://images.example.com/car.png', purpose: 'car_photo' })
      .loginAs(owner)
    imported.assertStatus(201)

    const file = await File.findOrFail(json(imported).data.id)
    assert.equal(file.purpose, 'car_photo')
    assert.isNull(file.attachableId)
  })

  test('rejects links that are not http(s) and private purposes', async ({ client }) => {
    const { owner } = await setup()

    for (const url of ['ftp://example.com/car.jpg', 'file:///etc/passwd', 'not a link']) {
      const response = await client
        .post('/api/v1/admin/files/import')
        .json({ url, purpose: 'car_photo' })
        .loginAs(owner)
      response.assertStatus(422)
    }

    // ID scans and documents must be uploaded from the device, never pulled from a link
    const privatePurpose = await client
      .post('/api/v1/admin/files/import')
      .json({ url: 'https://images.example.com/card.jpg', purpose: 'id_front' as any })
      .loginAs(owner)
    privatePurpose.assertStatus(422)
  })

  test('explains when the link is not an image and stores nothing', async ({ client, assert }) => {
    const { owner } = await setup()

    const response = await client
      .post('/api/v1/admin/files/import')
      .json({ url: 'https://example.com/not-an-image.html', purpose: 'car_photo' })
      .loginAs(owner)

    response.assertStatus(422)
    assert.include(json(response).message, 'not a supported image')
    const files = await File.all()
    assert.lengthOf(files, 0)
  })
})
