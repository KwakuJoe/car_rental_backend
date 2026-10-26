import { DateTime } from 'luxon'
import type BlacklistEntry from '#models/blacklist_entry'
import type Customer from '#models/customer'
import type CustomerIdentity from '#models/customer_identity'

/**
 * ID numbers and document images are personal data (Act 843). Without
 * customers.view_documents a number is masked ("GHA-•••••••89-1") and file
 * ids are withheld; images are only ever served through GET /files/:id/url,
 * which checks the permission again and audits the view.
 */
export function maskNumber(value: string) {
  if (value.length <= 4) return '•'.repeat(value.length)
  const keepStart = value.startsWith('GHA-') ? 4 : 2
  return (
    value.slice(0, keepStart) +
    '•'.repeat(Math.max(3, value.length - keepStart - 4)) +
    value.slice(-4)
  )
}

export function identityToJson(identity: CustomerIdentity, canViewDocuments: boolean) {
  const today = DateTime.now().toISODate()!
  return {
    id: identity.id,
    type: identity.type,
    number: canViewDocuments ? identity.number : maskNumber(identity.number),
    numberMasked: !canViewDocuments,
    issuingCountry: identity.issuingCountry,
    issuedOn: identity.issuedOn?.toISODate() ?? null,
    expiresOn: identity.expiresOn?.toISODate() ?? null,
    expired: !!identity.expiresOn && identity.expiresOn.toISODate()! < today,
    licenceClass: identity.licenceClass,
    hasFront: !!identity.frontFileId,
    hasBack: !!identity.backFileId,
    // Only with permission - the client then asks /files/:id/url (audited)
    frontFileId: canViewDocuments ? identity.frontFileId : null,
    backFileId: canViewDocuments ? identity.backFileId : null,
    status: identity.status,
    verifiedAt: identity.verifiedAt,
    verifiedByName: identity.verifier?.fullName ?? null,
    rejectionReason: identity.rejectionReason,
    createdAt: identity.createdAt,
  }
}

export function blacklistEntryToJson(entry: BlacklistEntry, canViewDocuments: boolean) {
  const mask = (value: string | null) => (value && !canViewDocuments ? maskNumber(value) : value)
  return {
    id: entry.id,
    customerId: entry.customerId,
    customerName: entry.customer?.fullName ?? null,
    phone: entry.phone,
    ghanaCardNo: mask(entry.ghanaCardNo),
    licenceNo: mask(entry.licenceNo),
    passportNo: mask(entry.passportNo),
    reason: entry.reason,
    details: entry.details,
    severity: entry.severity,
    addedByName: entry.adder?.fullName ?? null,
    createdAt: entry.createdAt,
    liftedAt: entry.liftedAt,
    liftedByName: entry.lifter?.fullName ?? null,
    liftReason: entry.liftReason,
  }
}

export function customerToJson(
  customer: Customer,
  options: { canViewDocuments: boolean; blacklist?: BlacklistEntry[] }
) {
  const dob = customer.dateOfBirth
  return {
    id: customer.id,
    branchId: customer.branchId,
    type: customer.type,
    fullName: customer.fullName,
    phone: customer.phone,
    whatsappPhone: customer.whatsappPhone,
    email: customer.email,
    dateOfBirth: dob?.toISODate() ?? null,
    age: dob ? Math.floor(DateTime.now().diff(dob, 'years').years) : null,
    gender: customer.gender,
    nationality: customer.nationality,
    residentialAddress: customer.residentialAddress,
    digitalAddress: customer.digitalAddress,
    occupation: customer.occupation,
    employer: customer.employer,
    emergencyContactName: customer.emergencyContactName,
    emergencyContactPhone: customer.emergencyContactPhone,
    source: customer.source,
    notes: customer.notes,
    verificationStatus: customer.verificationStatus,
    blacklistSeverity: customer.blacklistSeverity,
    marketingOptIn: Boolean(customer.marketingOptIn),
    archivedAt: customer.archivedAt,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
    identities: customer.$preloaded.identities
      ? customer.identities.map((identity) => identityToJson(identity, options.canViewDocuments))
      : undefined,
    blacklist: options.blacklist?.map((entry) =>
      blacklistEntryToJson(entry, options.canViewDocuments)
    ),
  }
}
