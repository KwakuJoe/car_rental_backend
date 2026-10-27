import { BaseSeeder } from '@adonisjs/lucid/seeders'
import ChecklistItem from '#models/checklist_item'
import TermsVersion from '#models/terms_version'
import { defaultChecklist, draftTerms } from '#database/seed_data/handover_data'

/**
 * Safe to re-run: the checklist is seeded only into an empty table, and the
 * draft terms only when no version exists yet.
 */
export default class extends BaseSeeder {
  async run() {
    const options = { client: this.client }
    const hasItems = await ChecklistItem.query(options).first()
    if (!hasItems) {
      for (const [index, name] of defaultChecklist.entries()) {
        await ChecklistItem.create({ name, sortOrder: index, active: true }, options)
      }
    }
    const hasTerms = await TermsVersion.query(options).first()
    if (!hasTerms) await TermsVersion.create({ version: 1, body: draftTerms }, options)
  }
}
