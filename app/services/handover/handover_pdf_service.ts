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
import { PdfDocument, THEME, type Letterhead } from '#services/pdf/pdf_document'
import { maskNumber } from '#transformers/customer_transformer'

const money = PdfDocument.money

/** Same top-view zones as the screen's diagram (viewBox 200 x 380). */
const ZONES: [number, number, number, number][] = [
  [34, 8, 132, 18],
  [44, 26, 112, 74],
  [48, 100, 104, 34],
  [48, 134, 104, 120],
  [48, 254, 104, 30],
  [44, 284, 112, 70],
  [34, 354, 132, 18],
  [24, 30, 20, 76],
  [24, 106, 24, 84],
  [24, 190, 24, 84],
  [24, 274, 20, 76],
  [156, 30, 20, 76],
  [152, 106, 24, 84],
  [152, 190, 24, 84],
  [156, 274, 20, 76],
  [6, 108, 18, 14],
  [176, 108, 18, 14],
  [10, 48, 14, 42],
  [176, 48, 14, 42],
  [10, 286, 14, 42],
  [176, 286, 14, 42],
]

const fuel = (eighths: number | null) =>
  eighths === null ? '-' : eighths === 8 ? 'Full' : `${eighths}/8`
const label = (value: string) => value.replaceAll('_', ' ')
const capital = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

async function imageBuffer(file: File | null): Promise<Buffer | null> {
  if (!file) return null
  try {
    const response = await fetch(FileService.getUrl(file, { expiresInSeconds: 60 }))
    if (!response.ok) return null
    return Buffer.from(await response.arrayBuffer())
  } catch {
    return null // unreachable in tests / offline - the box says the signature is on file
  }
}

function letterhead(business: Business | null): Letterhead {
  return {
    name: business?.tradingName || business?.name || 'Car rental',
    details: [
      [business?.address, business?.city, business?.region].filter(Boolean).join(', '),
      [business?.phone, business?.email].filter(Boolean).join('  ·  '),
      business?.tin
        ? `TIN ${business.tin}${business.vatNumber ? `  ·  VAT ${business.vatNumber}` : ''}`
        : '',
    ].filter(Boolean),
    // The business logo goes here once the profile can upload one
    logo: null,
  }
}

const footerLine = (business: Business | null) =>
  [business?.tradingName || business?.name, business?.phone, business?.email]
    .filter(Boolean)
    .join('  ·  ')

const damageText = (damage: CarDamage) =>
  `${capital(label(damage.zone))} - ${label(damage.type)}, ${damage.severity}${damage.note ? `. ${damage.note}` : ''}`

/**
 * Damage diagram + numbered list inside a card. Pins: brand red for damage
 * found at this handover, grey for damage already on the car.
 */
function damageCard(
  pdf: PdfDocument,
  title: string,
  damages: CarDamage[],
  isNew: (damage: CarDamage) => boolean
) {
  const { doc } = pdf
  const padding = 14
  const diagramWidth = 70
  const diagramHeight = diagramWidth * 1.9
  const listX = pdf.left + padding + diagramWidth + 22
  const listWidth = pdf.width - padding * 2 - diagramWidth - 22
  doc.font('medium').fontSize(8.5)
  const listHeight = damages.reduce(
    (sum, damage) => sum + doc.heightOfString(damageText(damage), { width: listWidth - 22 }) + 8,
    0
  )
  const height = padding * 2 + 18 + Math.max(diagramHeight, listHeight + 10)
  pdf.ensure(height + 12)
  const top = doc.y
  pdf.cardBox(pdf.left, top, pdf.width, height)
  doc.y = top + padding
  pdf.sectionTitle(title, pdf.left + padding, pdf.width - padding * 2)
  const dy = doc.y
  const dx = pdf.left + padding
  const scale = diagramWidth / 200
  doc
    .roundedRect(dx + 22 * scale, dy + 6 * scale, 156 * scale, 368 * scale, 44 * scale)
    .fill(THEME.tile)
  for (const [zx, zy, zw, zh] of ZONES) {
    doc
      .roundedRect(dx + zx * scale, dy + zy * scale, zw * scale, zh * scale, 2)
      .lineWidth(0.5)
      .fillAndStroke('#ffffff', '#d1d5db')
  }
  doc
    .font('semibold')
    .fontSize(5.5)
    .fillColor(THEME.faint)
    .text('FRONT', dx, dy + 7.5 * scale, { width: diagramWidth, align: 'center' })
  damages.forEach((damage, index) => {
    const cx = dx + (damage.x / 100) * 200 * scale
    const cy = dy + (damage.y / 100) * 380 * scale
    doc.circle(cx, cy, 5.5).fill(isNew(damage) ? THEME.brand : THEME.muted)
    doc
      .font('bold')
      .fontSize(6.5)
      .fillColor('#ffffff')
      .text(String(index + 1), cx - 6, cy - 3.3, { width: 12, align: 'center' })
  })
  let y = dy + 2
  if (damages.length === 0) {
    doc.font('medium').fontSize(9).fillColor(THEME.muted).text('No damage recorded.', listX, y)
  }
  damages.forEach((damage, index) => {
    doc.circle(listX + 7, y + 6, 7).fill(isNew(damage) ? THEME.brand : THEME.muted)
    doc
      .font('bold')
      .fontSize(7)
      .fillColor('#ffffff')
      .text(String(index + 1), listX, y + 2.5, { width: 14, align: 'center' })
    doc
      .font('medium')
      .fontSize(8.5)
      .fillColor(THEME.ink)
      .text(damageText(damage), listX + 22, y + 1, { width: listWidth - 22 })
    y = doc.y + 8
  })
  doc.y = top + height + 12
}

