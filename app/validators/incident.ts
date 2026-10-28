import vine from '@vinejs/vine'
import { CLAIM_STATUSES, INCIDENT_TYPES } from '#models/incident'
import { FINE_STATUSES } from '#models/traffic_fine'
import { DAMAGE_RESOLUTIONS } from '#models/car_damage'
import { EXPENSE_PAID_VIA } from '#models/expense'

const optionalText = (max: number) => vine.string().trim().maxLength(max).nullable().optional()
const money = () => vine.number().withoutDecimals().min(0).max(100_000_000)
const page = {
  page: vine.number().min(1).optional(),
  limit: vine.number().min(1).max(100).optional(),
  carId: vine.string().optional(),
  search: vine.string().trim().maxLength(100).optional(),
}

export const matchBookingValidator = vine.create({
  carId: vine.string().optional(),
  at: vine.string().trim().maxLength(40).optional(),
})

export const listIncidentsValidator = vine.create({
  ...page,
  status: vine.enum(['open', 'closed', 'all']).optional(),
  type: vine.enum(INCIDENT_TYPES).optional(),
})

export const incidentValidator = vine.create({
  carId: vine.string(),
  bookingId: vine.string().nullable().optional(),
  type: vine.enum(INCIDENT_TYPES),
  occurredAt: vine.string().trim().maxLength(40),
  location: optionalText(200),
  description: vine.string().trim().minLength(3).maxLength(5000),
  driverName: optionalText(120),
  policeReportNo: optionalText(60),
  thirdParty: vine
    .object({
      name: optionalText(120),
      phone: optionalText(30),
      vehicleReg: optionalText(30),
      insurer: optionalText(120),
      policyNo: optionalText(60),
    })
    .nullable()
    .optional(),
  claimNo: optionalText(60),
  claimStatus: vine.enum(CLAIM_STATUSES).optional(),
  claimAmount: money().nullable().optional(),
  repairEstimateAmount: money().nullable().optional(),
  photoFileIds: vine.array(vine.string()).maxLength(30).optional(),
  notes: optionalText(5000),
})

export const chargeIncidentValidator = vine.create({
  amount: vine.number().withoutDecimals().min(1).max(100_000_000),
  label: optionalText(200),
  overExcessReason: optionalText(300),
})

export const listFinesValidator = vine.create({
  ...page,
  status: vine.enum([...FINE_STATUSES, 'all'] as const).optional(),
})

export const fineValidator = vine.create({
  carId: vine.string(),
  bookingId: vine.string().nullable().optional(),
  offence: vine.string().trim().minLength(2).maxLength(200),
  reference: optionalText(60),
  location: optionalText(200),
  issuedAt: vine.string().trim().maxLength(40),
  amount: vine.number().withoutDecimals().min(1).max(100_000_000),
  adminFeeAmount: money().optional(),
  fileId: vine.string().nullable().optional(),
  notes: optionalText(2000),
})

export const payFineValidator = vine.create({
  paidVia: vine.enum(EXPENSE_PAID_VIA),
  paidAt: vine.string().trim().maxLength(40).optional(),
})

export const reasonValidator = vine.create({
  reason: vine.string().trim().minLength(3).maxLength(300),
})

export const listDamagesValidator = vine.create({
  ...page,
  state: vine.enum(['open', 'resolved', 'all']).optional(),
})

export const resolveDamageValidator = vine.create({
  resolution: vine.enum(DAMAGE_RESOLUTIONS),
  note: optionalText(300),
})
