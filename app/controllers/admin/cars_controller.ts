import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import Car from '#models/car'
import CarPhoto from '#models/car_photo'
import OdometerLog from '#models/odometer_log'
import CarFilter from '#filters/car_filter'
import CarTransformer from '#transformers/car_transformer'
import OdometerLogTransformer from '#transformers/odometer_log_transformer'
import AuditService from '#services/audit_service'
import FileService from '#services/file_service'
import {
  carFilterValidator,
  createCarValidator,
  updateCarValidator,
  updateCarStatusValidator,
  updateOdometerValidator,
  attachCarPhotoValidator,
  reorderPhotosValidator,
} from '#validators/car'

export default class CarsController {
  async index({ request, response, serialize }: HttpContext) {
    const payload = await request.validateUsing(carFilterValidator)
    const query = Car.query()
      .preload('category')
      .preload('branch')
      .preload('photos', (pq) => pq.preload('file').orderBy('sort_order', 'asc'))
      .preload('documents')

    const cars = await new CarFilter(query, { ...payload })
      .apply()
      .paginate(payload.page ?? 1, payload.limit ?? 20)

    const transformed = await serialize(CarTransformer.paginate(cars.all(), cars.getMeta()))

    return response.ok({
      message: 'Cars fetched successfully',
      data: transformed.data,
      meta: transformed.metadata,
    })
  }

  async store(ctx: HttpContext) {
    const { auth, request, response } = ctx
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(createCarValidator)

    const car = await db.transaction(async (trx) => {
      const newCar = await Car.create(
        {
          transmission: 'auto',
          fuelType: 'petrol',
          seats: 5,
          doors: 4,
          luggage: 2,
          ownership: 'company',
          isListedOnline: true,
          status: 'active',
          currentOdometerKm: 0,
          features: [],
          ...payload,
        } as any,
        { client: trx }
      )

      if (newCar.currentOdometerKm > 0) {
        await OdometerLog.create(
          {
            carId: newCar.id,
            previousKm: 0,
            newKm: newCar.currentOdometerKm,
            source: 'manual_entry',
            reason: 'Initial reading on vehicle creation',
            recordedBy: user.id,
          },
          { client: trx }
        )
      }

      await AuditService.record(
        ctx,
        {
          action: 'car.created',
          subject: {
            type: 'car',
            id: newCar.id,
            label: `${newCar.make} ${newCar.model} (${newCar.registrationNo})`,
          },
          after: newCar.toJSON(),
        },
        trx
      )

      await newCar.load('category')
      await newCar.load('branch')
      await newCar.load('photos', (pq) => pq.preload('file').orderBy('sort_order', 'asc'))

      return newCar
    })

    return response.created({
      message: 'Car created successfully',
      data: new CarTransformer(car).toObject(),
    })
  }

  async show({ params, response }: HttpContext) {
    const car = await Car.query()
      .where('id', params.id)
      .preload('category')
      .preload('branch')
      .preload('photos', (pq) => pq.preload('file').orderBy('sort_order', 'asc'))
      .preload('documents')
      .firstOrFail()

    return response.ok({
      message: 'Car fetched successfully',
      data: new CarTransformer(car).toObject(),
    })
  }

  async update(ctx: HttpContext) {
    const { params, request, response } = ctx
    const car = await Car.findOrFail(params.id)
    const payload = await request.validateUsing(updateCarValidator(car.id))

    await db.transaction(async (trx) => {
      car.useTransaction(trx)
      const before = car.toJSON()
      car.merge(payload as any)
      await car.save()

      await AuditService.record(
        ctx,
        {
          action: 'car.updated',
          subject: {
            type: 'car',
            id: car.id,
            label: `${car.make} ${car.model} (${car.registrationNo})`,
          },
          before,
          after: car.toJSON(),
        },
        trx
      )
    })

    await car.load('category')
    await car.load('branch')
    await car.load('photos', (pq) => pq.preload('file').orderBy('sort_order', 'asc'))

    return response.ok({
      message: 'Car updated successfully',
      data: new CarTransformer(car).toObject(),
    })
  }

