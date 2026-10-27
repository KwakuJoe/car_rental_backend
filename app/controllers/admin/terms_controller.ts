import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import ChecklistItem from '#models/checklist_item'
import TermsVersion from '#models/terms_version'
import AuditService from '#services/audit_service'
import { checklistValidator, termsValidator } from '#validators/handover'

/** Rental terms (versioned, never edited) and the handover checklist. */
export default class TermsController {
  async show({ response }: HttpContext) {
    const terms = await TermsVersion.current()
    return response.ok({
      message: 'Rental terms',
      data: terms
        ? {
            id: terms.id,
            version: terms.version,
            body: terms.body,
            createdAt: terms.createdAt.toISO(),
          }
        : null,
    })
  }

  /** A change is a new version - signatures keep pointing at what was signed. */
  async store(ctx: HttpContext) {
    const { auth, request, response } = ctx
    const { body } = await request.validateUsing(termsValidator)
    const current = await TermsVersion.current()
    if (current?.body === body) {
      return response.ok({
        message: 'No change',
        data: { id: current.id, version: current.version, body },
      })
    }
    const terms = await TermsVersion.create({
      version: (current?.version ?? 0) + 1,
      body,
      createdBy: auth.getUserOrFail().id,
    })
    await AuditService.record(ctx, {
      action: 'terms.updated',
      subject: { type: 'terms', id: terms.id, label: `Version ${terms.version}` },
      metadata: { version: terms.version },
    })
    return response.created({
      message: `Terms version ${terms.version} saved`,
      data: { id: terms.id, version: terms.version, body: terms.body },
    })
  }

  async checklist({ response }: HttpContext) {
    const items = await ChecklistItem.query().orderBy('sort_order', 'asc')
    return response.ok({
      message: 'Handover checklist',
      data: items.map((item) => ({ id: item.id, name: item.name, active: Boolean(item.active) })),
    })
  }

  /** Replace the list in the given order (items without an id are added). */
  async saveChecklist(ctx: HttpContext) {
    const { request, response } = ctx
    const { items } = await request.validateUsing(checklistValidator)
    await db.transaction(async (trx) => {
      const kept = items.filter((item) => item.id).map((item) => item.id!)
      // Removed items are switched off, not deleted (old inspections name them)
      await ChecklistItem.query({ client: trx }).whereNotIn('id', kept).update({ active: false })
      for (const [index, item] of items.entries()) {
        if (item.id) {
          await ChecklistItem.query({ client: trx })
            .where('id', item.id)
            .update({ name: item.name, active: item.active, sort_order: index })
        } else {
          await ChecklistItem.create(
            { name: item.name, active: item.active, sortOrder: index },
            { client: trx }
          )
        }
      }
    })
    await AuditService.record(ctx, {
      action: 'checklist.updated',
      subject: { type: 'checklist', id: 'handover', label: 'Handover checklist' },
      metadata: { items: items.map((item) => item.name) },
    })
    const saved = await ChecklistItem.query().where('active', true).orderBy('sort_order', 'asc')
    return response.ok({
      message: 'Checklist saved',
      data: saved.map((item) => ({ id: item.id, name: item.name, active: true })),
    })
  }
}
