import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Extra from '#models/extra'
import ProtectionPlan from '#models/protection_plan'
import DeliveryZone from '#models/delivery_zone'
import Fee from '#models/fee'
import {
  exampleDeliveryZones,
  exampleExtras,
  exampleProtectionPlans,
  standardFees,
} from '#database/seed_data/pricing_catalog_data'

/**
 * Safe to re-run: standard fees are added only if their code is missing,
 * and the examples only into empty tables. Nothing existing is changed, and
 * everything new starts INACTIVE for the owner to review.
 */
export default class extends BaseSeeder {
  async run() {
    const options = { client: this.client }

    for (const [index, fee] of standardFees.entries()) {
      await Fee.firstOrCreate(
        { code: fee.code },
        { ...fee, taxable: true, isSystem: true, sortOrder: index, active: false },
        options
      )
    }

    const isEmpty = async (model: typeof Extra | typeof ProtectionPlan | typeof DeliveryZone) => {
      const [row] = await model.query(options).count('* as total')
      return Number(row.$extras.total) === 0
    }

    if (await isEmpty(Extra)) {
      await Extra.createMany(
        exampleExtras.map((item, index) => ({
          ...item,
          stock: item.stock ?? null,
          taxable: true,
          availableOnline: true,
          sortOrder: index,
          active: false,
        })),
        options
      )
    }

    if (await isEmpty(ProtectionPlan)) {
      await ProtectionPlan.createMany(
        exampleProtectionPlans.map((plan, index) => ({
          ...plan,
          // The owner picks the default when switching plans on
          isDefault: false,
          taxable: true,
          availableOnline: true,
          sortOrder: index,
          active: false,
        })),
        options
      )
    }

    if (await isEmpty(DeliveryZone)) {
      await DeliveryZone.createMany(
        exampleDeliveryZones.map((zone, index) => ({
          ...zone,
          availableOnline: true,
          sortOrder: index,
          active: false,
        })),
        options
      )
    }
  }
}
