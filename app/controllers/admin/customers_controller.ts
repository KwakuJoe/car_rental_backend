import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import type { Infer } from '@vinejs/vine/types'
import { DateTime } from 'luxon'
import Branch from '#models/branch'
import Customer from '#models/customer'
import CustomerIdentity from '#models/customer_identity'
import AuditService from '#services/audit_service'
import CustomerStatusService from '#services/customers/customer_status_service'
import { customerToJson } from '#transformers/customer_transformer'
import { normalizeDocumentNumber, normalizePhone } from '#helpers/phone'
import { userCan } from '#helpers/permissions'
import {
  createCustomerValidator,
  customerFilterValidator,
  duplicateCheckValidator,
  updateCustomerValidator,
} from '#validators/customer'

type CustomerPayload = Infer<typeof createCustomerValidator>

class FieldError extends Error {
  constructor(
    public field: string,
    message: string
  ) {
    super(message)
  }
}

const fail = (response: HttpContext['response'], error: FieldError) =>
  response.unprocessableEntity({
    message: error.message,
    errors: [{ field: error.field, rule: 'customer', message: error.message }],
  })

function phoneOrFail(field: string, value: string | null | undefined, required = false) {
  if (!value) {
    if (required) throw new FieldError(field, 'Enter a phone number.')
    return null
  }
  const phone = normalizePhone(value)
  if (!phone) throw new FieldError(field, 'Enter a valid phone number, e.g. 024 123 4567.')
  return phone
}

async function values(payload: CustomerPayload, customerId?: string) {
  const phone = phoneOrFail('phone', payload.phone, true)!
  const taken = await Customer.query()
    .where('phone', phone)
    .whereNull('archived_at')
    .if(customerId, (q) => q.whereNot('id', customerId!))
    .first()
  if (taken) {
    throw new FieldError('phone', `This phone number already belongs to ${taken.fullName}.`)
  }
  return {
    type: payload.type ?? 'individual',
    fullName: payload.fullName,
    phone,
    whatsappPhone: phoneOrFail('whatsappPhone', payload.whatsappPhone),
    email: payload.email?.toLowerCase() ?? null,
    dateOfBirth: payload.dateOfBirth ?? null,
    gender: payload.gender ?? null,
    nationality: payload.nationality ?? null,
    residentialAddress: payload.residentialAddress ?? null,
    digitalAddress: payload.digitalAddress ?? null,
    occupation: payload.occupation ?? null,
    employer: payload.employer ?? null,
    emergencyContactName: payload.emergencyContactName ?? null,
    emergencyContactPhone: phoneOrFail('emergencyContactPhone', payload.emergencyContactPhone),
    source: payload.source ?? null,
    notes: payload.notes ?? null,
    marketingOptIn: payload.marketingOptIn ?? false,
  }
}

const AUDITED = [
  'fullName',
  'phone',
  'whatsappPhone',
  'email',
  'dateOfBirth',
  'residentialAddress',
  'digitalAddress',
  'emergencyContactName',
  'emergencyContactPhone',
  'notes',
] as const

export default class CustomersController {
  async index({ request, response }: HttpContext) {
    const payload = await request.validateUsing(customerFilterValidator)
    const query = Customer.query()

    if (payload.search) {
      const term = payload.search
      const phone = normalizePhone(term)
      query.where((q) => {
        q.whereILike('full_name', `%${term}%`)
          .orWhereILike('email', `%${term}%`)
          .orWhereILike('phone', `%${term.replace(/\s+/g, '')}%`)
          .orWhereIn(
            'id',
            CustomerIdentity.query()
              .select('customer_id')
              .whereILike('number', `%${term.replace(/\s+/g, '')}%`)
          )
        if (phone) q.orWhere('phone', phone)
      })
    }
    if (payload.verificationStatus) query.where('verification_status', payload.verificationStatus)
    if (payload.blacklisted === 'any') query.whereNotNull('blacklist_severity')
    else if (payload.blacklisted) query.where('blacklist_severity', payload.blacklisted)
    if (payload.archived) query.whereNotNull('archived_at')
    else query.whereNull('archived_at')

    if (payload.sortBy === 'fullName') query.orderBy('full_name', payload.sortOrder ?? 'asc')
    else query.orderBy('created_at', payload.sortOrder ?? 'desc')

    const customers = await query.paginate(payload.page ?? 1, payload.limit ?? 20)
    return response.ok({
      message: 'Customers fetched successfully',
      data: customers
        .all()
        .map((customer) => customerToJson(customer, { canViewDocuments: false })),
      meta: customers.getMeta(),
    })
  }

