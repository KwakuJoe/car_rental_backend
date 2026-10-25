import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import Car from '#models/car'
import VehicleDocument from '#models/vehicle_document'
import VehicleDocumentTransformer from '#transformers/vehicle_document_transformer'
import DocumentComplianceService from '#services/document_compliance_service'
import FileService from '#services/file_service'
import AuditService from '#services/audit_service'
import {
  createVehicleDocumentValidator,
  listExpiringDocumentsValidator,
  updateVehicleDocumentValidator,
} from '#validators/vehicle_document'

export default class VehicleDocumentsController {
  async index({ params, response }: HttpContext) {
    await Car.findOrFail(params.carId)

    const documents = await VehicleDocument.query()
      .where('car_id', params.carId)
      .preload('file')
      .preload('creator')
      .orderBy('created_at', 'desc')

    for (const doc of documents) {
      if (doc.file) {
        doc.$extras.signedUrl = FileService.getUrl(doc.file)
      }
    }

    const compliance = DocumentComplianceService.computeCarCompliance(documents)

    return response.ok({
      message: 'Vehicle documents fetched successfully',
      data: documents.map((d) => new VehicleDocumentTransformer(d).toObject()),
      compliance,
    })
  }

  async store(ctx: HttpContext) {
    const { params, auth, request, response } = ctx
    const user = auth.getUserOrFail()
    const car = await Car.findOrFail(params.carId)
    const payload = await request.validateUsing(createVehicleDocumentValidator)

    const document = await db.transaction(async (trx) => {
      const doc = await VehicleDocument.create(
        {
          // Optional fields default to null: undefined would leave e.g. fileId
          // unset on the model and break loading the file relation below.
          carId: car.id,
          type: payload.type,
          documentNumber: payload.documentNumber ?? null,
          provider: payload.provider ?? null,
          coverType: payload.coverType ?? null,
          issuedOn: (payload.issuedOn ?? null) as any,
          expiresOn: (payload.expiresOn ?? null) as any,
          fileId: payload.fileId ?? null,
          notes: payload.notes ?? null,
          createdBy: user.id,
        },
        { client: trx }
      )

      if (payload.fileId) {
        await FileService.attach(payload.fileId, 'vehicle_document', doc.id, trx)
      }

      await AuditService.record(
        ctx,
        {
          action: 'car.document_added',
          subject: {
            type: 'car',
            id: car.id,
            label: `${car.make} ${car.model} (${car.registrationNo})`,
          },
          metadata: {
            documentId: doc.id,
            type: doc.type,
            documentNumber: doc.documentNumber,
            expiresOn: payload.expiresOn,
          },
        },
        trx
      )

      return doc
    })

    await document.load('file')
    await document.load('creator')

    if (document.file) {
      document.$extras.signedUrl = FileService.getUrl(document.file)
    }

    return response.created({
      message: 'Vehicle document recorded successfully',
      data: new VehicleDocumentTransformer(document).toObject(),
    })
  }

  async show({ params, response }: HttpContext) {
    const doc = await VehicleDocument.query()
      .where('id', params.id)
      .where('car_id', params.carId)
      .preload('file')
      .preload('creator')
      .firstOrFail()

    if (doc.file) {
      doc.$extras.signedUrl = FileService.getUrl(doc.file)
    }

    return response.ok({
      message: 'Vehicle document fetched successfully',
      data: new VehicleDocumentTransformer(doc).toObject(),
    })
  }

  async update(ctx: HttpContext) {
    const { params, request, response } = ctx
    const doc = await VehicleDocument.query()
      .where('id', params.id)
      .where('car_id', params.carId)
      .preload('file')
      .firstOrFail()

    const car = await Car.findOrFail(params.carId)
    const payload = await request.validateUsing(updateVehicleDocumentValidator)

    await db.transaction(async (trx) => {
      doc.useTransaction(trx)

      if (payload.type !== undefined) doc.type = payload.type
      if (payload.documentNumber !== undefined) doc.documentNumber = payload.documentNumber
      if (payload.provider !== undefined) doc.provider = payload.provider
      if (payload.coverType !== undefined) doc.coverType = payload.coverType
      if (payload.issuedOn !== undefined) doc.issuedOn = payload.issuedOn as any
      if (payload.expiresOn !== undefined) doc.expiresOn = payload.expiresOn as any
      if (payload.notes !== undefined) doc.notes = payload.notes

      if (payload.fileId !== undefined && payload.fileId !== doc.fileId) {
        doc.fileId = payload.fileId
        if (payload.fileId) {
          await FileService.attach(payload.fileId, 'vehicle_document', doc.id, trx)
        }
      }

      await doc.save()

      await AuditService.record(
        ctx,
        {
          action: 'car.document_updated',
          subject: {
            type: 'car',
            id: car.id,
            label: `${car.make} ${car.model} (${car.registrationNo})`,
          },
          metadata: {
            documentId: doc.id,
            type: doc.type,
            expiresOn: payload.expiresOn,
          },
        },
        trx
      )
    })

    await doc.load('file')
    await doc.load('creator')

    if (doc.file) {
      doc.$extras.signedUrl = FileService.getUrl(doc.file)
    }

    return response.ok({
      message: 'Vehicle document updated successfully',
      data: new VehicleDocumentTransformer(doc).toObject(),
    })
  }

  async destroy(ctx: HttpContext) {
    const { params, response } = ctx
    const doc = await VehicleDocument.query()
      .where('id', params.id)
      .where('car_id', params.carId)
      .preload('file')
      .firstOrFail()

    const car = await Car.findOrFail(params.carId)

    await db.transaction(async (trx) => {
      if (doc.file) {
        await FileService.delete(doc.file, trx)
      }

      doc.useTransaction(trx)
      await doc.delete()

      await AuditService.record(
        ctx,
        {
          action: 'car.document_deleted',
          subject: {
            type: 'car',
            id: car.id,
            label: `${car.make} ${car.model} (${car.registrationNo})`,
          },
          metadata: {
            documentId: doc.id,
            type: doc.type,
          },
        },
        trx
      )
    })

    return response.ok({
      message: 'Vehicle document deleted successfully',
    })
  }

  async expiring({ request, response }: HttpContext) {
    const payload = await request.validateUsing(listExpiringDocumentsValidator)
    const documents = await DocumentComplianceService.getExpiringDocuments(payload.days ?? 30)

    for (const doc of documents) {
      if (doc.file) {
        doc.$extras.signedUrl = FileService.getUrl(doc.file)
      }
    }

    return response.ok({
      message: 'Expiring vehicle documents fetched successfully',
      data: documents.map((d) => new VehicleDocumentTransformer(d).toObject()),
    })
  }
}
