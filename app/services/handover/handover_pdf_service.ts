import PDFDocument from 'pdfkit'
import type { DateTime } from 'luxon'
import Booking from '#models/booking'
import BookingCharge from '#models/booking_charge'
import Business from '#models/business'
import Car from '#models/car'
import CarDamage from '#models/car_damage'
import CustomerIdentity from '#models/customer_identity'
import File from '#models/file'
import Inspection from '#models/inspection'
import TermsVersion from '#models/terms_version'
import { BookingError } from '#services/bookings/booking_service'
import FileService from '#services/file_service'
import { maskNumber } from '#transformers/customer_transformer'

type Doc = PDFKit.PDFDocument

const INK = '#111827'
const MUTED = '#6b7280'
const LINE = '#e5e7eb'
const BRAND = '#fb242f'
const LEFT = 50
const WIDTH = 495 // A4 width 595 - margins

const money = (pesewas: number) =>
  `GHS ${(pesewas / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** Same top-view zones as the screen's diagram (viewBox 200 x 380). */
const ZONES: [string, number, number, number, number][] = [
  ['front_bumper', 34, 8, 132, 18],
  ['bonnet', 44, 26, 112, 74],
  ['windscreen', 48, 100, 104, 34],
  ['roof', 48, 134, 104, 120],
  ['rear_window', 48, 254, 104, 30],
  ['boot_lid', 44, 284, 112, 70],
  ['rear_bumper', 34, 354, 132, 18],
  ['left_front_wing', 24, 30, 20, 76],
  ['left_front_door', 24, 106, 24, 84],
  ['left_rear_door', 24, 190, 24, 84],
  ['left_rear_wing', 24, 274, 20, 76],
  ['right_front_wing', 156, 30, 20, 76],
  ['right_front_door', 152, 106, 24, 84],
  ['right_rear_door', 152, 190, 24, 84],
  ['right_rear_wing', 156, 274, 20, 76],
  ['left_mirror', 6, 108, 18, 14],
  ['right_mirror', 176, 108, 18, 14],
  ['wheel_front_left', 10, 48, 14, 42],
  ['wheel_front_right', 176, 48, 14, 42],
  ['wheel_rear_left', 10, 286, 14, 42],
  ['wheel_rear_right', 176, 286, 14, 42],
]

function toBuffer(doc: Doc): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    doc.end()
  })
}

/** Keeps a block together: starts a new page when it wouldn't fit. */
function room(doc: Doc, height: number) {
  if (doc.y + height > doc.page.height - 70) doc.addPage()
}

function heading(doc: Doc, text: string) {
  room(doc, 60)
  doc.moveDown(0.8)
  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor(BRAND)
    .text(text.toUpperCase(), LEFT, doc.y, { characterSpacing: 0.6 })
  doc
    .moveTo(LEFT, doc.y + 3)
    .lineTo(LEFT + WIDTH, doc.y + 3)
    .strokeColor(LINE)
    .lineWidth(1)
    .stroke()
  doc.moveDown(0.6)
}

/** Label / value pairs in two columns. */
function facts(doc: Doc, rows: [string, string | null | undefined][]) {
  const column = WIDTH / 2
  for (let index = 0; index < rows.length; index += 2) {
    room(doc, 30)
    const y = doc.y
    let bottom = y
    for (const [offset, row] of [rows[index], rows[index + 1]].entries()) {
      if (!row) continue
      const x = LEFT + offset * column
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(MUTED)
        .text(row[0].toUpperCase(), x, y, { width: column - 12 })
      doc
        .font('Helvetica')
        .fontSize(9.5)
        .fillColor(INK)
        .text(row[1] || '-', x, doc.y + 1, { width: column - 12 })
      bottom = Math.max(bottom, doc.y)
    }
    doc.y = bottom + 6
  }
}

/** A line with an amount on the right. */
function amountRow(
  doc: Doc,
  label: string,
  amount: string,
  options: { bold?: boolean; muted?: boolean } = {}
) {
  room(doc, 16)
  const y = doc.y
  doc
    .font(options.bold ? 'Helvetica-Bold' : 'Helvetica')
    .fontSize(9.5)
    .fillColor(options.muted ? MUTED : INK)
    .text(label, LEFT, y, { width: WIDTH - 110 })
  const bottom = doc.y
  doc.text(amount, LEFT + WIDTH - 110, y, { width: 110, align: 'right' })
  doc.y = Math.max(bottom, doc.y) + 3
}

function diagram(doc: Doc, damages: CarDamage[], x: number, y: number, width: number) {
  const scale = width / 200
  doc.save()
  doc
    .roundedRect(x + 22 * scale, y + 6 * scale, 156 * scale, 368 * scale, 44 * scale)
    .fillColor('#f3f4f6')
    .fill()
  for (const [, zx, zy, zw, zh] of ZONES) {
    doc
      .roundedRect(x + zx * scale, y + zy * scale, zw * scale, zh * scale, 2)
      .lineWidth(0.6)
      .fillAndStroke('#ffffff', '#d1d5db')
  }
  doc
    .font('Helvetica')
    .fontSize(6)
    .fillColor(MUTED)
    .text('FRONT', x, y + 14 * scale, { width, align: 'center' })
  damages.forEach((damage, index) => {
    const cx = x + (damage.x / 100) * 200 * scale
    const cy = y + (damage.y / 100) * 380 * scale
    doc.circle(cx, cy, 6).fillColor(BRAND).fill()
    doc
      .font('Helvetica-Bold')
      .fontSize(7)
      .fillColor('#ffffff')
      .text(String(index + 1), cx - 6, cy - 3.5, { width: 12, align: 'center' })
  })
  doc.restore()
}

async function imageBuffer(file: File | null): Promise<Buffer | null> {
  if (!file) return null
  try {
    const response = await fetch(FileService.getUrl(file, { expiresInSeconds: 60 }))
    if (!response.ok) return null
    return Buffer.from(await response.arrayBuffer())
  } catch {
    return null // unreachable in tests / offline - the PDF says the signature is on file
  }
}

function header(doc: Doc, business: Business | null, title: string, reference: string) {
  doc
    .font('Helvetica-Bold')
    .fontSize(16)
    .fillColor(INK)
    .text(business?.tradingName || business?.name || 'Car rental', LEFT, 50)
  doc
    .font('Helvetica')
    .fontSize(8.5)
    .fillColor(MUTED)
    .text(
      [
        [business?.address, business?.city].filter(Boolean).join(', '),
        [business?.phone, business?.email].filter(Boolean).join(' · '),
        business?.tin ? `TIN ${business.tin}` : null,
      ]
        .filter(Boolean)
        .join('\n'),
      LEFT,
      doc.y + 2
    )
  doc
    .font('Helvetica-Bold')
    .fontSize(13)
    .fillColor(INK)
    .text(title, LEFT, 50, { width: WIDTH, align: 'right' })
  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor(BRAND)
    .text(reference, LEFT, doc.y + 2, { width: WIDTH, align: 'right' })
  doc.y = Math.max(doc.y, 100) + 6
}

function footer(doc: Doc, text: string) {
  const range = doc.bufferedPageRange()
  for (let page = range.start; page < range.start + range.count; page++) {
    doc.switchToPage(page)
    // Writing inside the bottom margin would otherwise start a new (blank) page
    const bottom = doc.page.margins.bottom
    doc.page.margins.bottom = 0
    doc
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor(MUTED)
      .text(`${text} · page ${page + 1} of ${range.count}`, LEFT, doc.page.height - 40, {
        width: WIDTH,
        align: 'center',
        lineBreak: false,
      })
    doc.page.margins.bottom = bottom
  }
}

const fuel = (eighths: number | null) =>
  eighths === null ? '-' : eighths === 8 ? 'Full (8/8)' : `${eighths}/8`

/**
 * The rental agreement (M4.4) and the return report, built on request from
 * records that don't change after signing: the price as booked, the
 * check-out inspection and signature, and the exact terms version signed.
 * The agreement hash stored at signing proves what was agreed.
 */
export default class HandoverPdfService {
  private static async load(bookingId: string) {
    const booking = await Booking.query()
      .where('id', bookingId)
      .preload('customer')
      .preload('driver')
      .preload('extras')
      .preload('modifications', (q) => q.orderBy('created_at', 'asc'))
      .firstOrFail()
    const [business, car, out] = await Promise.all([
      Business.query().first(),
      Car.findOrFail(booking.carId),
      Inspection.query().where('booking_id', booking.id).where('type', 'check_out').first(),
    ])
    return { booking, business, car, out }
  }

  static async agreement(bookingId: string): Promise<Buffer> {
    const { booking, business, car, out } = await this.load(bookingId)
    if (!out || out.status !== 'completed') {
      throw new BookingError('status', 'The agreement exists once the car has been checked out.')
    }
    const [terms, identities, damages, signature] = await Promise.all([
      out.termsVersionId ? TermsVersion.find(out.termsVersionId) : null,
      CustomerIdentity.query()
        .where('customer_id', booking.customerId)
        .whereNot('status', 'rejected'),
      // The car's damage as it was at check-out: open, and recorded no later than the signature
      CarDamage.query()
        .where('car_id', car.id)
        .where('created_at', '<=', out.completedAt!.toSQL()!)
        .where((q) =>
          q.whereNull('repaired_at').orWhere('repaired_at', '>', out.completedAt!.toSQL()!)
        )
        .orderBy('created_at', 'asc'),
      out.signatureFileId ? File.find(out.signatureFileId) : null,
    ])
    const snapshot = booking.priceSnapshot
    const customer = booking.customer
    const zone = business?.timezone || 'Africa/Accra'
    const when = (value: DateTime | null) =>
      value ? value.setZone(zone).toFormat('ccc d LLL yyyy, HH:mm') : '-'
    const idOf = (types: string[]) => identities.find((identity) => types.includes(identity.type))

    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      bufferPages: true,
      info: { Title: `Rental agreement ${booking.reference}` },
    })
    header(doc, business, 'Rental agreement', booking.reference)

    heading(doc, 'Customer')
    const ghanaCard = idOf(['ghana_card', 'passport', 'voter_id'])
    const licence = idOf(['drivers_licence', 'international_driving_permit'])
    facts(doc, [
      ['Name', customer.fullName],
      ['Phone', customer.phone],
      ['Date of birth', customer.dateOfBirth?.toFormat('d LLL yyyy')],
      ['Email', customer.email],
      [
        'ID',
        ghanaCard ? `${ghanaCard.type.replaceAll('_', ' ')} ${maskNumber(ghanaCard.number)}` : null,
      ],
      [
        'Driving licence',
        licence
          ? `${maskNumber(licence.number)}${licence.expiresOn ? ` (to ${licence.expiresOn.toFormat('d LLL yyyy')})` : ''}`
          : null,
      ],
      ...(booking.driver
        ? ([['Driver (ours)', `${booking.driver.fullName} · ${booking.driver.phone}`]] as [
            string,
            string,
          ][])
        : []),
    ])

    heading(doc, 'Car and rental')
    facts(doc, [
      ['Car', `${car.make} ${car.model} ${car.year} · ${car.colour}`],
      ['Registration', car.registrationNo],
      ['Chassis (VIN)', car.vinChassisNo],
      [
        'Driving',
        booking.driveType === 'chauffeur'
          ? `With our driver${booking.outOfTown ? ', out of town' : ''}`
          : 'Self-drive',
      ],
      [
        'Pickup',
        `${when(booking.pickupAt)}${booking.deliveryAddress ? ` · delivered to ${booking.deliveryAddress}` : ' · at the office'}`,
      ],
      [
        'Return',
        `${when(booking.returnAt)}${booking.collectionAddress ? ` · collected from ${booking.collectionAddress}` : ' · at the office'}`,
      ],
    ])

    heading(doc, 'Price')
    for (const line of snapshot.lines) amountRow(doc, line.label, money(line.amount))
    for (const tax of snapshot.taxes)
      amountRow(doc, `${tax.name} ${tax.rateBp / 100}%`, money(tax.amount), { muted: true })
    amountRow(doc, 'Total', money(snapshot.total), { bold: true })
    amountRow(doc, 'Security deposit (refundable, not in the total)', money(snapshot.deposit), {
      muted: true,
    })
    doc.moveDown(0.3)
    doc
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor(MUTED)
      .text(
        [
          snapshot.protection
            ? `${snapshot.protection.name}: the customer pays at most ${money(snapshot.protection.excessAmount)} for covered damage.`
            : 'No protection plan: the customer is liable for all damage.',
          snapshot.mileage.unlimited
            ? 'Unlimited kilometres.'
            : `${snapshot.mileage.includedKm} km included${snapshot.mileage.excessKmAmount !== null ? `, then ${money(snapshot.mileage.excessKmAmount)} per km` : ''}.`,
          `Fuel: returned at the level recorded below (${fuel(out.fuelLevel)}).`,
        ].join('\n'),
        LEFT,
        doc.y,
        { width: WIDTH }
      )
    if (booking.modifications.length) {
      doc.moveDown(0.5)
      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(INK)
        .text('Changes after booking', LEFT, doc.y)
      for (const change of booking.modifications) {
        amountRow(
          doc,
          `${change.createdAt.setZone(zone).toFormat('d LLL')} · ${change.type.replaceAll('_', ' ')}${change.reason ? ` - ${change.reason}` : ''}`,
          `${change.priceDifferenceAmount >= 0 ? '+' : '-'}${money(Math.abs(change.priceDifferenceAmount))}`
        )
      }
    }

    heading(doc, 'Car at pickup')
    const issues = out.checklist.filter((item) => item.result !== 'ok')
    facts(doc, [
      ['Odometer', out.odometerKm !== null ? `${out.odometerKm.toLocaleString()} km` : '-'],
      ['Fuel', fuel(out.fuelLevel)],
      ['Outside / inside', `${out.exterior ?? '-'} / ${out.interior ?? '-'}`],
      ['Checked out', when(out.completedAt)],
      [
        'Checklist',
        issues.length
          ? issues.map((item) => `${item.name}: ${item.result}`).join(', ')
          : `All ${out.checklist.length} items present`,
      ],
      ['Notes', out.notes],
    ])
    room(doc, 190)
    const top = doc.y
    diagram(doc, damages, LEFT, top, 90)
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(INK)
      .text('Damage on the car at pickup', LEFT + 115, top)
    if (damages.length === 0) {
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(MUTED)
        .text('None recorded.', LEFT + 115, doc.y + 2)
    } else {
      damages.forEach((damage, index) => {
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor(INK)
          .text(
            `${index + 1}. ${damage.zone.replaceAll('_', ' ')} - ${damage.type.replace('_', ' ')}, ${damage.severity}${damage.note ? ` (${damage.note})` : ''}`,
            LEFT + 115,
            doc.y + 2,
            { width: WIDTH - 115 }
          )
      })
    }
    doc.y = Math.max(doc.y, top + 175)

    heading(doc, `Terms${terms ? ` (version ${terms.version})` : ''}`)
    doc
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor(INK)
      .text(terms?.body ?? '-', LEFT, doc.y, { width: WIDTH, lineGap: 1.5 })

    heading(doc, 'Signed')
    room(doc, 120)
    const signedTop = doc.y
    const image = await imageBuffer(signature)
    if (image) {
      try {
        doc.image(image, LEFT, signedTop, { fit: [200, 70] })
      } catch {
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor(MUTED)
          .text('(signature on file)', LEFT, signedTop + 25)
      }
    } else {
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(MUTED)
        .text('(signature on file)', LEFT, signedTop + 25)
    }
    doc
      .moveTo(LEFT, signedTop + 74)
      .lineTo(LEFT + 220, signedTop + 74)
      .strokeColor(INK)
      .lineWidth(0.6)
      .stroke()
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(INK)
      .text(`${out.signedName ?? customer.fullName} - ${when(out.signedAt)}`, LEFT, signedTop + 78)
    doc
      .fontSize(7.5)
      .fillColor(MUTED)
      .text(
        `By signing, the customer accepted these terms and the car as recorded above.\nFrom ${out.signerIp ?? '-'} · agreement fingerprint (SHA-256) ${out.agreementHash ?? '-'}`,
        LEFT,
        doc.y + 4,
        { width: WIDTH }
      )

    footer(doc, `${booking.reference} · rental agreement`)
    return toBuffer(doc)
  }

  static async checkInReport(bookingId: string): Promise<Buffer> {
    const { booking, business, car, out } = await this.load(bookingId)
    const back = await Inspection.query()
      .where('booking_id', booking.id)
      .where('type', 'check_in')
      .first()
    if (!back || back.status !== 'completed') {
      throw new BookingError('status', 'The return report exists once the car has been checked in.')
    }
    const [charges, damages] = await Promise.all([
      BookingCharge.query().where('booking_id', booking.id).orderBy('created_at', 'asc'),
      CarDamage.query().where('reported_inspection_id', back.id).orderBy('created_at', 'asc'),
    ])
    const zone = business?.timezone || 'Africa/Accra'
    const when = (value: DateTime | null) =>
      value ? value.setZone(zone).toFormat('ccc d LLL yyyy, HH:mm') : '-'

    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      bufferPages: true,
      info: { Title: `Return report ${booking.reference}` },
    })
    header(doc, business, 'Return report', booking.reference)

    heading(doc, 'Rental')
    facts(doc, [
      ['Customer', booking.customer.fullName],
      ['Car', `${car.make} ${car.model} · ${car.registrationNo}`],
      ['Picked up', when(booking.actualPickupAt)],
      ['Returned', `${when(booking.actualReturnAt)} (booked ${when(booking.returnAt)})`],
    ])

    heading(doc, 'Out and back')
    const driven =
      out?.odometerKm !== null && out?.odometerKm !== undefined && back.odometerKm !== null
        ? back.odometerKm - out.odometerKm
        : null
    facts(doc, [
      [
        'Odometer',
        `${out?.odometerKm?.toLocaleString() ?? '-'} km to ${back.odometerKm?.toLocaleString() ?? '-'} km`,
      ],
      ['Driven', driven !== null ? `${driven.toLocaleString()} km` : '-'],
      ['Fuel', `${fuel(out?.fuelLevel ?? null)} to ${fuel(back.fuelLevel)}`],
      ['Outside / inside', `${back.exterior ?? '-'} / ${back.interior ?? '-'}`],
    ])
    const missing = back.checklist.filter((item) => item.result !== 'ok')
    if (missing.length) {
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(INK)
        .text(
          `Checklist: ${missing.map((item) => `${item.name} (${item.result})`).join(', ')}`,
          LEFT,
          doc.y,
          { width: WIDTH }
        )
    }

    heading(doc, 'New damage')
    if (damages.length === 0) {
      doc.font('Helvetica').fontSize(9).fillColor(MUTED).text('None found at return.', LEFT, doc.y)
    } else {
      room(doc, 190)
      const top = doc.y
      diagram(doc, damages, LEFT, top, 90)
      damages.forEach((damage, index) => {
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor(INK)
          .text(
            `${index + 1}. ${damage.zone.replaceAll('_', ' ')} - ${damage.type.replace('_', ' ')}, ${damage.severity}${damage.note ? ` (${damage.note})` : ''}`,
            LEFT + 115,
            index === 0 ? top : doc.y + 2,
            { width: WIDTH - 115 }
          )
      })
      doc.y = Math.max(doc.y, top + 175)
    }

    heading(doc, 'Charges at return')
    if (charges.length === 0) {
      doc.font('Helvetica').fontSize(9).fillColor(MUTED).text('No charges.', LEFT, doc.y)
    }
    for (const charge of charges) {
      amountRow(
        doc,
        charge.status === 'waived'
          ? `${charge.label} - waived: ${charge.waiveReason}`
          : charge.label,
        charge.status === 'waived' ? 'waived' : money(charge.amount),
        { muted: charge.status === 'waived' }
      )
    }
    doc.moveDown(0.4)
    amountRow(doc, 'Booking total (incl. charges and tax)', money(booking.totalAmount), {
      bold: true,
    })
    amountRow(doc, 'Paid so far', money(booking.paidAmount), { muted: true })
    amountRow(doc, 'Balance', money(booking.balanceAmount), { bold: true })

    footer(doc, `${booking.reference} · return report`)
    return toBuffer(doc)
  }
}
