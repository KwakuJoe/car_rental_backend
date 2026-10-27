/**
 * The branded chrome every email shares (customers and staff): a dark card
 * with the business logo on top, then blocks - heading, paragraphs, an
 * amount box, a details table, a button, a note - then the contact footer.
 * Built from tables and inline styles, so Gmail, Outlook and phone mail
 * apps all render it the same.
 *
 * The logo travels inside the email as an inline attachment referenced as
 * `cid:business-logo` (remote images are blocked by default in most mail
 * apps); MessageService.deliver() attaches it. Without a logo the business
 * name is shown instead.
 */

export const LOGO_CID = 'business-logo'

const C = {
  page: '#0e0f13',
  card: '#17181e',
  inset: '#0e0f13',
  line: '#272832',
  text: '#f2f3f7',
  body: '#b4b6c4',
  muted: '#7d7f8f',
  brand: '#fb242f',
}
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

export const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
  )

export type EmailBrand = {
  name: string
  hasLogo: boolean
  phone?: string | null
  email?: string | null
  address?: string | null
  website?: string | null
}

/* ── Blocks ─────────────────────────────────────────────────────────── */

export const block = {
  /** Small coloured label above the heading ("ACTION NEEDED", "CONFIRMED") */
  eyebrow: (text: string, color = C.brand) =>
    `<p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${color};">${escapeHtml(text)}</p>`,

  heading: (text: string) =>
    `<h1 style="margin:0 0 14px;font-size:24px;line-height:1.25;font-weight:700;color:${C.text};">${escapeHtml(text)}</h1>`,

  paragraph: (text: string) =>
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${C.body};">${escapeHtml(text)}</p>`,

  /** The number that matters, big: "To confirm · GHS 114.00" */
  amount: (label: string, amount: string, note?: string) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 22px;background:${C.inset};border:1px solid ${C.line};border-radius:14px;">
  <tr><td style="padding:20px 22px;">
    <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${C.muted};">${escapeHtml(label)}</p>
    <p style="margin:0;font-size:32px;line-height:1.1;font-weight:800;color:${C.brand};">${escapeHtml(amount)}</p>
    ${note ? `<p style="margin:8px 0 0;font-size:13px;line-height:1.5;color:${C.body};">${escapeHtml(note)}</p>` : ''}
  </td></tr>
</table>`,

  /** Label / value rows in an inset box; an optional title above */
  details: (rows: { label: string; value: string }[], title?: string) => `
${title ? `<p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${C.muted};">${escapeHtml(title)}</p>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;background:${C.inset};border:1px solid ${C.line};border-radius:14px;">
  ${rows
    .map(
      (row, index) => `
  <tr>
    <td style="padding:12px 20px;${index ? `border-top:1px solid ${C.line};` : ''}font-size:13px;color:${C.muted};vertical-align:top;white-space:nowrap;">${escapeHtml(row.label)}</td>
    <td align="right" style="padding:12px 20px;${index ? `border-top:1px solid ${C.line};` : ''}font-size:14px;font-weight:600;color:${C.text};text-align:right;">${escapeHtml(row.value)}</td>
  </tr>`
    )
    .join('')}
</table>`,

  button: (label: string, url: string) => `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 22px;">
  <tr><td style="background:${C.brand};border-radius:12px;">
    <a href="${escapeHtml(url)}" style="display:inline-block;padding:14px 26px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;">${escapeHtml(label)} &rarr;</a>
  </td></tr>
</table>`,

  note: (text: string) =>
    `<p style="margin:0 0 12px;font-size:13px;line-height:1.6;color:${C.muted};">${escapeHtml(text)}</p>`,
}

/* ── Chrome ─────────────────────────────────────────────────────────── */

export function renderEmail(opts: {
  brand: EmailBrand
  /** Inbox preview text */
  preheader: string
  body: string
  /** Why they got it ("You booked with ...", "You're on the alert list ...") */
  reason: string
}) {
  const { brand } = opts
  const logo = brand.hasLogo
    ? `<table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr><td style="background:#ffffff;border-radius:14px;padding:10px 18px;">
        <img src="cid:${LOGO_CID}" alt="${escapeHtml(brand.name)}" height="40" style="display:block;height:40px;width:auto;max-width:200px;border:0;" />
      </td></tr></table>`
    : `<p style="margin:0;font-size:22px;font-weight:800;color:${C.text};">${escapeHtml(brand.name)}</p>`
  const contact = [brand.phone, brand.email]
    .filter(Boolean)
    .map((part) => escapeHtml(part!))
    .join(' &middot; ')

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark light" />
  <title>${escapeHtml(brand.name)}</title>
</head>
<body style="margin:0;padding:0;background:${C.page};font-family:${FONT};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(opts.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page};">
    <tr><td align="center" style="padding:32px 14px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:${C.card};border:1px solid ${C.line};border-radius:20px;overflow:hidden;">
        <tr><td style="height:4px;background:${C.brand};font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td align="center" style="padding:30px 32px 6px;">
          ${brand.hasLogo ? `<p style="margin:0 0 18px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${C.muted};">${escapeHtml(brand.name)}</p>` : ''}
          ${logo}
        </td></tr>
        <tr><td style="padding:26px 32px 10px;">${opts.body}</td></tr>
        <tr><td style="padding:22px 32px 28px;border-top:1px solid ${C.line};text-align:center;">
          ${contact ? `<p style="margin:0 0 6px;font-size:13px;color:${C.body};">${contact}</p>` : ''}
          ${brand.address ? `<p style="margin:0 0 12px;font-size:12px;color:${C.muted};">${escapeHtml(brand.address)}</p>` : ''}
          <p style="margin:0;font-size:11px;line-height:1.6;color:#565868;">${escapeHtml(opts.reason)}</p>
          <p style="margin:8px 0 0;font-size:11px;color:#565868;">&copy; ${new Date().getFullYear()} ${escapeHtml(brand.name)}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

/** The same content as plain text (the email's text part). */
export function renderText(lines: (string | null | undefined | false)[]) {
  return lines.filter(Boolean).join('\n\n')
}
