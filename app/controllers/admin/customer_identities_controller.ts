import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import type { Infer } from '@vinejs/vine/types'
import { DateTime } from 'luxon'
import Customer from '#models/customer'
import CustomerIdentity, { GHANA_CARD_PATTERN } from '#models/customer_identity'
import File from '#models/file'
import AuditService from '#services/audit_service'
import FileService from '#services/file_service'
import CustomerStatusService from '#services/customers/customer_status_service'
import { identityToJson, maskNumber } from '#transformers/customer_transformer'
import { normalizeDocumentNumber } from '#helpers/phone'
import { userCan } from '#helpers/permissions'
import { identityValidator, rejectIdentityValidator } from '#validators/customer'

type IdentityPayload = Infer<typeof identityValidator>

class FieldError extends Error {
  constructor(
    public field: string,
    message: string
  ) {
    super(message)
  }
}

const FILE_PURPOSES_BY_SIDE: Record<string, string[]> = {
  front: ['id_front', 'licence'],
  back: ['id_back', 'licence'],
}

/**
 * Rules, plus the file checks: ID images must be private, and a file already
 * on another document can't be moved here (only this document's own files).
 */
async function values(payload: IdentityPayload, identityId?: string) {
  const number = normalizeDocumentNumber(payload.type, payload.number)
  if (payload.type === 'ghana_card' && !GHANA_CARD_PATTERN.test(number)) {
    throw new FieldError('number', 'A Ghana Card number looks like GHA-123456789-0.')
  }
  const mustExpire = ['passport', 'drivers_licence', 'international_driving_permit']
  if (mustExpire.includes(payload.type) && !payload.expiresOn) {
    throw new FieldError('expiresOn', 'Enter the expiry date shown on the document.')
  }
  if (payload.issuedOn && payload.expiresOn && payload.expiresOn < payload.issuedOn) {
    throw new FieldError('expiresOn', 'The expiry date must be after the issue date.')
  }
  for (const [side, fileId] of [
    ['front', payload.frontFileId],
    ['back', payload.backFileId],
  ] as const) {
    if (!fileId) continue
    const file = await File.find(fileId)
    if (!file || !file.isPrivate || !FILE_PURPOSES_BY_SIDE[side].includes(file.purpose)) {
      throw new FieldError(`${side}FileId`, 'Upload the document image again.')
    }
    const ownFile = file.attachableType === 'customer_identity' && file.attachableId === identityId
    if (file.attachableId && !ownFile) {
      throw new FieldError(`${side}FileId`, 'Upload the document image again.')
    }
  }
  return {
    type: payload.type,
    number,
    issuingCountry: payload.issuingCountry ?? (payload.type === 'ghana_card' ? 'GH' : null),
    issuedOn: payload.issuedOn ?? null,
    expiresOn: payload.expiresOn ?? null,
    licenceClass: payload.licenceClass ?? null,
    frontFileId: payload.frontFileId ?? null,
    backFileId: payload.backFileId ?? null,
  }
}

const fail = (response: HttpContext['response'], error: FieldError) =>
  response.unprocessableEntity({
    message: error.message,
    errors: [{ field: error.field, rule: 'identity', message: error.message }],
  })

async function attachFiles(identity: CustomerIdentity, trx: any) {
  for (const fileId of [identity.frontFileId, identity.backFileId]) {
    if (fileId) await FileService.attach(fileId, 'customer_identity', identity.id, trx)
  }
}

export default class CustomerIdentitiesController {
  async store(ctx: HttpContext) {
    const { auth, params, request, response } = ctx
    const customer = await Customer.findOrFail(params.customerId)
    const payload = await request.validateUsing(identityValidator)
    try {
      const data = await values(payload)
      const identity = await db.transaction(async (trx) => {
        const created = await CustomerIdentity.create(
          {
            ...data,
            customerId: customer.id,
            status: 'pending',
            createdBy: auth.getUserOrFail().id,
          },
          { client: trx }
        )
        await attachFiles(created, trx)
        // A new number may match the blacklist
        await CustomerStatusService.refresh(customer, trx)
        await AuditService.record(
          ctx,
          {
            action: 'customer.document_added',
            subject: { type: 'customer', id: customer.id, label: customer.fullName },
            metadata: {
              documentId: created.id,
              type: created.type,
              number: maskNumber(created.number),
            },
          },
          trx
        )
        return created
      })
      const canView = await userCan(auth.getUserOrFail(), 'customers.view_documents')
      return response.created({
        message: 'Document added',
        data: identityToJson(identity, canView),
      })
    } catch (error) {
      if (error instanceof FieldError) return fail(response, error)
      throw error
    }
  }

