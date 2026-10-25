import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import Setting from '#models/setting'
import {
  isSettingKey,
  settingDefinitions,
  type SettingDefinition,
  type SettingOption,
  type SettingKey,
  type SettingValue,
} from '#services/settings/definitions'

export type SettingView = {
  key: SettingKey
  group: string
  type: SettingDefinition['type']
  label: string
  description: string
  value: unknown
  default: unknown
  isDefault: boolean
  min?: number
  max?: number
  unit?: string
  options?: readonly SettingOption[]
}

/** Returns an error message, or null when the value is valid for the definition. */
function validate(definition: SettingDefinition, value: unknown): string | null {
  switch (definition.type) {
    case 'integer':
    case 'money': {
      if (typeof value !== 'number' || !Number.isInteger(value)) {
        return definition.type === 'money'
          ? 'Must be a whole number of pesewas'
          : 'Must be a whole number'
      }
      if (value < definition.min || value > definition.max) {
        return `Must be between ${definition.min} and ${definition.max}`
      }
      return null
    }
    case 'boolean':
      return typeof value === 'boolean' ? null : 'Must be true or false'
    case 'enum':
      return definition.options.some((option) => option.value === value)
        ? null
        : `Must be one of: ${definition.options.map((option) => option.value).join(', ')}`
  }
}

/**
 * Read/write business rules. Every module reads policy numbers through
 * SettingsService.get() - never hardcode them.
 */
export default class SettingsService {
  static async get<K extends SettingKey>(
    key: K,
    trx?: TransactionClientContract
  ): Promise<SettingValue<K>> {
    const stored = await Setting.query(trx ? { client: trx } : undefined)
      .where('key', key)
      .whereNull('branch_id')
      .first()
    return (stored ? stored.value : settingDefinitions[key].default) as SettingValue<K>
  }

  /** Every rule with its current value, in definition order. */
  static async all(): Promise<SettingView[]> {
    const rows = await Setting.query().whereNull('branch_id')
    const stored = new Map(rows.map((row) => [row.key, row.value]))
    return (Object.entries(settingDefinitions) as [SettingKey, SettingDefinition][]).map(
      ([key, definition]) => {
        const value = stored.has(key) ? stored.get(key) : definition.default
        return {
          key,
          group: definition.group,
          type: definition.type,
          label: definition.label,
          description: definition.description,
          value,
          default: definition.default,
          isDefault: !stored.has(key),
          ...('min' in definition ? { min: definition.min, max: definition.max } : {}),
          ...('unit' in definition ? { unit: definition.unit } : {}),
          ...('options' in definition ? { options: definition.options } : {}),
        }
      }
    )
  }

  /** Field errors keyed `values.<key>`, empty when everything is valid. */
  static validate(values: Record<string, unknown>) {
    const errors: { field: string; rule: string; message: string }[] = []
    for (const [key, value] of Object.entries(values)) {
      if (!isSettingKey(key)) {
        errors.push({ field: `values.${key}`, rule: 'unknownSetting', message: 'Unknown setting' })
        continue
      }
      const message = validate(settingDefinitions[key], value)
      if (message) errors.push({ field: `values.${key}`, rule: 'setting', message })
    }
    return errors
  }

  /**
   * Saves validated values. A value equal to the default removes the
   * override. Returns { before, after } of what actually changed.
   */
  static async update(
    values: Record<string, unknown>,
    userId: string | null,
    trx: TransactionClientContract
  ) {
    const before: Record<string, unknown> = {}
    const after: Record<string, unknown> = {}

    for (const [rawKey, value] of Object.entries(values)) {
      const key = rawKey as SettingKey
      const definition = settingDefinitions[key]
      const existing = await Setting.query({ client: trx })
        .where('key', key)
        .whereNull('branch_id')
        .first()
      const current = existing ? existing.value : definition.default
      if (JSON.stringify(current) === JSON.stringify(value)) continue

      before[key] = current
      after[key] = value

      if (JSON.stringify(value) === JSON.stringify(definition.default)) {
        await existing?.useTransaction(trx).delete()
      } else if (existing) {
        existing.useTransaction(trx)
        existing.merge({ value, updatedBy: userId })
        await existing.save()
      } else {
        await Setting.create({ key, value, branchId: null, updatedBy: userId }, { client: trx })
      }
    }

    return { before, after }
  }
}