/**
 * Readings card: big odometer, fuel gauge, cleanliness, one more figure,
 * checklist. `before` (the return report) adds the pickup readings.
 */
function readingsCard(
  pdf: PdfDocument,
  title: string,
  inspection: Inspection,
  extra: [string, string],
  before?: Inspection | null
) {
  const { doc } = pdf
  const padding = 14
  const issues = inspection.checklist.filter((item) => item.result !== 'ok')
  const checklistText = issues.length
    ? `Checklist: ${issues.map((item) => `${item.name} ${item.result}`).join(' · ')}`
    : `Checklist: all ${inspection.checklist.length} items present`
  doc.font('medium').fontSize(8.5)
  const checklistHeight = doc.heightOfString(checklistText, { width: pdf.width - padding * 2 })
  const height = padding * 2 + 18 + 46 + 12 + checklistHeight
  pdf.ensure(height + 12)
  const top = doc.y
  pdf.cardBox(pdf.left, top, pdf.width, height)
  doc.y = top + padding
  pdf.sectionTitle(title, pdf.left + padding, pdf.width - padding * 2)
  const y = doc.y
  const column = (pdf.width - padding * 2) / 4
  const cells: [string, string][] = [
    [
      'Odometer',
      inspection.odometerKm !== null ? `${inspection.odometerKm.toLocaleString()} km` : '-',
    ],
    [
      'Fuel',
      before
        ? `${fuel(inspection.fuelLevel)}  ·  was ${fuel(before.fuelLevel)}`
        : fuel(inspection.fuelLevel),
    ],
    [
      'Outside / inside',
      `${capital(inspection.exterior ?? '-')} / ${capital(inspection.interior ?? '-')}`,
    ],
    extra,
  ]
  cells.forEach(([name, value], index) => {
    const x = pdf.left + padding + index * column
    doc
      .font('semibold')
      .fontSize(6.5)
      .fillColor(THEME.faint)
      .text(name.toUpperCase(), x, y, { width: column - 10, characterSpacing: 0.5 })
    doc
      .font(index === 0 ? 'heavy' : 'bold')
      .fontSize(index === 0 ? 15 : 11)
      .fillColor(THEME.ink)
      .text(value, x, y + 10, { width: column - 10 })
    if (name === 'Fuel') pdf.fuelGauge(inspection.fuelLevel, x, y + 29, column - 24)
    if (index === 0 && before?.odometerKm !== null && before?.odometerKm !== undefined) {
      doc
        .font('regular')
        .fontSize(7.5)
        .fillColor(THEME.muted)
        .text(`from ${before.odometerKm.toLocaleString()} km`, x, doc.y + 1, { width: column - 10 })
    }
  })
  doc
    .font('medium')
    .fontSize(8.5)
    .fillColor(issues.length ? THEME.ink : THEME.muted)
    .text(checklistText, pdf.left + padding, y + 46 + 6, { width: pdf.width - padding * 2 })
  doc.y = top + height + 12
}