  async show({ auth, params, response }: HttpContext) {
    const customer = await Customer.query()
      .where('id', params.id)
      .preload('identities', (q) => q.preload('verifier').orderBy('created_at', 'asc'))
      .firstOrFail()
    const blacklist = await CustomerStatusService.matchingEntries({
      customerId: customer.id,
      phone: customer.phone,
      numbers: customer.identities.map((identity) => identity.number),
    })
    const canViewDocuments = await userCan(auth.getUserOrFail(), 'customers.view_documents')
    return response.ok({
      message: 'Customer fetched successfully',
      data: customerToJson(customer, { canViewDocuments, blacklist }),
    })
  }

  /** Possible duplicates and blacklist matches while a customer is being entered. */
  async duplicates({ request, response }: HttpContext) {
    const payload = await request.validateUsing(duplicateCheckValidator)
    const phone = normalizePhone(payload.phone)
    const number = payload.documentNumber
      ? normalizeDocumentNumber('ghana_card', payload.documentNumber)
      : null
    const matches = new Map<string, { customer: Customer; reasons: string[] }>()
    const add = (customers: Customer[], reason: string) => {
      for (const customer of customers) {
        if (customer.id === payload.excludeId) continue
        const entry = matches.get(customer.id) ?? { customer, reasons: [] }
        entry.reasons.push(reason)
        matches.set(customer.id, entry)
      }
    }
    const active = () => Customer.query().whereNull('archived_at').limit(5)

    if (phone) add(await active().where('phone', phone), 'Same phone number')
    if (payload.fullName && payload.dateOfBirth) {
      add(
        await active()
          .whereILike('full_name', payload.fullName.trim())
          .where('date_of_birth', payload.dateOfBirth.toISODate()!),
        'Same name and date of birth'
      )
    }
    if (number) {
      add(
        await active().whereIn(
          'id',
          CustomerIdentity.query().select('customer_id').where('number', number)
        ),
        'Same document number'
      )
    }
    const blacklist = await CustomerStatusService.matchingEntries({
      phone,
      numbers: number ? [number] : [],
    })

    return response.ok({
      message: 'Duplicate check done',
      data: {
        customers: [...matches.values()].map(({ customer, reasons }) => ({
          id: customer.id,
          fullName: customer.fullName,
          phone: customer.phone,
          reasons,
        })),
        blacklist: {
          severity: CustomerStatusService.severityOf(blacklist),
          reasons: blacklist.map((entry) => entry.reason),
        },
      },
    })
  }

  async store(ctx: HttpContext) {
    const { request, response } = ctx
    const payload = await request.validateUsing(createCustomerValidator)
    try {
      const data = await values(payload)
      const branch = await Branch.query().where('is_main', true).firstOrFail()
      const customer = await db.transaction(async (trx) => {
        const created = await Customer.create(
          {
            ...data,
            branchId: branch.id,
            verificationStatus: 'unverified',
            createdBy: ctx.auth.getUserOrFail().id,
          },
          { client: trx }
        )
        await CustomerStatusService.refresh(created, trx)
        await AuditService.record(
          ctx,
          {
            action: 'customer.created',
            subject: { type: 'customer', id: created.id, label: created.fullName },
            after: AuditService.pick(created, [...AUDITED]),
          },
          trx
        )
        return created
      })
      return response.created({
        message: 'Customer added',
        data: customerToJson(customer, { canViewDocuments: false }),
      })
    } catch (error) {
      if (error instanceof FieldError) return fail(response, error)
      throw error
    }
  }

  async update(ctx: HttpContext) {
    const { params, request, response } = ctx
    const customer = await Customer.findOrFail(params.id)
    const payload = await request.validateUsing(updateCustomerValidator)
    try {
      const data = await values(payload, customer.id)
      await db.transaction(async (trx) => {
        customer.useTransaction(trx)
        const before = AuditService.pick(customer, [...AUDITED])
        customer.merge(data)
        await customer.save()
        await CustomerStatusService.refresh(customer, trx)
        await AuditService.record(
          ctx,
          {
            action: 'customer.updated',
            subject: { type: 'customer', id: customer.id, label: customer.fullName },
            before,
            after: AuditService.pick(customer, [...AUDITED]),
          },
          trx
        )
      })
      return response.ok({
        message: 'Customer updated',
        data: customerToJson(customer, { canViewDocuments: false }),
      })
    } catch (error) {
      if (error instanceof FieldError) return fail(response, error)
      throw error
    }
  }

  /** Customers are archived, never deleted - their bookings and history stay. */
  async destroy(ctx: HttpContext) {
    const customer = await Customer.findOrFail(ctx.params.id)
    await db.transaction(async (trx) => {
      customer.useTransaction(trx)
      customer.archivedAt = DateTime.now()
      await customer.save()
      await AuditService.record(
        ctx,
        {
          action: 'customer.archived',
          subject: { type: 'customer', id: customer.id, label: customer.fullName },
        },
        trx
      )
    })
    return ctx.response.ok({ message: 'Customer archived' })
  }
}
