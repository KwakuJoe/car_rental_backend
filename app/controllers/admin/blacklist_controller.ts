import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import BlacklistEntry from '#models/blacklist_entry'
import Customer from '#models/customer'
import AuditService from '#services/audit_service'
import CustomerStatusService from '#services/customers/customer_status_service'
import { blacklistEntryToJson } from '#transformers/customer_transformer'
import { normalizeDocumentNumber, normalizePhone } from '#helpers/phone'
import { userCan } from '#helpers/permissions'
import {
  blacklistCheckValidator,
  blacklistFilterValidator,
  createBlacklistValidator,
  liftBlacklistValidator,
} from '#validators/customer'

const fail = (response: HttpContext['response'], field: string, message: string) =>
  response.unprocessableEntity({ message, errors: [{ field, rule: 'blacklist', message }] })

export default class BlacklistController {
  async index({ auth, request, response }: HttpContext) {
    const payload = await request.validateUsing(blacklistFilterValidator)
    const query = BlacklistEntry.query().preload('customer').preload('adder').preload('lifter')
    if (payload.status === 'lifted') query.whereNotNull('lifted_at')
    else if (payload.status === 'active') query.whereNull('lifted_at')
    if (payload.severity) query.where('severity', payload.severity)
    if (payload.search) {
      const term = payload.search.replace(/\s+/g, '').toUpperCase()
      const phone = normalizePhone(payload.search)
      query.where((q) => {
        q.whereIn('ghana_card_no', [term, normalizeDocumentNumber('ghana_card', term)])
          .orWhere('licence_no', term)
          .orWhere('passport_no', term)
          .orWhereIn(
            'customer_id',
            Customer.query().select('id').whereILike('full_name', `%${payload.search}%`)
          )
        if (phone) q.orWhere('phone', phone)
      })
    }
    const entries = await query
      .orderBy('created_at', 'desc')
      .paginate(payload.page ?? 1, payload.limit ?? 20)
    const canView = await userCan(auth.getUserOrFail(), 'customers.view_documents')
    return response.ok({
      message: 'Blacklist fetched successfully',
      data: entries.all().map((entry) => blacklistEntryToJson(entry, canView)),
      meta: entries.getMeta(),
    })
  }

  async store(ctx: HttpContext) {
    const { auth, request, response } = ctx
    const payload = await request.validateUsing(createBlacklistValidator)

    let phone = payload.phone ? normalizePhone(payload.phone) : null
    if (payload.phone && !phone) return fail(response, 'phone', 'Enter a valid phone number.')
    let ghanaCardNo = payload.ghanaCardNo
      ? normalizeDocumentNumber('ghana_card', payload.ghanaCardNo)
      : null
    let licenceNo = payload.licenceNo
      ? normalizeDocumentNumber('drivers_licence', payload.licenceNo)
      : null
    let passportNo = payload.passportNo
      ? normalizeDocumentNumber('passport', payload.passportNo)
      : null

    // Linked to a customer: copy their identifiers, so a new profile with the same ID is caught
    let customer: Customer | null = null
    if (payload.customerId) {
      customer = await Customer.query()
        .where('id', payload.customerId)
        .preload('identities')
        .first()
      if (!customer) return fail(response, 'customerId', 'That customer was not found.')
      const numberOf = (types: string[]) =>
        customer!.identities.find((identity) => types.includes(identity.type))?.number ?? null
      phone ??= customer.phone
      ghanaCardNo ??= numberOf(['ghana_card'])
      licenceNo ??= numberOf(['drivers_licence', 'international_driving_permit'])
      passportNo ??= numberOf(['passport'])
    }
    if (!customer && !phone && !ghanaCardNo && !licenceNo && !passportNo) {
      return fail(response, 'phone', 'Choose a customer or enter a phone or ID number to match on.')
    }

    const entry = await db.transaction(async (trx) => {
      const created = await BlacklistEntry.create(
        {
          customerId: customer?.id ?? null,
          phone,
          ghanaCardNo,
          licenceNo,
          passportNo,
          reason: payload.reason,
          details: payload.details ?? null,
          severity: payload.severity,
          addedBy: auth.getUserOrFail().id,
        },
        { client: trx }
      )
      await CustomerStatusService.refreshMatching(created, trx)
      await AuditService.record(
        ctx,
        {
          action: 'blacklist.added',
          subject: {
            type: 'blacklist_entry',
            id: created.id,
            label: customer?.fullName ?? phone ?? 'Unknown person',
          },
          metadata: { severity: created.severity, reason: created.reason },
        },
        trx
      )
      return created
    })
    await entry.load('customer')
    await entry.load('adder')
    const canView = await userCan(auth.getUserOrFail(), 'customers.view_documents')
    return response.created({
      message: 'Added to the blacklist',
      data: blacklistEntryToJson(entry, canView),
    })
  }

  async lift(ctx: HttpContext) {
    const { auth, params, request, response } = ctx
    const entry = await BlacklistEntry.query()
      .where('id', params.id)
      .preload('customer')
      .firstOrFail()
    if (entry.liftedAt) return fail(response, 'reason', 'This entry was already lifted.')
    const { reason } = await request.validateUsing(liftBlacklistValidator)
    await db.transaction(async (trx) => {
      entry.useTransaction(trx)
      entry.merge({
        liftedAt: DateTime.now(),
        liftedBy: auth.getUserOrFail().id,
        liftReason: reason,
      })
      await entry.save()
      await CustomerStatusService.refreshMatching(entry, trx)
      await AuditService.record(
        ctx,
        {
          action: 'blacklist.lifted',
          subject: {
            type: 'blacklist_entry',
            id: entry.id,
            label: entry.customer?.fullName ?? entry.phone ?? 'Unknown person',
          },
          metadata: { reason },
        },
        trx
      )
    })
    await entry.load('lifter')
    const canView = await userCan(auth.getUserOrFail(), 'customers.view_documents')
    return response.ok({
      message: 'Blacklist entry lifted',
      data: blacklistEntryToJson(entry, canView),
    })
  }

  /** Quick check before booking someone (e.g. a walk-in not yet on file). */
  async check({ request, response }: HttpContext) {
    const payload = await request.validateUsing(blacklistCheckValidator)
    const phone = normalizePhone(payload.phone)
    const numbers = payload.documentNumber
      ? [
          ...new Set(
            ['ghana_card', 'other'].map((type) =>
              normalizeDocumentNumber(type, payload.documentNumber!)
            )
          ),
        ]
      : []
    const entries = await CustomerStatusService.matchingEntries({ phone, numbers })
    return response.ok({
      message: 'Blacklist checked',
      data: {
        severity: CustomerStatusService.severityOf(entries),
        matches: entries.map((entry) => ({
          reason: entry.reason,
          severity: entry.severity,
          details: entry.details,
        })),
      },
    })
  }
}
