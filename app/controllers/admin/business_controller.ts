import type { HttpContext } from '@adonisjs/core/http'
import Business from '#models/business'
import BusinessTransformer from '#transformers/business_transformer'
import { updateBusinessValidator } from '#validators/business'
import AuditService from '#services/audit_service'
import FileService from '#services/file_service'
import type File from '#models/file'
import { forget } from '#services/memo'

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
  'momoNumber',
  'momoName',
  'momoNetwork',
  'bankName',
  'bankAccountName',
  'bankAccountNumber',
  'bankBranch',
  'instagramUrl',
  'partners',
  'facebookUrl',
  'tiktokUrl',
  'xUrl',
] as const

/**
 * The business's two images. Logos print on documents: PDFs can embed these
 * (converted to PNG on the way). The cover is the website home page photo.
 */
const IMAGES = {
  logo: { column: 'logoFileId', purpose: 'business_logo', size: '2mb', label: 'Logo' },
  cover: { column: 'coverFileId', purpose: 'website_cover', size: '8mb', label: 'Cover photo' },
} as const
type ImageSlot = keyof typeof IMAGES
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp']

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
    forget('business')
    await AuditService.record(ctx, {
      action: 'business.updated',
      subject: { type: 'business', id: business.id, label: business.name },
      before,
      after: AuditService.pick(business, [...AUDITED_FIELDS]),
    })

    const transformed = await serialize(BusinessTransformer.transform(business))
    return response.ok({ message: 'Business updated successfully', data: transformed.data })
  }

  async updateLogo(ctx: HttpContext) {
    return this.replaceImage(ctx, 'logo')
  }

  async removeLogo(ctx: HttpContext) {
    return this.removeImage(ctx, 'logo')
  }

  async updateCover(ctx: HttpContext) {
    return this.replaceImage(ctx, 'cover')
  }

  async removeCover(ctx: HttpContext) {
    return this.removeImage(ctx, 'cover')
  }

  /** Upload a new image; the old one is deleted once the new one is in place. */
  private async replaceImage(ctx: HttpContext, slot: ImageSlot) {
    const { auth, request, response, serialize } = ctx
    const image = IMAGES[slot]
    const upload = request.file('file', { size: image.size, extnames: IMAGE_EXTENSIONS })
    if (!upload) {
      return response.badRequest({
        message: 'No file provided. Send as multipart/form-data with field name "file".',
      })
    }
    if (!upload.isValid) {
      return response.unprocessableEntity({
        message: `Use a PNG, JPG or WebP image up to ${image.size.toUpperCase()}.`,
        errors: upload.errors,
      })
    }

    const business = await Business.currentWithLogo()
    const previous: File | null = business[slot] ?? null
    const file = await FileService.upload(upload, {
      purpose: image.purpose,
      uploadedBy: auth.getUserOrFail().id,
      attachableType: 'business',
      attachableId: business.id,
    })
    business[image.column] = file.id
    await business.save()
    forget('business')
    if (previous) await FileService.delete(previous)

    await AuditService.record(ctx, {
      action: `business.${slot}_updated`,
      subject: { type: 'business', id: business.id, label: business.name },
      before: { [image.column]: previous?.id ?? null },
      after: { [image.column]: file.id, originalName: file.originalName },
    })

    await business.load(slot)
    const transformed = await serialize(BusinessTransformer.transform(business))
    return response.ok({ message: `${image.label} updated`, data: transformed.data })
  }

  private async removeImage(ctx: HttpContext, slot: ImageSlot) {
    const { response, serialize } = ctx
    const image = IMAGES[slot]
    const business = await Business.currentWithLogo()
    const previous = business[slot]
    if (previous) {
      business[image.column] = null
      await business.save()
      forget('business')
      await FileService.delete(previous)
      await AuditService.record(ctx, {
        action: `business.${slot}_removed`,
        subject: { type: 'business', id: business.id, label: business.name },
        before: { [image.column]: previous.id },
        after: { [image.column]: null },
      })
    }
    await business.load(slot)
    const transformed = await serialize(BusinessTransformer.transform(business))
    return response.ok({ message: `${image.label} removed`, data: transformed.data })
  }
}
