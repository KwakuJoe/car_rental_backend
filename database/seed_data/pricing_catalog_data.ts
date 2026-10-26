/**
 * Starting examples for the pricing catalog (M2.7 - M2.9). All are created
 * INACTIVE - placeholders the owner reviews and switches on with real prices.
 * Money in pesewas.
 */

export const exampleExtras = [
  {
    name: 'Child seat',
    description: 'For children up to 4 years.',
    chargeType: 'per_day',
    amount: 30_00,
    maxQuantity: 2,
    stock: 4,
  },
  {
    name: 'Booster seat',
    description: 'For children 4 to 12 years.',
    chargeType: 'per_day',
    amount: 20_00,
    maxQuantity: 2,
    stock: 4,
  },
  {
    name: 'Extra driver',
    description: 'Another named, licensed driver on the agreement.',
    chargeType: 'per_day',
    amount: 50_00,
    maxQuantity: 2,
    stock: null,
  },
  {
    name: 'GPS navigation',
    description: 'Portable GPS unit.',
    chargeType: 'per_day',
    amount: 25_00,
    maxQuantity: 1,
    stock: 3,
  },
  {
    name: 'Wi-Fi hotspot',
    description: 'Mobile data hotspot for the trip.',
    chargeType: 'per_day',
    amount: 40_00,
    maxQuantity: 1,
    stock: 3,
  },
  {
    name: 'Cooler box',
    description: 'Charged once per rental.',
    chargeType: 'per_rental',
    amount: 50_00,
    maxQuantity: 1,
    stock: 5,
  },
] as const

export const exampleProtectionPlans = [
  {
    name: 'Basic cover',
    description: 'Included in every rental. You pay for damage up to the excess.',
    perDayAmount: 0,
    excessAmount: 5_000_00,
  },
  {
    name: 'Standard cover',
    description: 'Lowers what you pay for damage to the excess shown.',
    perDayAmount: 80_00,
    excessAmount: 1_500_00,
  },
  {
    name: 'Full cover',
    description:
      'Nothing to pay for covered damage. Tyres, glass and negligence may be excluded - see terms.',
    perDayAmount: 150_00,
    excessAmount: 0,
  },
]

export const exampleDeliveryZones = [
  {
    name: 'Kotoka International Airport (KIA)',
    deliveryAmount: 150_00,
    collectionAmount: 150_00,
    afterHoursAmount: 100_00,
  },
  { name: 'East Legon', deliveryAmount: 100_00, collectionAmount: 100_00, afterHoursAmount: 50_00 },
  {
    name: 'Airport Residential',
    deliveryAmount: 80_00,
    collectionAmount: 80_00,
    afterHoursAmount: 50_00,
  },
  {
    name: 'Osu & Labone hotels',
    deliveryAmount: 100_00,
    collectionAmount: 100_00,
    afterHoursAmount: 50_00,
  },
  { name: 'Tema', deliveryAmount: 200_00, collectionAmount: 200_00, afterHoursAmount: 100_00 },
]

/** Standard fees - check-in (Phase 4) looks these up by code, so they always exist. */
export const standardFees = [
  {
    code: 'late_return_hour',
    name: 'Late return (per hour)',
    unit: 'per_hour',
    amount: 50_00,
    description: 'Each hour late after the grace period.',
  },
  {
    code: 'late_return_day',
    name: 'Late return (per day)',
    unit: 'per_day',
    amount: 450_00,
    description: 'Each extra day when the car comes back a day or more late.',
  },
  {
    code: 'fuel_per_litre',
    name: 'Fuel (per litre)',
    unit: 'per_litre',
    amount: 15_00,
    description: 'Fuel missing compared with pickup.',
  },
  {
    code: 'refuel_service',
    name: 'Refuelling service',
    unit: 'flat',
    amount: 50_00,
    description: 'Charged on top of fuel when we have to refuel.',
  },
  {
    code: 'cleaning_standard',
    name: 'Cleaning (standard)',
    unit: 'flat',
    amount: 100_00,
    description: 'Car returned dirtier than normal use.',
  },
  {
    code: 'cleaning_heavy',
    name: 'Cleaning (heavy)',
    unit: 'flat',
    amount: 300_00,
    description: 'Mud, sand, stains, pet hair.',
  },
  {
    code: 'smoking',
    name: 'Smoking in the car',
    unit: 'flat',
    amount: 500_00,
    description: 'Deep clean and odour removal.',
  },
  {
    code: 'lost_key',
    name: 'Lost key',
    unit: 'flat',
    amount: 1_500_00,
    description: 'Replacement and programming.',
  },
  {
    code: 'lost_document',
    name: 'Lost car document',
    unit: 'flat',
    amount: 500_00,
    description: 'Replacing registration, insurance or roadworthy papers.',
  },
  {
    code: 'excess_km',
    name: 'Extra kilometres',
    unit: 'per_km',
    amount: 1_50,
    description: 'Default per km over the allowance, when a rate does not set its own.',
  },
  {
    code: 'admin_fee_fines',
    name: 'Admin fee on traffic fines',
    unit: 'percent',
    amount: 10_00,
    description: 'Added to fines we pay on the customer’s behalf (10%).',
  },
]
