import type { HttpContext } from '@adonisjs/core/http'
import type { Infer } from '@vinejs/vine/types'
import { DateTime } from 'luxon'
import Branch from '#models/branch'
import Business from '#models/business'
import Car from '#models/car'
import Expense from '#models/expense'
import ExpenseCategory from '#models/expense_category'
import File from '#models/file'
import AuditService from '#services/audit_service'
import {
  expenseValidator,
  listExpensesValidator,
  rejectExpenseValidator,
} from '#validators/expense'
import { userCan } from '#helpers/permissions'

const toJson = (expense: Expense) => ({
  id: expense.id,
  categoryId: expense.categoryId,
  category: expense.category ? { id: expense.category.id, name: expense.category.name } : null,
  carId: expense.carId,
  car: expense.car
    ? {
        id: expense.car.id,
        name: expense.car.publicTitle || `${expense.car.make} ${expense.car.model}`,
        registrationNo: expense.car.registrationNo,
      }
    : null,
  description: expense.description,
  vendor: expense.vendor,
  amount: expense.amount,
  paidVia: expense.paidVia,
  paidAt: expense.paidAt.toISO(),
  reference: expense.reference,
  receipt: expense.receipt
    ? { id: expense.receipt.id, name: expense.receipt.originalName, mimeType: expense.receipt.mime }
    : null,
  status: expense.status,
  notes: expense.notes,
  rejectReason: expense.rejectReason,
  submittedBy: expense.submitter ? expense.submitter.fullName || expense.submitter.email : null,
  approvedBy: expense.approver ? expense.approver.fullName || expense.approver.email : null,
  approvedAt: expense.approvedAt?.toISO() ?? null,
  createdAt: expense.createdAt.toISO(),
})

const withRelations = () =>
  Expense.query()
    .preload('category')
    .preload('car')
    .preload('receipt')
    .preload('submitter')
    .preload('approver')

const loaded = (id: string) => withRelations().where('id', id).firstOrFail()

const invalid = (field: string, message: string) => ({ message, errors: [{ field, message }] })

/**
 * Expenses (M5.8): view (expenses.view), add and correct (expenses.manage),
 * approve or reject (expenses.approve). Someone who can approve has their
 * own entries approved straight away; an approved or rejected expense can
 * only be corrected by an approver. Only approved ones count in Reports.
 */
export default class ExpensesController {
  /** For the form and filters: categories, and every car (archived ones last) */
  async options({ response }: HttpContext) {
    const [categories, cars] = await Promise.all([
      ExpenseCategory.query().where('active', true).orderBy('sort_order'),
      Car.query().orderByRaw('archived_at is not null').orderBy('make').orderBy('model'),
    ])
    return response.ok({
      message: 'Expense options',
      data: {
        categories: categories.map((row) => ({ id: row.id, name: row.name, slug: row.slug })),
        cars: cars.map((car) => ({
          id: car.id,
          name: car.publicTitle || `${car.make} ${car.model}`,
          registrationNo: car.registrationNo,
          archived: !!car.archivedAt,
        })),
      },
    })
  }

  async index({ request, response }: HttpContext) {
    const payload = await request.validateUsing(listExpensesValidator)
    const business = await Business.query().first()
    const zone = business?.timezone || 'Africa/Accra'
    const query = withRelations()
    if (payload.status) query.where('status', payload.status)
    if (payload.categoryId) query.where('category_id', payload.categoryId)
    if (payload.carId) query.where('car_id', payload.carId)
    if (payload.search) {
      const term = `%${payload.search}%`
      query.where((q) =>
        q
          .whereILike('description', term)
          .orWhereILike('vendor', term)
          .orWhereILike('reference', term)
      )
    }
    if (payload.dateFrom) {
      query.where(
        'paid_at',
        '>=',
        payload.dateFrom.setZone(zone, { keepLocalTime: true }).startOf('day').toSQL()!
      )
    }
    if (payload.dateTo) {
      query.where(
        'paid_at',
        '<=',
        payload.dateTo.setZone(zone, { keepLocalTime: true }).endOf('day').toSQL()!
      )
    }
    // Totals for the same filters (approved and waiting), before paging
    const totalsQuery = query.clone().clearOrder().clearSelect()
    const totals = await totalsQuery
      .select('status')
      .sum('amount as total')
      .count('* as count')
      .groupBy('status')
      .pojo<{ status: string; total: string | null; count: string }>()
    const page = await query
      .orderBy('paid_at', 'desc')
      .orderBy('created_at', 'desc')
      .paginate(payload.page ?? 1, payload.limit ?? 20)
    const of = (status: string) => {
      const row = totals.find((item) => item.status === status)
      return { count: Number(row?.count ?? 0), amount: Number(row?.total ?? 0) }
    }
    return response.ok({
      message: 'Expenses fetched successfully',
      data: page.all().map(toJson),
      meta: { ...page.getMeta(), totals: { approved: of('approved'), submitted: of('submitted') } },
    })
  }