  async updateStatus(ctx: HttpContext) {
    const { params, request, response } = ctx
    const car = await Car.findOrFail(params.id)
    const payload = await request.validateUsing(updateCarStatusValidator)

    const previousStatus = car.status

    await db.transaction(async (trx) => {
      car.useTransaction(trx)
      car.status = payload.status
      await car.save()

      await AuditService.record(
        ctx,
        {
          action: 'car.status_changed',
          subject: {
            type: 'car',
            id: car.id,
            label: `${car.make} ${car.model} (${car.registrationNo})`,
          },
          before: { status: previousStatus },
          after: { status: payload.status },
          metadata: { reason: payload.reason },
        },
        trx
      )
    })

    await car.load('category')
    await car.load('branch')
    await car.load('photos', (pq) => pq.preload('file').orderBy('sort_order', 'asc'))

    return response.ok({
      message: 'Car status updated successfully',
      data: new CarTransformer(car).toObject(),
    })
  }

  async updateOdometer(ctx: HttpContext) {
    const { auth, params, request, response } = ctx
    const user = auth.getUserOrFail()
    const car = await Car.findOrFail(params.id)
    const payload = await request.validateUsing(updateOdometerValidator)

    const previousKm = car.currentOdometerKm
    const newKm = payload.odometerKm

    // Odometer cannot decrease unless corrected with fleet.manage permission and reason
    if (newKm < previousKm) {
      await user.load((preloader) =>
        preloader.load('role', (roleQuery) => roleQuery.preload('permissions'))
      )
      const isSuperAdmin = user.role?.isSuperAdmin
      const hasFleetManage = user.role?.permissions.some((p) => p.slug === 'fleet.manage')

      if (!isSuperAdmin && !hasFleetManage) {
        return response.forbidden({
          message: 'Only fleet managers can correct an odometer reading to a lower value.',
        })
      }

      if (!payload.reason || payload.reason.trim().length === 0) {
        return response.unprocessableEntity({
          message: 'A reason is mandatory when correcting an odometer reading downwards.',
        })
      }
    }

    const source = newKm < previousKm ? 'correction' : 'manual_entry'

    await db.transaction(async (trx) => {
      await OdometerLog.create(
        {
          carId: car.id,
          previousKm,
          newKm,
          source,
          reason: payload.reason ?? null,
          recordedBy: user.id,
        },
        { client: trx }
      )

      car.useTransaction(trx)
      car.currentOdometerKm = newKm
      await car.save()

      await AuditService.record(
        ctx,
        {
          action: 'car.odometer_updated',
          subject: {
            type: 'car',
            id: car.id,
            label: `${car.make} ${car.model} (${car.registrationNo})`,
          },
          before: { currentOdometerKm: previousKm },
          after: { currentOdometerKm: newKm },
          metadata: { reason: payload.reason ?? null, source },
        },
        trx
      )
    })

    await car.load('category')
    await car.load('branch')
    await car.load('photos', (pq) => pq.preload('file').orderBy('sort_order', 'asc'))

    return response.ok({
      message: 'Odometer updated successfully',
      data: new CarTransformer(car).toObject(),
    })
  }

  async odometerHistory({ params, response }: HttpContext) {
    const logs = await OdometerLog.query()
      .where('car_id', params.id)
      .preload('recorder')
      .orderBy('created_at', 'desc')

    return response.ok({
      message: 'Odometer history fetched successfully',
      data: logs.map((log) => new OdometerLogTransformer(log).toObject()),
    })
  }

