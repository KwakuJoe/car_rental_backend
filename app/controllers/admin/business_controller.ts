import type { HttpContext } from '@adonisjs/core/http'
import Business from '#models/business'
import BusinessTransformer from '#transformers/business_transformer'
import { updateBusinessValidator } from '#validators/business'
import AuditService from '#services/audit_service'
import FileService from '#services/file_service'
import type File from '#models/file'

const AUDITED_FIELDS = [
  'name',
  'tradingName',
  'email',
  'phone',
  'whatsappPhone',
  'address',
  'digitalAddress',
  'city',
  'region',
  'tin',
  'vatRegistered',
  'vatNumber',
  'documentPrefix',
] as const

/** Logos print on documents: PDFs can embed these (converted to PNG on the way). */
const LOGO_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp']

export default class BusinessController {
  async show({ response, serialize }: HttpContext) {
    const business = await Business.currentWithLogo()
    const transformed = await serialize(BusinessTransformer.transform(business))
    return response.ok({ message: 'Business fetched successfully', data: transformed.data })
  }

  async update(ctx: HttpContext) {
    const { request, response, serialize } = ctx
    const data = await request.validateUsing(updateBusinessValidator)
    const business = await Business.currentWithLogo()

    const before = AuditService.pick(business, [...AUDITED_FIELDS])
    business.merge(data)
    if (business.vatRegistered === false) {
      business.vatNumber = null
    }
    await business.save()
    await AuditService.record(ctx, {
      action: 'business.updated',
      subject: { type: 'business', id: business.id, label: business.name },
      before,
      after: AuditService.pick(business, [...AUDITED_FIELDS]),
    })

    const transformed = await serialize(BusinessTransformer.transform(business))
    return response.ok({ message: 'Business updated successfully', data: transformed.data })
  }

  /** Upload a new logo; the old one is deleted once the new one is in place. */
  async updateLogo(ctx: HttpContext) {
    const { auth, request, response, serialize } = ctx
    const upload = request.file('file', { size: '2mb', extnames: LOGO_EXTENSIONS })
    if (!upload) {
      return response.badRequest({
        message: 'No file provided. Send as multipart/form-data with field name "file".',
      })
    }
    if (!upload.isValid) {
      return response.unprocessableEntity({
        message: 'Use a PNG, JPG or WebP image up to 2 MB.',
        errors: upload.errors,
      })
    }

    const business = await Business.currentWithLogo()
    const previous: File | null = business.logo ?? null
    const file = await FileService.upload(upload, {
      purpose: 'business_logo',
      uploadedBy: auth.getUserOrFail().id,
      attachableType: 'business',
      attachableId: business.id,
    })
    business.logoFileId = file.id
    await business.save()
    if (previous) await FileService.delete(previous)

    await AuditService.record(ctx, {
      action: 'business.logo_updated',
      subject: { type: 'business', id: business.id, label: business.name },
      before: { logoFileId: previous?.id ?? null },
      after: { logoFileId: file.id, originalName: file.originalName },
    })

    await business.load('logo')
    const transformed = await serialize(BusinessTransformer.transform(business))
    return response.ok({ message: 'Logo updated', data: transformed.data })
  }

  async removeLogo(ctx: HttpContext) {
    const { response, serialize } = ctx
    const business = await Business.currentWithLogo()
    const previous = business.logo
    if (previous) {
      business.logoFileId = null
      await business.save()
      await FileService.delete(previous)
      await AuditService.record(ctx, {
        action: 'business.logo_removed',
        subject: { type: 'business', id: business.id, label: business.name },
        before: { logoFileId: previous.id },
        after: { logoFileId: null },
      })
    }
    await business.load('logo')
    const transformed = await serialize(BusinessTransformer.transform(business))
    return response.ok({ message: 'Logo removed', data: transformed.data })
  }
}
