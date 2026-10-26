/**
 * Normalise a phone number to E.164 (+233241234567). Accepts Ghanaian local
 * numbers (0241234567, 024 123 4567), 233-prefixed numbers and international
 * numbers starting with +. Returns null when it isn't a valid number - so
 * duplicate and blacklist checks always compare like with like.
 */
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null
  const trimmed = input.trim()
  let digits = trimmed.replace(/[^\d]/g, '')
  if (trimmed.startsWith('+')) {
    // international, keep as is
  } else if (digits.startsWith('00')) {
    digits = digits.slice(2)
  } else if (digits.length === 10 && digits.startsWith('0')) {
    digits = `233${digits.slice(1)}` // Ghana local
  } else if (digits.length === 9) {
    digits = `233${digits}` // Ghana local without the 0
  }
  const e164 = `+${digits}`
  return /^\+[1-9]\d{7,14}$/.test(e164) ? e164 : null
}

/** "GHA 123456789 1" -> "GHA-123456789-1"; other numbers: upper case, no spaces. */
export function normalizeDocumentNumber(type: string, input: string): string {
  const compact = input.trim().toUpperCase().replace(/\s+/g, '')
  if (type === 'ghana_card') {
    const match = compact.replace(/-/g, '').match(/^GHA(\d{9})(\d)$/)
    if (match) return `GHA-${match[1]}-${match[2]}`
  }
  return compact
}
