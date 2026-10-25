import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import Category from '#models/category'
import CategoryFilter from '#filters/category_filter'
import CategoryTransformer from '#transformers/category_transformer'
import AuditService from '#services/audit_service'
import {
  categoryFilterValidator,
  createCategoryValidator,
  updateCategoryValidator,
} from '#validators/category'

export default class CategoriesController {
  async index({ request, response, serialize }: HttpContext) {
    const payload = await request.validateUsing(categoryFilterValidator)
    const query = Category.query().withCount('cars', (q) => q.as('cars_count'))
    const categories = await new CategoryFilter(query, { ...payload })
      .apply()
      .paginate(payload.page ?? 1, payload.limit ?? 20)

    const transformed = await serialize(
      CategoryTransformer.paginate(categories.all(), categories.getMeta())
    )

    return response.ok({
      message: 'Categories fetched successfully',
      data: transformed.data,
      meta: transformed.metadata,
    })
  }

  async store(ctx: HttpContext) {
    const { request, response } = ctx
    const payload = await request.validateUsing(createCategoryValidator)

    const category = await db.transaction(async (trx) => {
      const created = await Category.create(payload, { client: trx })
      await AuditService.record(
        ctx,
        {
          action: 'category.created',
          subject: { type: 'category', id: created.id, label: created.name },
          after: created.toJSON(),
        },
        trx
      )
      return created
    })

    return response.created({
      message: 'Category created successfully',
      data: new CategoryTransformer(category).toObject(),
    })
  }

  async show({ params, response }: HttpContext) {
    const category = await Category.query()
      .where('id', params.id)
      .withCount('cars', (q) => q.as('cars_count'))
      .firstOrFail()

    return response.ok({
      message: 'Category fetched successfully',
      data: new CategoryTransformer(category).toObject(),
    })
  }

  async update(ctx: HttpContext) {
    const { params, request, response } = ctx
    const category = await Category.findOrFail(params.id)
    const payload = await request.validateUsing(updateCategoryValidator(category.id))

    await db.transaction(async (trx) => {
      category.useTransaction(trx)
      const before = category.toJSON()
      category.merge(payload)
      await category.save()

      await AuditService.record(
        ctx,
        {
          action: 'category.updated',
          subject: { type: 'category', id: category.id, label: category.name },
          before,
          after: category.toJSON(),
        },
        trx
      )
    })

    return response.ok({
      message: 'Category updated successfully',
      data: new CategoryTransformer(category).toObject(),
    })
  }

  async destroy(ctx: HttpContext) {
    const { params, response } = ctx
    const category = await Category.query()
      .where('id', params.id)
      .withCount('cars', (q) => q.as('cars_count'))
      .firstOrFail()

    const carsCount = Number(category.$extras.cars_count ?? 0)
    if (carsCount > 0) {
      return response.conflict({
        message: `Cannot delete category "${category.name}" because it has ${carsCount} vehicle(s) assigned. Deactivate it instead.`,
      })
    }

    await db.transaction(async (trx) => {
      category.useTransaction(trx)
      await AuditService.record(
        ctx,
        {
          action: 'category.deleted',
          subject: { type: 'category', id: category.id, label: category.name },
          before: category.toJSON(),
        },
        trx
      )
      await category.delete()
    })

    return response.ok({
      message: 'Category deleted successfully',
    })
  }
}
