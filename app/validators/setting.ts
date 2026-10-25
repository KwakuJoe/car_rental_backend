import vine from '@vinejs/vine'

/** Shape only - each value is checked against its definition by SettingsService.validate. */
export const updateSettingsValidator = vine.create({
  values: vine.record(vine.any()),
})