/**
 * The rental agreement (M4.4) and the return report, built on request from
 * records that don't change after signing: the price as booked, the
 * check-out inspection and signature, and the exact terms version signed.
 * The agreement fingerprint stored at signing proves what was agreed.
 */
export default class HandoverPdfService {
  private static async load(bookingId: string) {
    const booking = await Booking.query()
      .where('id', bookingId)
      .preload('customer')
      .preload('driver')
      .preload('modifications', (q) => q.orderBy('created_at', 'asc'))
      .firstOrFail()
    const [business, car, out] = await Promise.all([
      Business.query().first(),
      Car.findOrFail(booking.carId),
      Inspection.query()
        .where('booking_id', booking.id)
        .where('type', 'check_out')
        .preload('inspector')
        .first(),
    ])
    const zone = business?.timezone || 'Africa/Accra'
    const when = (value: DateTime | null | undefined, format = 'ccc d LLL yyyy, HH:mm') =>
      value ? value.setZone(zone).toFormat(format) : '-'
    return { booking, business, car, out, when }
  }

  static async agreement(bookingId: string): Promise<Buffer> {
    const { booking, business, car, out, when } = await this.load(bookingId)
    if (!out || out.status !== 'completed') {
      throw new BookingError('status', 'The agreement exists once the car has been checked out.')
    }
    const [terms, identities, damages, signature] = await Promise.all([
      out.termsVersionId ? TermsVersion.find(out.termsVersionId) : null,
      CustomerIdentity.query()
        .where('customer_id', booking.customerId)
        .whereNot('status', 'rejected'),
      // The car's damage as it was at check-out
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
    const idOf = (types: string[]) => identities.find((identity) => types.includes(identity.type))
    const id = idOf(['ghana_card', 'passport', 'voter_id'])
    const licence = idOf(['drivers_licence', 'international_driving_permit'])
    const head = letterhead(business)
    const sameDay = when(booking.pickupAt, 'yyyy-LL-dd') === when(booking.returnAt, 'yyyy-LL-dd')

    const pdf = new PdfDocument({
      title: 'Rental agreement',
      reference: booking.reference,
      letterhead: head,
      footer: footerLine(business),
    })
    const { doc } = pdf
    pdf.header(`Signed ${when(out.signedAt, 'd LLL yyyy')}`)

    pdf.summary([
      { label: 'Customer', value: customer.fullName, hint: customer.phone },
      {
        label: 'Vehicle',
        value: `${car.make} ${car.model}`,
        hint: `${car.registrationNo} · ${car.colour}`,
      },
      {
        label: 'Rental period',
        // Same day: the date and the hours; otherwise from - to
        value: sameDay
          ? when(booking.pickupAt, 'd LLL yyyy')
          : `${when(booking.pickupAt, 'd LLL')} - ${when(booking.returnAt, 'd LLL yyyy')}`,
        hint: `${sameDay ? `${when(booking.pickupAt, 'HH:mm')} - ${when(booking.returnAt, 'HH:mm')}` : `${snapshot.rentalDays} ${snapshot.rentalDays === 1 ? 'day' : 'days'}`} · ${booking.driveType === 'chauffeur' ? 'with driver' : 'self-drive'}`,
      },
      {
        label: 'Total',
        value: money(snapshot.total),
        hint: `+ ${money(snapshot.deposit)} refundable deposit`,
        strong: true,
      },
    ])

    pdf.factsCardPair(
      {
        title: 'Customer',
        facts: [
          ['Full name', customer.fullName],
          ['Phone', customer.phone],
          ['Date of birth', customer.dateOfBirth?.toFormat('d LLL yyyy')],
          ['Email', customer.email],
          [id ? capital(label(id.type)) : 'ID', id ? maskNumber(id.number) : null],
          [
            'Driving licence',
            licence
              ? `${maskNumber(licence.number)}${licence.expiresOn ? ` · to ${licence.expiresOn.toFormat('LLL yyyy')}` : ''}`
              : null,
          ],
        ],
      },
      {
        title: 'Vehicle',
        facts: [
          ['Make and model', `${car.make} ${car.model} ${car.year}`],
          ['Registration', car.registrationNo],
          ['Colour', car.colour],
          ['Chassis (VIN)', car.vinChassisNo],
          ['Transmission', car.transmission === 'auto' ? 'Automatic' : 'Manual'],
          ['Fuel type', capital(car.fuelType)],
        ],
      }
    )

    pdf.factsCard('Rental', [
      ['Pickup', when(booking.pickupAt)],
      ['Return', when(booking.returnAt)],
      [
        'Pickup at',
        booking.deliveryAddress ? `Delivered to ${booking.deliveryAddress}` : 'Our office',
      ],
      [
        'Return at',
        booking.collectionAddress ? `Collected from ${booking.collectionAddress}` : 'Our office',
      ],
      [
        'Driving',
        booking.driveType === 'chauffeur'
          ? `With our driver${booking.outOfTown ? ', out of town' : ''}`
          : 'Self-drive',
      ],
      [
        'Our driver',
        booking.driver
          ? `${booking.driver.fullName} · ${booking.driver.phone}`
          : 'None (self-drive)',
      ],
      ...(booking.destination ? ([['Trip', booking.destination]] as [string, string][]) : []),
    ])

    const changes = booking.modifications.reduce(
      (sum, change) => sum + change.priceDifferenceAmount,
      0
    )
    pdf.table(
      'Charges',
      [
        ...snapshot.lines.map((line) => ({ label: line.label, amount: money(line.amount) })),
        ...booking.modifications.map((change) => ({
          label: `${capital(label(change.type))} on ${when(change.createdAt, 'd LLL')}`,
          note: change.reason ?? undefined,
          amount: `${change.priceDifferenceAmount >= 0 ? '+' : '-'}${money(Math.abs(change.priceDifferenceAmount))}`,
        })),
      ],
      [
        { label: 'Subtotal', amount: money(snapshot.subtotal), muted: true },
        ...snapshot.taxes.map((tax) => ({
          label: `${tax.name} ${tax.rateBp / 100}%`,
          amount: money(tax.amount),
          muted: true,
        })),
        {
          label: changes ? 'Total (with changes)' : 'Total',
          amount: money(snapshot.total + changes),
        },
      ],
      [
        `Deposit ${money(snapshot.deposit)} · refundable`,
        snapshot.protection
          ? `${snapshot.protection.name} · excess ${money(snapshot.protection.excessAmount)}`
          : 'No protection plan',
        snapshot.mileage.unlimited
          ? 'Unlimited km'
          : `${snapshot.mileage.includedKm} km included${snapshot.mileage.excessKmAmount !== null ? ` · ${money(snapshot.mileage.excessKmAmount)}/km after` : ''}`,
        `Return with fuel at ${fuel(out.fuelLevel).toLowerCase()}`,
      ]
    )

    readingsCard(pdf, 'Vehicle at pickup', out, [
      'Checked out',
      when(out.completedAt, 'd LLL, HH:mm'),
    ])
    damageCard(pdf, 'Damage at pickup', damages, () => false)

    // Terms in two columns, then the signatures
    pdf.ensure(120)
    pdf.sectionTitle(`Terms and conditions${terms ? ` · version ${terms.version}` : ''}`)
    pdf.columns(terms?.body ?? '-')

    pdf.ensure(180)
    doc.moveDown(0.5)
    pdf.sectionTitle('Signatures')
    const top = doc.y
    const gap = 14
    const box = (pdf.width - gap) / 2
    const image = await imageBuffer(signature)
    const boxes = [
      {
        title: 'Customer',
        name: out.signedName ?? customer.fullName,
        at: when(out.signedAt),
        image,
      },
      {
        title: `For ${head.name}`,
        name: out.inspector?.fullName ?? out.inspector?.email ?? 'Staff',
        at: when(out.completedAt),
        image: null,
      },
    ]
    boxes.forEach((item, index) => {
      const x = pdf.left + index * (box + gap)
      pdf.cardBox(x, top, box, 118)
      doc
        .font('semibold')
        .fontSize(6.5)
        .fillColor(THEME.faint)
        .text(item.title.toUpperCase(), x + 14, top + 12, {
          width: box - 28,
          characterSpacing: 0.5,
        })
      const placeholder =
        index === 0 ? '(signature on file)' : 'Handed the car over with the customer'
      let drawn = false
      if (item.image) {
        try {
          doc.image(item.image, x + 14, top + 26, { fit: [box - 28, 48] })
          drawn = true
        } catch {
          drawn = false
        }
      }
      if (!drawn) {
        doc
          .font('regular')
          .fontSize(8)
          .fillColor(THEME.muted)
          .text(placeholder, x + 14, top + 48, { width: box - 28 })
      }
      doc
        .moveTo(x + 14, top + 80)
        .lineTo(x + box - 14, top + 80)
        .lineWidth(0.6)
        .strokeColor(THEME.ink)
        .stroke()
      doc
        .font('bold')
        .fontSize(9)
        .fillColor(THEME.ink)
        .text(item.name, x + 14, top + 86, { width: box - 28 })
      doc
        .font('regular')
        .fontSize(7.5)
        .fillColor(THEME.muted)
        .text(item.at, x + 14, doc.y + 1, { width: box - 28 })
    })
    doc.y = top + 130
    doc
      .font('regular')
      .fontSize(7)
      .fillColor(THEME.faint)
      .text(
        `By signing, the customer accepted these terms and the vehicle as recorded in this agreement. Signed from ${out.signerIp ?? '-'}.\nAgreement fingerprint (SHA-256): ${out.agreementHash ?? '-'}`,
        pdf.left,
        doc.y,
        { width: pdf.width, lineGap: 1.5 }
      )

    return pdf.finish()
  }

  static async checkInReport(bookingId: string): Promise<Buffer> {
    const { booking, business, car, out, when } = await this.load(bookingId)
    const back = await Inspection.query()
      .where('booking_id', booking.id)
      .where('type', 'check_in')
      .preload('inspector')
      .first()
    if (!back || back.status !== 'completed') {
      throw new BookingError('status', 'The return report exists once the car has been checked in.')
    }
    const [charges, damages] = await Promise.all([
      BookingCharge.query().where('booking_id', booking.id).orderBy('created_at', 'asc'),
      CarDamage.query().where('reported_inspection_id', back.id).orderBy('created_at', 'asc'),
    ])
    const driven =
      out?.odometerKm !== null && out?.odometerKm !== undefined && back.odometerKm !== null
        ? back.odometerKm - out.odometerKm
        : null
    const late = !!booking.actualReturnAt && booking.actualReturnAt > booking.returnAt

    const pdf = new PdfDocument({
      title: 'Return report',
      reference: booking.reference,
      letterhead: letterhead(business),
      footer: footerLine(business),
    })
    pdf.header(`Returned ${when(booking.actualReturnAt, 'd LLL yyyy')}`)
    pdf.summary([
      { label: 'Customer', value: booking.customer.fullName, hint: booking.customer.phone },
      { label: 'Vehicle', value: `${car.make} ${car.model}`, hint: car.registrationNo },
      {
        label: 'Returned',
        value: when(booking.actualReturnAt, 'd LLL, HH:mm'),
        hint: late ? `Booked for ${when(booking.returnAt, 'd LLL, HH:mm')}` : 'On time',
      },
      {
        label: 'Balance due',
        value: money(booking.balanceAmount),
        hint: `Total ${money(booking.totalAmount)}`,
        strong: true,
      },
    ])

    pdf.factsCard(
      'Out and back',
      [
        ['Picked up', when(booking.actualPickupAt)],
        ['Returned', when(booking.actualReturnAt)],
        ['Checked out by', out?.inspector?.fullName ?? out?.inspector?.email ?? null],
        ['Checked in by', back.inspector?.fullName ?? back.inspector?.email ?? null],
      ],
      4
    )
    readingsCard(
      pdf,
      'Vehicle at return',
      back,
      ['Driven', driven !== null ? `${driven.toLocaleString()} km` : '-'],
      out
    )

    const accepted = charges.filter((charge) => charge.status === 'accepted')
    pdf.table(
      'Charges at return',
      charges.length
        ? charges.map((charge) => ({
            label: charge.label,
            amount: charge.status === 'waived' ? 'Waived' : money(charge.amount),
            note: charge.status === 'waived' ? `Waived: ${charge.waiveReason}` : undefined,
            muted: charge.status === 'waived',
          }))
        : [
            {
              label: 'No charges - the car came back as it went out',
              amount: money(0),
              muted: true,
            },
          ],
      [
        {
          label: 'Charges at return',
          amount: money(accepted.reduce((sum, charge) => sum + charge.amount, 0)),
          muted: true,
        },
        {
          label: 'Booking total (with charges and tax)',
          amount: money(booking.totalAmount),
          muted: true,
        },
        { label: 'Paid so far', amount: money(booking.paidAmount), muted: true },
        { label: 'Balance due', amount: money(booking.balanceAmount) },
      ]
    )
    damageCard(pdf, 'New damage at return', damages, () => true)
    return pdf.finish()
  }
}
