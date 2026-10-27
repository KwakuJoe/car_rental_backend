import { createRequire } from 'node:module'
import PDFDocument from 'pdfkit'

const require = createRequire(import.meta.url)
// Manrope, the dashboard's typeface. WOFF (not WOFF2: fontkit can't subset those).
const font = (weight: number) =>
  require.resolve(`@fontsource/manrope/files/manrope-latin-${weight}-normal.woff`)

export const THEME = {
  brand: '#fb242f',
  brandSoft: '#fff1f2',
  ink: '#111827',
  body: '#374151',
  muted: '#6b7280',
  faint: '#9ca3af',
  line: '#e5e7eb',
  card: '#ffffff',
  tile: '#f7f7f8',
  page: { width: 595.28, height: 841.89 },
  margin: 40,
}

export type Fact = [label: string, value: string | null | undefined]

export type Letterhead = {
  name: string
  details: string[]
  /** PNG/JPEG bytes; when missing a monogram is drawn in its place */
  logo?: Buffer | null
}

const money = (pesewas: number) =>
  `GHS ${(pesewas / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/**
 * The house style for every document we print (agreements, return reports,
 * and later invoices and receipts): Manrope, a brand bar, a letterhead, a
 * light diagonal watermark, cards and tables, numbered footers.
 * Layout is measured before drawing so card backgrounds sit behind content.
 */
export class PdfDocument {
  readonly doc: PDFKit.PDFDocument
  readonly left = THEME.margin
  readonly width = THEME.page.width - THEME.margin * 2
  private watermark: string

  constructor(
    private options: { title: string; reference: string; letterhead: Letterhead; footer: string }
  ) {
    this.doc = new PDFDocument({
      size: 'A4',
      margins: { top: 40, bottom: 56, left: THEME.margin, right: THEME.margin },
      bufferPages: true,
      info: { Title: `${options.title} ${options.reference}`, Author: options.letterhead.name },
    })
    this.doc.registerFont('regular', font(400))
    this.doc.registerFont('medium', font(500))
    this.doc.registerFont('semibold', font(600))
    this.doc.registerFont('bold', font(700))
    this.doc.registerFont('heavy', font(800))
    this.watermark = options.letterhead.name.toUpperCase()
    this.decoratePage()
    this.doc.on('pageAdded', () => this.decoratePage())
  }

  get y() {
    return this.doc.y
  }
  set y(value: number) {
    this.doc.y = value
  }

  /** The brand bar along the top of every page. */
  private decoratePage() {
    const { doc } = this
    doc.save()
    doc.rect(0, 0, THEME.page.width, 5).fill(THEME.brand)
    doc.restore()
    doc.x = this.left
    doc.y = 40
  }

  /** The business name, large, diagonal and very light - over the content, so cards don't hide it. */
  private stampWatermark() {
    const { doc } = this
    const { width, height } = THEME.page
    doc.save()
    doc.fillOpacity(0.045)
    doc.rotate(-32, { origin: [width / 2, height / 2] })
    doc
      .font('heavy')
      .fontSize(this.watermark.length > 14 ? 58 : 76)
      .fillColor(THEME.ink)
      .text(this.watermark, -60, height / 2 - 40, {
        width: width + 120,
        align: 'center',
        lineBreak: false,
      })
    doc.restore()
  }

  /** Starts a new page when the next block won't fit. */
  ensure(height: number) {
    if (this.doc.y + height > THEME.page.height - 64) this.doc.addPage()
  }

  /** Letterhead on the left, title / reference / status on the right. */
  header(status: string | null) {
    const { doc } = this
    const { letterhead } = this.options
    const top = 30
    // Mark: the logo at its own shape (up to 130 x 44), or a monogram in the brand colour
    const markWidth = (letterhead.logo && this.logo(letterhead.logo, top)) || this.monogram(top)
    const textX = this.left + markWidth + 12
    // The letterhead text stays clear of the title on the right
    const textWidth = 316 - markWidth
    doc
      .font('bold')
      .fontSize(14)
      .fillColor(THEME.ink)
      .text(letterhead.name, textX, top + 2, { width: textWidth })
    doc
      .font('regular')
      .fontSize(7.5)
      .fillColor(THEME.muted)
      .text(letterhead.details.filter(Boolean).join('\n'), textX, doc.y + 2, {
        width: textWidth,
        lineGap: 1,
      })
    const leftBottom = doc.y

    const right = this.left + this.width
    doc
      .font('heavy')
      .fontSize(17)
      .fillColor(THEME.ink)
      .text(this.options.title, this.left, top, { width: this.width, align: 'right' })
    doc
      .font('semibold')
      .fontSize(10)
      .fillColor(THEME.brand)
      .text(this.options.reference, this.left, doc.y + 1, { width: this.width, align: 'right' })
    if (status) {
      doc.font('semibold').fontSize(7.5)
      const pill = doc.widthOfString(status) + 16
      const y = doc.y + 6
      doc.roundedRect(right - pill, y, pill, 16, 8).fill(THEME.brandSoft)
      doc
        .fillColor(THEME.brand)
        .text(status, right - pill, y + 4.5, { width: pill, align: 'center' })
    }
    doc.y = Math.max(leftBottom, doc.y) + 18
  }

  /** Draws the logo scaled into 130 x 44 and returns its width, or 0 if it can't be read. */
  private logo(image: Buffer, top: number) {
    try {
      // openImage is public in PDFKit but missing from its typings
      const opener = this.doc as unknown as {
        openImage(source: Buffer): { width: number; height: number }
      }
      const { width, height } = opener.openImage(image)
      const scale = Math.min(130 / width, 44 / height)
      const drawn = { width: width * scale, height: height * scale }
      this.doc.image(image, this.left, top + (44 - drawn.height) / 2, drawn)
      return drawn.width
    } catch {
      return 0 // not a PNG / JPEG PDFKit can read
    }
  }

  private monogram(top: number) {
    const initials = this.options.letterhead.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase())
      .join('')
    this.doc.roundedRect(this.left, top, 44, 44, 10).fill(THEME.brand)
    this.doc
      .font('heavy')
      .fontSize(17)
      .fillColor('#ffffff')
      .text(initials, this.left, top + 12.5, { width: 44, align: 'center' })
    return 44
  }

  /** The at-a-glance strip: equal tiles with a label, a main line and a hint. */
  summary(tiles: { label: string; value: string; hint?: string; strong?: boolean }[]) {
    const { doc } = this
    const gap = 8
    const tileWidth = (this.width - gap * (tiles.length - 1)) / tiles.length
    const inner = tileWidth - 20
    const heights = tiles.map((tile) => {
      doc.font('bold').fontSize(tile.strong ? 14 : 10.5)
      const value = doc.heightOfString(tile.value, { width: inner })
      doc.font('regular').fontSize(7.5)
      const hint = tile.hint ? doc.heightOfString(tile.hint, { width: inner }) + 2 : 0
      return 12 + 12 + value + hint + 12
    })
    const height = Math.max(...heights)
    this.ensure(height + 10)
    const top = doc.y
    tiles.forEach((tile, index) => {
      const x = this.left + index * (tileWidth + gap)
      doc.roundedRect(x, top, tileWidth, height, 8).fill(tile.strong ? THEME.brandSoft : THEME.tile)
      doc
        .font('semibold')
        .fontSize(6.5)
        .fillColor(tile.strong ? THEME.brand : THEME.muted)
        .text(tile.label.toUpperCase(), x + 10, top + 11, { width: inner, characterSpacing: 0.6 })
      doc
        .font('bold')
        .fontSize(tile.strong ? 14 : 10.5)
        .fillColor(THEME.ink)
        .text(tile.value, x + 10, doc.y + 3, { width: inner })
      if (tile.hint) {
        doc
          .font('regular')
          .fontSize(7.5)
          .fillColor(THEME.muted)
          .text(tile.hint, x + 10, doc.y + 2, { width: inner })
      }
    })
    doc.y = top + height + 14
  }

  /** Section title with a short brand accent. */
  sectionTitle(title: string, x = this.left, width = this.width) {
    const { doc } = this
    const y = doc.y
    doc.rect(x, y + 1.5, 3, 9).fill(THEME.brand)
    doc
      .font('bold')
      .fontSize(8.5)
      .fillColor(THEME.ink)
      .text(title.toUpperCase(), x + 9, y, { width: width - 9, characterSpacing: 0.7 })
    doc.y = y + 18
  }

  /** Height of a two-column label/value grid at a given width. */
  private factsHeight(facts: Fact[], width: number, columns: number) {
    const { doc } = this
    const column = (width - (columns - 1) * 14) / columns
    let height = 0
    for (let index = 0; index < facts.length; index += columns) {
      const row = facts.slice(index, index + columns)
      const tallest = Math.max(
        ...row.map(([, value]) => {
          doc.font('medium').fontSize(9)
          return doc.heightOfString(value || '-', { width: column })
        })
      )
      height += 10 + tallest + 9
    }
    return height
  }

  private drawFacts(facts: Fact[], x: number, y: number, width: number, columns: number) {
    const { doc } = this
    const column = (width - (columns - 1) * 14) / columns
    let top = y
    for (let index = 0; index < facts.length; index += columns) {
      const row = facts.slice(index, index + columns)
      let bottom = top
      row.forEach(([label, value], position) => {
        const cx = x + position * (column + 14)
        doc
          .font('semibold')
          .fontSize(6.5)
          .fillColor(THEME.faint)
          .text(label.toUpperCase(), cx, top, { width: column, characterSpacing: 0.5 })
        doc
          .font('medium')
          .fontSize(9)
          .fillColor(value ? THEME.ink : THEME.faint)
          .text(value || '-', cx, top + 10, { width: column })
        bottom = Math.max(bottom, doc.y)
      })
      top = bottom + 9
    }
    return top
  }

  /** A bordered card holding a facts grid, at full width or as one of two columns. */
  factsCard(title: string, facts: Fact[], columns = 2) {
    const padding = 14
    const height = 18 + this.factsHeight(facts, this.width - padding * 2, columns) + padding * 2 - 9
    this.ensure(height + 12)
    const top = this.doc.y
    this.cardBox(this.left, top, this.width, height)
    this.doc.y = top + padding
    this.sectionTitle(title, this.left + padding, this.width - padding * 2)
    this.drawFacts(facts, this.left + padding, this.doc.y, this.width - padding * 2, columns)
    this.doc.y = top + height + 12
  }

  /** Two cards side by side (e.g. customer | vehicle), equal height. */
  factsCardPair(a: { title: string; facts: Fact[] }, b: { title: string; facts: Fact[] }) {
    const padding = 14
    const gap = 12
    const half = (this.width - gap) / 2
    const inner = half - padding * 2
    const height =
      18 +
      Math.max(this.factsHeight(a.facts, inner, 2), this.factsHeight(b.facts, inner, 2)) +
      padding * 2 -
      9
    this.ensure(height + 12)
    const top = this.doc.y
    for (const [index, card] of [a, b].entries()) {
      const x = this.left + index * (half + gap)
      this.cardBox(x, top, half, height)
      this.doc.y = top + padding
      this.sectionTitle(card.title, x + padding, inner)
      this.drawFacts(card.facts, x + padding, this.doc.y, inner, 2)
    }
    this.doc.y = top + height + 12
  }

  cardBox(x: number, y: number, width: number, height: number) {
    this.doc
      .roundedRect(x, y, width, height, 9)
      .lineWidth(0.8)
      .fillAndStroke(THEME.card, THEME.line)
  }

  /**
   * A charges table: description / amount rows, then totals; the last total
   * is highlighted. Rows can be muted (waived) with a note under them.
   */
  table(
    title: string,
    rows: { label: string; amount: string; note?: string; muted?: boolean }[],
    totals: { label: string; amount: string; muted?: boolean }[],
    chips: string[] = []
  ) {
    const { doc } = this
    const padding = 14
    const inner = this.width - padding * 2
    const amountWidth = 110
    const measureRow = (row: { label: string; note?: string }) => {
      doc.font('medium').fontSize(9)
      const label = doc.heightOfString(row.label, { width: inner - amountWidth - 10 })
      doc.font('regular').fontSize(7.5)
      return (
        label +
        (row.note ? doc.heightOfString(row.note, { width: inner - amountWidth - 10 }) + 2 : 0) +
        12
      )
    }
    doc.font('medium').fontSize(7.5)
    const chipsHeight = chips.length ? 30 : 0
    const height =
      18 +
      16 +
      rows.reduce((sum, row) => sum + measureRow(row), 0) +
      totals.length * 18 +
      10 +
      chipsHeight +
      padding * 2 -
      4
    this.ensure(Math.min(height, 400) + 12)
    const top = doc.y
    this.cardBox(this.left, top, this.width, height)
    doc.y = top + padding
    this.sectionTitle(title, this.left + padding, inner)
    // Column heads
    const x = this.left + padding
    doc.font('semibold').fontSize(6.5).fillColor(THEME.faint)
    doc.text('DESCRIPTION', x, doc.y, { width: 200, characterSpacing: 0.5 })
    doc.text('AMOUNT', x + inner - amountWidth, doc.y - 8.5, {
      width: amountWidth,
      align: 'right',
      characterSpacing: 0.5,
    })
    let y = doc.y + 5
    for (const row of rows) {
      doc
        .moveTo(x, y)
        .lineTo(x + inner, y)
        .lineWidth(0.5)
        .strokeColor(THEME.line)
        .stroke()
      y += 6
      doc
        .font('medium')
        .fontSize(9)
        .fillColor(row.muted ? THEME.faint : THEME.ink)
        .text(row.label, x, y, { width: inner - amountWidth - 10 })
      const labelBottom = doc.y
      if (row.note) {
        doc
          .font('regular')
          .fontSize(7.5)
          .fillColor(THEME.muted)
          .text(row.note, x, labelBottom + 2, { width: inner - amountWidth - 10 })
      }
      const rowBottom = doc.y
      doc
        .font('semibold')
        .fontSize(9)
        .fillColor(row.muted ? THEME.faint : THEME.ink)
        .text(row.amount, x + inner - amountWidth, y, { width: amountWidth, align: 'right' })
      y = Math.max(rowBottom, labelBottom) + 6
    }
    doc
      .moveTo(x, y)
      .lineTo(x + inner, y)
      .lineWidth(0.8)
      .strokeColor(THEME.line)
      .stroke()
    y += 6
    totals.forEach((total, index) => {
      const last = index === totals.length - 1
      if (last) {
        doc.roundedRect(x - 6, y - 3, inner + 12, 20, 5).fill(THEME.brandSoft)
      }
      doc
        .font(last ? 'heavy' : 'medium')
        .fontSize(last ? 10.5 : 8.5)
        .fillColor(last ? THEME.ink : total.muted ? THEME.muted : THEME.body)
        .text(total.label, x, y + (last ? 1 : 0), { width: inner - amountWidth })
      doc.text(total.amount, x + inner - amountWidth, y + (last ? 1 : 0), {
        width: amountWidth,
        align: 'right',
      })
      y += last ? 22 : 16
    })
    if (chips.length) {
      y += 8
      let cx = x
      doc.font('medium').fontSize(7.5)
      for (const chip of chips) {
        const w = doc.widthOfString(chip) + 16
        if (cx + w > x + inner) {
          cx = x
          y += 20
        }
        doc.roundedRect(cx, y, w, 16, 8).fill(THEME.tile)
        doc.fillColor(THEME.body).text(chip, cx, y + 4.2, { width: w, align: 'center' })
        cx += w + 6
      }
    }
    doc.y = top + height + 12
  }

  /** A fuel gauge in eighths (filled segments) at x/y. */
  fuelGauge(eighths: number | null, x: number, y: number, width: number) {
    const gap = 2
    const segment = (width - gap * 7) / 8
    for (let index = 0; index < 8; index++) {
      this.doc
        .roundedRect(x + index * (segment + gap), y, segment, 9, 2)
        .fill(eighths !== null && index < eighths ? THEME.brand : THEME.line)
    }
    this.doc
      .font('regular')
      .fontSize(6.5)
      .fillColor(THEME.faint)
      .text('E', x, y + 12, { width: 10 })
      .text('F', x + width - 10, y + 12, { width: 10, align: 'right' })
  }

  /**
   * Long text (terms) in two balanced columns. Paragraphs are never split:
   * they are measured, divided so both columns end level, and carried on to
   * the next page when they don't fit.
   */
  columns(text: string) {
    const { doc } = this
    const gap = 22
    const spacing = 4
    const columnWidth = (this.width - gap) / 2
    const options = { width: columnWidth, lineGap: 1.6 }
    const limit = THEME.page.height - 64
    doc.font('regular').fontSize(7.6)
    let paragraphs = text
      .split(/\n+/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean)
      .map((paragraph) => ({ text: paragraph, height: doc.heightOfString(paragraph, options) }))
    const stack = (list: typeof paragraphs) =>
      list.reduce((sum, paragraph, index) => sum + paragraph.height + (index ? spacing : 0), 0)
    const draw = (list: typeof paragraphs, x: number, top: number) => {
      let y = top
      for (const paragraph of list) {
        doc.font('regular').fontSize(7.6).fillColor(THEME.body).text(paragraph.text, x, y, options)
        y += paragraph.height + spacing
      }
    }

    while (paragraphs.length) {
      if (limit - doc.y < 60) doc.addPage()
      const room = limit - doc.y
      // The split where the taller column is shortest
      let split = paragraphs.length
      let best = Number.POSITIVE_INFINITY
      for (let index = 1; index <= paragraphs.length; index++) {
        const tallest = Math.max(stack(paragraphs.slice(0, index)), stack(paragraphs.slice(index)))
        if (tallest < best) {
          best = tallest
          split = index
        }
      }
      let left = paragraphs.slice(0, split)
      let right = paragraphs.slice(split)
      if (best > room) {
        // Doesn't fit: fill this page's left, then right column, then carry on
        const fill = (from: number) => {
          let end = from
          while (end < paragraphs.length && stack(paragraphs.slice(from, end + 1)) <= room) end++
          return Math.max(end, from + 1)
        }
        const leftEnd = fill(0)
        const rightEnd = leftEnd < paragraphs.length ? fill(leftEnd) : leftEnd
        left = paragraphs.slice(0, leftEnd)
        right = paragraphs.slice(leftEnd, rightEnd)
      }
      const top = doc.y
      draw(left, this.left, top)
      draw(right, this.left + columnWidth + gap, top)
      paragraphs = paragraphs.slice(left.length + right.length)
      doc.y = top + Math.max(stack(left), stack(right)) + 10
      if (paragraphs.length) doc.addPage()
    }
  }

  /** Page numbers and the contact line, once every page exists. */
  finish(): Promise<Buffer> {
    const { doc } = this
    const range = doc.bufferedPageRange()
    for (let page = range.start; page < range.start + range.count; page++) {
      doc.switchToPage(page)
      // Writing inside the bottom margin would otherwise start a new page
      const margin = doc.page.margins.bottom
      doc.page.margins.bottom = 0
      this.stampWatermark()
      const y = THEME.page.height - 38
      doc
        .moveTo(this.left, y - 8)
        .lineTo(this.left + this.width, y - 8)
        .lineWidth(0.5)
        .strokeColor(THEME.line)
        .stroke()
      doc.font('regular').fontSize(7).fillColor(THEME.faint)
      doc.text(this.options.footer, this.left, y, { width: this.width * 0.7, lineBreak: false })
      doc.text(`${this.options.reference}  ·  Page ${page + 1} of ${range.count}`, this.left, y, {
        width: this.width,
        align: 'right',
        lineBreak: false,
      })
      doc.page.margins.bottom = margin
    }
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      doc.on('data', (chunk: Buffer) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)
      doc.end()
    })
  }

  static money = money
}