  async update(ctx: HttpContext) {
    const { auth, params, request, response } = ctx
    const customer = await Customer.findOrFail(params.customerId)
    const identity = await CustomerIdentity.query()
      .where('id', params.id)
      .where('customer_id', customer.id)
      .firstOrFail()
    const payload = await request.validateUsing(identityValidator)
    try {
      const data = await values(payload, identity.id)
      const previousFileIds = [identity.frontFileId, identity.backFileId]
      await db.transaction(async (trx) => {
        identity.useTransaction(trx)
        identity.merge(data)
        // Any change to a verified document needs checking again
        if (identity.$isDirty && identity.status === 'verified') {
          identity.status = 'pending'
          identity.verifiedBy = null
          identity.verifiedAt = null
        }
        await identity.save()
        await attachFiles(identity, trx)
        await CustomerStatusService.refresh(customer, trx)
        await AuditService.record(
          ctx,
          {
            action: 'customer.document_updated',
            subject: { type: 'customer', id: customer.id, label: customer.fullName },
            metadata: {
              documentId: identity.id,
              type: identity.type,
              number: maskNumber(identity.number),
            },
          },
          trx
        )
      })
      // A replaced image is no longer needed - don't keep ID scans without a reason (Act 843)
      const kept = [identity.frontFileId, identity.backFileId]
      for (const fileId of previousFileIds) {
        if (!fileId || kept.includes(fileId)) continue
        const file = await File.find(fileId)
        if (file) await FileService.delete(file)
      }
      const canView = await userCan(auth.getUserOrFail(), 'customers.view_documents')
      return response.ok({ message: 'Document updated', data: identityToJson(identity, canView) })
    } catch (error) {
      if (error instanceof FieldError) return fail(response, error)
      throw error
    }
  }

  async verify(ctx: HttpContext) {
    const { auth, params, response } = ctx
    const customer = await Customer.findOrFail(params.customerId)
    const identity = await CustomerIdentity.query()
      .where('id', params.id)
      .where('customer_id', customer.id)
      .firstOrFail()
    if (identity.expiresOn && identity.expiresOn < DateTime.now().startOf('day')) {
      return fail(
        response,
        new FieldError('expiresOn', 'This document has expired - it cannot be verified.')
      )
    }
    const user = auth.getUserOrFail()
    await db.transaction(async (trx) => {
      identity.useTransaction(trx)
      identity.merge({
        status: 'verified',
        verifiedBy: user.id,
        verifiedAt: DateTime.now(),
        rejectionReason: null,
      })
      await identity.save()
      await CustomerStatusService.refresh(customer, trx)
      await AuditService.record(
        ctx,
        {
          action: 'customer.document_verified',
          subject: { type: 'customer', id: customer.id, label: customer.fullName },
          metadata: { documentId: identity.id, type: identity.type },
        },
        trx
      )
    })
    await identity.load('verifier')
    const canView = await userCan(user, 'customers.view_documents')
    return response.ok({ message: 'Document verified', data: identityToJson(identity, canView) })
  }

  async reject(ctx: HttpContext) {
    const { auth, params, request, response } = ctx
    const customer = await Customer.findOrFail(params.customerId)
    const identity = await CustomerIdentity.query()
      .where('id', params.id)
      .where('customer_id', customer.id)
      .firstOrFail()
    const { reason } = await request.validateUsing(rejectIdentityValidator)
    await db.transaction(async (trx) => {
      identity.useTransaction(trx)
      identity.merge({
        status: 'rejected',
        verifiedBy: null,
        verifiedAt: null,
        rejectionReason: reason,
      })
      await identity.save()
      await CustomerStatusService.refresh(customer, trx)
      await AuditService.record(
        ctx,
        {
          action: 'customer.document_rejected',
          subject: { type: 'customer', id: customer.id, label: customer.fullName },
          metadata: { documentId: identity.id, type: identity.type, reason },
        },
        trx
      )
    })
    const canView = await userCan(auth.getUserOrFail(), 'customers.view_documents')
    return response.ok({ message: 'Document rejected', data: identityToJson(identity, canView) })
  }
}
