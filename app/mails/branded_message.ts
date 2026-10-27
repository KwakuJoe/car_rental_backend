import Business from '#models/business'
import env from '#start/env'
import { block, renderEmail, renderText, type EmailBrand } from '#mails/email_layout'

/** "024 123 4567" for Ghana numbers, as people dial them */
export const dial = (phone: string | null | undefined) => {
  const match = phone?.match(/^\+233(\d{2})(\d{3})(\d{4})$/)
  return match ? `0${match[1]}${match[2]}${match[3]}` : (phone ?? '')
}

export const websiteUrl = () =>
  (env.get('WEBSITE_URL') ?? 'http://localhost:3000').replace(/\/$/, '')

/** The business as the emails show it (name, logo, how to reach it). */
export async function loadBrand(): Promise<{ business: Business; brand: EmailBrand }> {
  const business = await Business.query().preload('logo').firstOrFail()
  return {
    business,
    brand: {
      name: business.tradingName || business.name,
      hasLogo: !!business.logo?.url,
      phone: dial(business.phone) || null,
      email: business.email,
      address: [business.address, business.city].filter(Boolean).join(', ') || null,
      website: websiteUrl(),
    },
  }
}

/** One email's content; the same pieces make the HTML and the plain-text version. */
export type EmailContent = {
  subject: string
  preheader: string
  eyebrow?: { text: string; color?: string }
  heading: string
  paragraphs: string[]
  amount?: { label: string; value: string; note?: string }
  details?: { title?: string; rows: { label: string; value: string }[] }
  button?: { label: string; url: string }
  notes?: string[]
}

export function renderContent(brand: EmailBrand, content: EmailContent, reason: string) {
  const body = [
    content.eyebrow ? block.eyebrow(content.eyebrow.text, content.eyebrow.color) : '',
    block.heading(content.heading),
    ...content.paragraphs.map(block.paragraph),
    content.amount
      ? block.amount(content.amount.label, content.amount.value, content.amount.note)
      : '',
    content.details ? block.details(content.details.rows, content.details.title) : '',
    content.button ? block.button(content.button.label, content.button.url) : '',
    ...(content.notes ?? []).map(block.note),
  ].join('')
  const text = renderText([
    content.heading,
    ...content.paragraphs,
    content.amount &&
      `${content.amount.label}: ${content.amount.value}${content.amount.note ? ` - ${content.amount.note}` : ''}`,
    content.details && content.details.rows.map((row) => `${row.label}: ${row.value}`).join('\n'),
    content.button && `${content.button.label}: ${content.button.url}`,
    ...(content.notes ?? []),
    `${brand.name}${brand.phone ? ` · ${brand.phone}` : ''}`,
  ])
  return { html: renderEmail({ brand, preheader: content.preheader, body, reason }), text }
}
