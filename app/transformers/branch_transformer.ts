import { BaseTransformer } from '@adonisjs/core/transformers'
import type Branch from '#models/branch'

/** Postgres NUMERIC comes back as a padded string ("5.6052000") - the API returns numbers. */
const toNumber = (value: string | null) => (value === null ? null : Number(value))

export default class BranchTransformer extends BaseTransformer<Branch> {
  toObject() {
    return {
      ...this.pick(this.resource, [
        'id',
        'name',
        'code',
        'isMain',
        'isActive',
        'email',
        'phone',
        'address',
        'digitalAddress',
        'city',
        'region',
        'createdAt',
        'updatedAt',
      ]),
      latitude: toNumber(this.resource.latitude),
      longitude: toNumber(this.resource.longitude),
    }
  }
}
