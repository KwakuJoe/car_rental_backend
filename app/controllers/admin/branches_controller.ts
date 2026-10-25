import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import Business from '#models/business'
import Branch from '#models/branch'
import OpeningHour from '#models/opening_hour'
import BranchTransformer from '#transformers/branch_transformer'
import BranchFilter from '#filters/branch_filter'
import {
  branchFilterValidator,
  createBranchValidator,
  updateBranchValidator,
} from '#validators/branch'

export default class BranchesController {
  async index({ request, response, serialize }: HttpContext) {
    const payload = await request.validateUsing(branchFilterValidator)
    const branches = await new BranchFilter(Branch.query(), { ...payload })
      .apply()
      .paginate(payload.page ?? 1, payload.limit ?? 20)

    const transformed = await serialize(
      BranchTransformer.paginate(branches.all(), branches.getMeta())
    )
    return response.ok({
      message: 'Branches fetched successfully',
      data: transformed.data,
      meta: transformed.metadata,
    })
  }

  /**
   * New branches are never created as main (promote via update) and start
   * with a copy of the main branch's opening hours.
   */
  async store({ request, response, serialize }: HttpContext) {
    const data = await request.validateUsing(createBranchValidator)
    const business = await Business.current()

    const branch = await db.transaction(async (trx) => {
      const newBranch = await Branch.create(
        {
          ...data,
          latitude: data.latitude?.toString() ?? null,
          longitude: data.longitude?.toString() ?? null,
          businessId: business.id,
          isMain: false,
          isActive: true,
        },
        { client: trx }
      )

      const mainBranch = await Branch.query({ client: trx })
        .where('is_main', true)
        .preload('openingHours')
        .first()
      if (mainBranch) {
        await OpeningHour.createMany(
          mainBranch.openingHours.map((hours) => ({
            branchId: newBranch.id,
            weekday: hours.weekday,
            isClosed: hours.isClosed,
            opensAt: hours.opensAt,
            closesAt: hours.closesAt,
          })),
          { client: trx }
        )
      }

      return newBranch
    })

    const transformed = await serialize(BranchTransformer.transform(branch))
    return response.created({ message: 'Branch created successfully', data: transformed.data })
  }

  async show({ params, response, serialize }: HttpContext) {
    const branch = await Branch.findOrFail(params.id)
    const transformed = await serialize(BranchTransformer.transform(branch))
    return response.ok({ message: 'Branch fetched successfully', data: transformed.data })
  }

  /**
   * isMain: true promotes this branch and demotes the current main one in
   * the same transaction. The main branch can't be un-set or deactivated
   * directly - promote another branch first.
   */
  async update({ params, request, response, serialize }: HttpContext) {
    const branch = await Branch.findOrFail(params.id)
    const { isMain, latitude, longitude, ...data } = await request.validateUsing(
      updateBranchValidator,
      {
        meta: { branchId: branch.id },
      }
    )

    if (branch.isMain && isMain === false) {
      return response.badRequest({
        message: 'There must always be one main branch - promote another branch to main instead',
      })
    }
    if (branch.isMain && data.isActive === false) {
      return response.badRequest({ message: 'The main branch cannot be deactivated' })
    }
    if (isMain && (data.isActive === false || (data.isActive === undefined && !branch.isActive))) {
      return response.badRequest({ message: 'Only an active branch can be made the main branch' })
    }

    await db.transaction(async (trx) => {
      branch.useTransaction(trx)
      branch.merge(data)
      if (latitude !== undefined) branch.latitude = latitude === null ? null : latitude.toString()
      if (longitude !== undefined)
        branch.longitude = longitude === null ? null : longitude.toString()

      if (isMain && !branch.isMain) {
        await Branch.query({ client: trx })
          .where('business_id', branch.businessId)
          .where('is_main', true)
          .update({ is_main: false })
        branch.isMain = true
      }

      await branch.save()
    })

    const transformed = await serialize(BranchTransformer.transform(branch))
    return response.ok({ message: 'Branch updated successfully', data: transformed.data })
  }

  /**
   * Only an empty, non-main branch can be deleted. Later modules (cars,
   * bookings, payments) also reference branches - deactivate instead of
   * deleting once a branch has history.
   */
  async destroy({ params, response }: HttpContext) {
    const branch = await Branch.findOrFail(params.id)
    if (branch.isMain) {
      return response.badRequest({ message: 'The main branch cannot be deleted' })
    }

    const staffCount = await db
      .from('branch_users')
      .where('branch_id', branch.id)
      .count('* as total')
      .first()
    const total = Number(staffCount?.total ?? 0)
    if (total > 0) {
      return response.conflict({
        message: `Reassign the ${total} staff member${total === 1 ? '' : 's'} at this branch before deleting it`,
      })
    }

    await branch.delete()
    return response.ok({ message: 'Branch deleted successfully' })
  }
}
