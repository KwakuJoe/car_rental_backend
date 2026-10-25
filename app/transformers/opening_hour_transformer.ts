import { BaseTransformer } from '@adonisjs/core/transformers'
import type OpeningHour from '#models/opening_hour'

/** Postgres TIME comes back as "08:00:00" - the API speaks "HH:mm". */
const toHourMinute = (value: string | null) => (value ? value.slice(0, 5) : null)

export default class OpeningHourTransformer extends BaseTransformer<OpeningHour> {
  toObject() {
    return {
      weekday: this.resource.weekday,
      isClosed: this.resource.isClosed,
      opensAt: toHourMinute(this.resource.opensAt),
      closesAt: toHourMinute(this.resource.closesAt),
    }
  }
}
