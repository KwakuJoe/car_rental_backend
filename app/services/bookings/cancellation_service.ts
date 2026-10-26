import { DateTime } from 'luxon'
import type Booking from '#models/booking'
import SettingsService from '#services/settings/settings_service'

export type CancellationTier = 'free' | 'fee_only' | 'late'

export type CancellationPolicy = {
  tier: CancellationTier
  hoursBeforePickup: number
  /** What the business keeps */
  feeAmount: number
  paidAmount: number
  /** Paid minus the fee, never below zero (refunds are processed in Phase 5) */
  refundableAmount: number
  explanation: string
}

/**
 * Cancellation & no-show policy (M3.6), all tiers from settings. Defaults:
 * 72h+ before pickup free; 24-72h keep the reservation fee; under 24h or a
 * no-show keep the fee plus one day of rental. Staff see this before they
 * confirm a cancellation.
 */
export default class CancellationService {
  static async evaluate(
    booking: Booking,
    options: { noShow?: boolean; now?: DateTime } = {}
  ): Promise<CancellationPolicy> {
    const now = options.now ?? DateTime.now()
    const [freeHours, feeOnlyHours, lateDays] = await Promise.all([
      SettingsService.get('cancellation.full_refund_hours'),
      SettingsService.get('cancellation.fee_only_hours'),
      SettingsService.get('cancellation.late_charge_days'),
    ])
    const hoursBeforePickup = Math.floor(booking.pickupAt.diff(now, 'hours').hours)
    const reservationFee = booking.reservationFeeAmount ?? 0
    const snapshot = booking.priceSnapshot
    const rental = snapshot.lines.find((line) => line.type === 'rental')?.amount ?? 0
    const dayAmount = Math.round(rental / Math.max(1, snapshot.rentalDays))

    let tier: CancellationTier
    let fee: number
    let explanation: string
    if (options.noShow || hoursBeforePickup < feeOnlyHours) {
      tier = 'late'
      fee = reservationFee + dayAmount * lateDays
      explanation = options.noShow
        ? `No-show: the reservation fee and ${lateDays} ${lateDays === 1 ? 'day' : 'days'} of rental are kept.`
        : `Less than ${feeOnlyHours} hours before pickup: the reservation fee and ${lateDays} ${lateDays === 1 ? 'day' : 'days'} of rental are kept.`
    } else if (hoursBeforePickup < freeHours) {
      tier = 'fee_only'
      fee = reservationFee
      explanation = `Less than ${freeHours} hours before pickup: the reservation fee is kept.`
    } else {
      tier = 'free'
      fee = 0
      explanation = `${freeHours} hours or more before pickup: free cancellation.`
    }
    fee = Math.min(fee, booking.totalAmount)

    return {
      tier,
      hoursBeforePickup,
      feeAmount: fee,
      paidAmount: booking.paidAmount,
      refundableAmount: Math.max(0, booking.paidAmount - fee),
      explanation,
    }
  }
}
