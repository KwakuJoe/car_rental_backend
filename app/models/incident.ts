import { IncidentSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Booking from '#models/booking'
import BookingCharge from '#models/booking_charge'
import Car from '#models/car'
import User from '#models/user'
import { withUlid } from '#models/mixins/with_ulid'

export const INCIDENT_TYPES = ['accident', 'theft', 'breakdown', 'police_stop', 'other'] as const
export type IncidentType = (typeof INCIDENT_TYPES)[number]
export const CLAIM_STATUSES = ['not_filed', 'filed', 'approved', 'rejected', 'paid'] as const
export type ClaimStatus = (typeof CLAIM_STATUSES)[number]

export type ThirdParty = {
  name: string | null
  phone: string | null
  vehicleReg: string | null
  insurer: string | null
  policyNo: string | null
}

const json = (value: unknown) =>
  value === null || value === undefined ? null : JSON.stringify(value)

/** An accident, theft, breakdown, police stop... with a car (INC-). */
export default class Incident extends compose(IncidentSchema, withUlid) {
  declare type: IncidentType
  declare status: 'open' | 'closed'
  declare claimStatus: ClaimStatus

  @column({ prepare: json })
  declare thirdParty: ThirdParty | null

  @column({ prepare: (value: unknown) => JSON.stringify(value ?? []) })
  declare photoFileIds: string[]

  @belongsTo(() => Car)
  declare car: BelongsTo<typeof Car>

  @belongsTo(() => Booking)
  declare booking: BelongsTo<typeof Booking>

  @belongsTo(() => BookingCharge, { foreignKey: 'chargeId' })
  declare charge: BelongsTo<typeof BookingCharge>

  @belongsTo(() => User, { foreignKey: 'createdBy' })
  declare creator: BelongsTo<typeof User>
}
