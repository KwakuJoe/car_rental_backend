import vine from '@vinejs/vine'
import { CHARGE_CODES } from '#models/booking_charge'
import { DAMAGE_SEVERITIES, DAMAGE_TYPES, DAMAGE_ZONES } from '#models/car_damage'
import { CHECK_RESULTS, PHOTO_ANGLES } from '#models/inspection'

export const saveInspectionValidator = vine.create({
  odometerKm: vine.number().withoutDecimals().min(0).max(9_999_999).nullable().optional(),
  fuelLevel: vine.number().withoutDecimals().min(0).max(8).nullable().optional(),
  checklist: vine
    .array(
      vine.object({
        itemId: vine.string(),
        name: vine.string().trim().maxLength(80),
        result: vine.enum(CHECK_RESULTS),
        note: vine.string().trim().maxLength(300).nullable().optional(),
      })
    )
    .optional(),
  exterior: vine
    .enum(['clean', 'dirty'] as const)
    .nullable()
    .optional(),
  interior: vine
    .enum(['clean', 'dirty', 'smoking'] as const)
    .nullable()
    .optional(),
  notes: vine.string().trim().maxLength(2000).nullable().optional(),
  // One angle per save: set it (fileId) or remove it (null)
  photo: vine
    .object({ angle: vine.enum(PHOTO_ANGLES), fileId: vine.string().nullable() })
    .optional(),
  paymentConfirmed: vine.boolean().optional(),
  paymentOverrideReason: vine.string().trim().maxLength(300).nullable().optional(),
})

export const damageValidator = vine.create({
  zone: vine.enum(DAMAGE_ZONES),
  x: vine.number().min(0).max(100),
  y: vine.number().min(0).max(100),
  type: vine.enum(DAMAGE_TYPES),
  severity: vine.enum(DAMAGE_SEVERITIES),
  note: vine.string().trim().maxLength(300).nullable().optional(),
  photoFileId: vine.string().nullable().optional(),
})

export const completeCheckOutValidator = vine.create({
  // Optional while signature uploads are switched off: the typed name records acceptance
  signatureFileId: vine.string().nullable().optional(),
  signedName: vine.string().trim().minLength(2).maxLength(150),
})

export const termsValidator = vine.create({
  body: vine.string().trim().minLength(50).maxLength(50_000),
})

export const checklistValidator = vine.create({
  items: vine
    .array(
      vine.object({
        id: vine.string().optional(),
        name: vine.string().trim().minLength(2).maxLength(80),
        active: vine.boolean(),
      })
    )
    .minLength(1)
    .maxLength(40),
})

export const completeCheckInValidator = vine.create({
  charges: vine
    .array(
      vine.object({
        code: vine.enum(CHARGE_CODES),
        label: vine.string().trim().minLength(2).maxLength(200),
        quantity: vine.number().min(0).max(100_000),
        unitAmount: vine.number().withoutDecimals().min(0).max(100_000_00),
        amount: vine.number().withoutDecimals().min(0).max(1_000_000_00),
        taxable: vine.boolean(),
        waived: vine.boolean(),
        waiveReason: vine.string().trim().maxLength(500).nullable().optional(),
      })
    )
    .maxLength(50),
  overrideReason: vine.string().trim().maxLength(500).nullable().optional(),
})