  async store(ctx: HttpContext) {
    const { auth, request, response } = ctx
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(expenseValidator)
    const values = await this.values(payload)
    if ('error' in values) return response.unprocessableEntity(values.error)
    const approver = await userCan(user, 'expenses.approve')
    const branch = await Branch.query().where('is_main', true).firstOrFail()
    const expense = await Expense.create({
      ...values,
      branchId: branch.id,
      submittedBy: user.id,
      status: approver ? 'approved' : 'submitted',
      approvedBy: approver ? user.id : null,
      approvedAt: approver ? DateTime.now() : null,
    })
    await this.attachReceipt(expense)
    await AuditService.record(ctx, {
      action: 'expense.created',
      subject: { type: 'expense', id: expense.id, label: expense.description },
      after: {
        amount: expense.amount,
        status: expense.status,
        categoryId: expense.categoryId,
        carId: expense.carId,
      },
    })
    return response.created({
      message: approver ? 'Expense saved' : 'Expense sent for approval',
      data: toJson(await loaded(expense.id)),
    })
  }

  async update(ctx: HttpContext) {
    const { auth, params, request, response } = ctx
    const user = auth.getUserOrFail()
    const expense = await Expense.findOrFail(params.id)
    if (expense.status !== 'submitted' && !(await userCan(user, 'expenses.approve'))) {
      return response.forbidden({
        message: 'Only someone who approves expenses can change one that’s been decided.',
      })
    }
    const payload = await request.validateUsing(expenseValidator)
    const values = await this.values(payload)
    if ('error' in values) return response.unprocessableEntity(values.error)
    const before = { amount: expense.amount, categoryId: expense.categoryId, carId: expense.carId }
    expense.merge(values)
    await expense.save()
    await this.attachReceipt(expense)
    await AuditService.record(ctx, {
      action: 'expense.updated',
      subject: { type: 'expense', id: expense.id, label: expense.description },
      before,
      after: { amount: expense.amount, categoryId: expense.categoryId, carId: expense.carId },
    })
    return response.ok({
      message: 'Expense updated',
      data: toJson(await loaded(expense.id)),
    })
  }

  async approve(ctx: HttpContext) {
    const expense = await Expense.findOrFail(ctx.params.id)
    if (expense.status === 'approved')
      return ctx.response.ok({ message: 'Already approved', data: { id: expense.id } })
    expense.merge({
      status: 'approved',
      approvedBy: ctx.auth.getUserOrFail().id,
      approvedAt: DateTime.now(),
      rejectReason: null,
    })
    await expense.save()
    await AuditService.record(ctx, {
      action: 'expense.approved',
      subject: { type: 'expense', id: expense.id, label: expense.description },
      after: { amount: expense.amount },
    })
    return ctx.response.ok({
      message: 'Expense approved',
      data: toJson(await loaded(expense.id)),
    })
  }

  async reject(ctx: HttpContext) {
    const { reason } = await ctx.request.validateUsing(rejectExpenseValidator)
    const expense = await Expense.findOrFail(ctx.params.id)
    expense.merge({
      status: 'rejected',
      rejectReason: reason,
      approvedBy: ctx.auth.getUserOrFail().id,
      approvedAt: DateTime.now(),
    })
    await expense.save()
    await AuditService.record(ctx, {
      action: 'expense.rejected',
      subject: { type: 'expense', id: expense.id, label: expense.description },
      metadata: { reason },
    })
    return ctx.response.ok({
      message: 'Expense rejected',
      data: toJson(await loaded(expense.id)),
    })
  }

  /** Validated values: the category and car must exist; the date can't be in the future. */
  private async values(payload: Infer<typeof expenseValidator>) {
    const business = await Business.query().first()
    const zone = business?.timezone || 'Africa/Accra'
    const paidAt = /^\d{4}-\d{2}-\d{2}$/.test(payload.paidAt)
      ? DateTime.fromISO(`${payload.paidAt}T12:00`, { zone })
      : DateTime.fromISO(payload.paidAt, { zone })
    if (!paidAt.isValid) return { error: invalid('paidAt', 'Enter the date it was paid.') }
    if (paidAt > DateTime.now().plus({ hours: 1 }).endOf('day')) {
      return { error: invalid('paidAt', 'The date can’t be in the future.') }
    }
    const category = await ExpenseCategory.find(payload.categoryId)
    if (!category) return { error: invalid('categoryId', 'Choose what it was for.') }
    if (payload.carId && !(await Car.find(payload.carId))) {
      return { error: invalid('carId', 'That car no longer exists.') }
    }
    if (payload.receiptFileId) {
      const file = await File.find(payload.receiptFileId)
      if (!file || file.purpose !== 'expense_receipt') {
        return { error: invalid('receiptFileId', 'Upload the receipt again.') }
      }
    }
    return {
      categoryId: category.id,
      carId: payload.carId ?? null,
      description: payload.description,
      vendor: payload.vendor ?? null,
      amount: payload.amount,
      paidVia: payload.paidVia,
      paidAt,
      reference: payload.reference ?? null,
      receiptFileId: payload.receiptFileId ?? null,
      notes: payload.notes ?? null,
    }
  }

  /** The receipt belongs to this expense now (so the nightly clean-up keeps it) */
  private async attachReceipt(expense: Expense) {
    if (!expense.receiptFileId) return
    await File.query()
      .where('id', expense.receiptFileId)
      .update({ attachable_type: 'expense', attachable_id: expense.id })
  }
}
