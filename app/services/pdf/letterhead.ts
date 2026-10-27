import type Business from '#models/business'
import { logoBuffer } from '#services/pdf/business_logo'
import type { Letterhead } from '#services/pdf/pdf_document'

/** The business block at the top of every document. Expects `logo` preloaded. */
export async function letterhead(business: Business | null): Promise<Letterhead> {
  return {
    name: business?.tradingName || business?.name || 'Car rental',
    details: [
      [business?.address, business?.city, business?.region].filter(Boolean).join(', '),
      [business?.phone, business?.email].filter(Boolean).join('  ·  '),
      business?.tin
        ? `TIN ${business.tin}${business.vatNumber ? `  ·  VAT ${business.vatNumber}` : ''}`
        : '',
    ].filter(Boolean),
    logo: await logoBuffer(business?.logo),
  }
}

/** Name and contacts along the bottom of every page. */
export const footerLine = (business: Business | null) =>
  [business?.tradingName || business?.name, business?.phone, business?.email]
    .filter(Boolean)
    .join('  ·  ')