  async addPhoto(ctx: HttpContext) {
    const { params, request, response } = ctx
    const car = await Car.findOrFail(params.id)
    const payload = await request.validateUsing(attachCarPhotoValidator)

    const existingPhotos = await CarPhoto.query()
      .where('car_id', car.id)
      .orderBy('sort_order', 'desc')
    const maxSortOrder = existingPhotos[0]?.sortOrder ?? -1
    const isFirstPhoto = existingPhotos.length === 0
    const shouldBeCover = payload.isCover ?? isFirstPhoto

    const photo = await db.transaction(async (trx) => {
      await FileService.attach(payload.fileId, 'car', car.id, trx)

      if (shouldBeCover) {
        await CarPhoto.query({ client: trx }).where('car_id', car.id).update({ is_cover: false })
      }

      const newPhoto = await CarPhoto.create(
        {
          carId: car.id,
          fileId: payload.fileId,
          sortOrder: maxSortOrder + 1,
          isCover: shouldBeCover,
        },
        { client: trx }
      )

      await AuditService.record(
        ctx,
        {
          action: 'car.photo_added',
          subject: {
            type: 'car',
            id: car.id,
            label: `${car.make} ${car.model} (${car.registrationNo})`,
          },
          after: { photoId: newPhoto.id, fileId: payload.fileId, isCover: shouldBeCover },
        },
        trx
      )

      return newPhoto
    })

    await photo.load('file')

    return response.created({
      message: 'Photo attached successfully',
      data: {
        id: photo.id,
        fileId: photo.fileId,
        url: photo.file?.url ?? null,
        sortOrder: photo.sortOrder,
        isCover: photo.isCover,
      },
    })
  }

  async reorderPhotos(ctx: HttpContext) {
    const { params, request, response } = ctx
    const car = await Car.findOrFail(params.id)
    const { photoIds } = await request.validateUsing(reorderPhotosValidator)

    await db.transaction(async (trx) => {
      for (const [index, photoId] of photoIds.entries()) {
        await CarPhoto.query({ client: trx })
          .where('car_id', car.id)
          .where('id', photoId)
          .update({ sort_order: index })
      }

      await AuditService.record(
        ctx,
        {
          action: 'car.photos_reordered',
          subject: {
            type: 'car',
            id: car.id,
            label: `${car.make} ${car.model} (${car.registrationNo})`,
          },
          metadata: { photoIds },
        },
        trx
      )
    })

    return response.ok({
      message: 'Photos reordered successfully',
    })
  }

  async setCoverPhoto(ctx: HttpContext) {
    const { params, response } = ctx
    const car = await Car.findOrFail(params.id)
    const photo = await CarPhoto.query()
      .where('car_id', car.id)
      .where('id', params.photoId)
      .firstOrFail()

    await db.transaction(async (trx) => {
      await CarPhoto.query({ client: trx }).where('car_id', car.id).update({ is_cover: false })

      photo.useTransaction(trx)
      photo.isCover = true
      await photo.save()

      await AuditService.record(
        ctx,
        {
          action: 'car.cover_photo_changed',
          subject: {
            type: 'car',
            id: car.id,
            label: `${car.make} ${car.model} (${car.registrationNo})`,
          },
          metadata: { photoId: photo.id },
        },
        trx
      )
    })

    return response.ok({
      message: 'Cover photo updated successfully',
    })
  }

  async deletePhoto(ctx: HttpContext) {
    const { params, response } = ctx
    const car = await Car.findOrFail(params.id)
    const photo = await CarPhoto.query()
      .where('car_id', car.id)
      .where('id', params.photoId)
      .preload('file')
      .firstOrFail()

    await db.transaction(async (trx) => {
      await AuditService.record(
        ctx,
        {
          action: 'car.photo_removed',
          subject: {
            type: 'car',
            id: car.id,
            label: `${car.make} ${car.model} (${car.registrationNo})`,
          },
          before: { photoId: photo.id, fileId: photo.fileId },
        },
        trx
      )

      await photo.delete()
      if (photo.file) {
        await FileService.delete(photo.file, trx)
      }
    })

    return response.ok({
      message: 'Photo deleted successfully',
    })
  }

  async destroy(ctx: HttpContext) {
    const { params, response } = ctx
    const car = await Car.findOrFail(params.id)

    await db.transaction(async (trx) => {
      car.useTransaction(trx)
      car.archivedAt = DateTime.now()
      car.status = 'retired'
      await car.save()

      await AuditService.record(
        ctx,
        {
          action: 'car.archived',
          subject: {
            type: 'car',
            id: car.id,
            label: `${car.make} ${car.model} (${car.registrationNo})`,
          },
          before: { archivedAt: null },
          after: { archivedAt: car.archivedAt.toISO(), status: 'retired' },
        },
        trx
      )
    })

    return response.ok({
      message: 'Car archived successfully',
    })
  }
}
