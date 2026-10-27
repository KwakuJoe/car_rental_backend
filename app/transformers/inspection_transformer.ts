import type CarDamage from '#models/car_damage'
import type Inspection from '#models/inspection'

export function inspectionToJson(inspection: Inspection) {
  return {
    id: inspection.id,
    type: inspection.type,
    status: inspection.status,
    odometerKm: inspection.odometerKm,
    fuelLevel: inspection.fuelLevel,
    checklist: inspection.checklist,
    exterior: inspection.exterior,
    interior: inspection.interior,
    notes: inspection.notes,
    paymentConfirmed: Boolean(inspection.paymentConfirmed),
    paymentOverrideReason: inspection.paymentOverrideReason,
    photos: (inspection.$preloaded.photos ? inspection.photos : []).map((photo) => ({
      id: photo.id,
      angle: photo.angle,
      fileId: photo.fileId,
      url: photo.file?.url ?? null,
    })),
    // The signature image is private: fetch it through GET /files/:id/url
    signatureFileId: inspection.signatureFileId,
    signedName: inspection.signedName,
    signedAt: inspection.signedAt?.toISO() ?? null,
    agreementHash: inspection.agreementHash,
    completedAt: inspection.completedAt?.toISO() ?? null,
  }
}

export function damageToJson(damage: CarDamage, currentInspectionId?: string) {
  return {
    id: damage.id,
    zone: damage.zone,
    x: damage.x,
    y: damage.y,
    type: damage.type,
    severity: damage.severity,
    note: damage.note,
    photoUrl: damage.$preloaded.photo ? (damage.photo?.url ?? null) : null,
    // Already on the car before this handover - the customer signs over it
    preexisting: damage.reportedInspectionId !== currentInspectionId,
    createdAt: damage.createdAt.toISO(),
  }
}
