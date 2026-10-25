import vine from '@vinejs/vine'
import { paginationFields } from '#validators/shared'
import { CAR_STATUSES, TRANSMISSIONS, FUEL_TYPES, OWNERSHIP_TYPES } from '#models/car'

const maxYear = new Date().getFullYear() + 2

export const carFilterValidator = vine.create({
  ...paginationFields,
  search: vine.string().trim().optional(),
  categoryId: vine.string().optional(),
  branchId: vine.string().optional(),
  status: vine.enum(CAR_STATUSES).optional(),
  transmission: vine.enum(TRANSMISSIONS).optional(),
  fuelType: vine.enum(FUEL_TYPES).optional(),
  isListedOnline: vine.boolean().optional(),
  includeArchived: vine.boolean().optional(),
  sortBy: vine
    .enum([
      'make',
      'model',
      'year',
      'registrationNo',
      'currentOdometerKm',
      'status',
      'createdAt',
    ] as const)
    .optional(),
})

/**
 * Validator for adding a new car to the fleet.
 */
export const createCarValidator = vine.create({
  branchId: vine.string().exists({ table: 'branches', column: 'id' }),
  categoryId: vine.string().exists({ table: 'categories', column: 'id' }),
  make: vine.string().trim().minLength(2).maxLength(80),
  model: vine.string().trim().minLength(1).maxLength(80),
  year: vine.number().min(1980).max(maxYear),
  colour: vine.string().trim().minLength(2).maxLength(50),
  registrationNo: vine
    .string()
    .trim()
    .toUpperCase()
    .minLength(3)
    .maxLength(50)
    .unique({ table: 'cars', column: 'registration_no' }),
  vinChassisNo: vine
    .string()
    .trim()
    .toUpperCase()
    .minLength(5)
    .maxLength(80)
    .unique({ table: 'cars', column: 'vin_chassis_no' }),
  engineNo: vine.string().trim().maxLength(80).nullable().optional(),
  transmission: vine.enum(TRANSMISSIONS).optional(),
  fuelType: vine.enum(FUEL_TYPES).optional(),
  fuelCapacityL: vine.number().min(0).max(500).nullable().optional(),
  seats: vine.number().min(1).max(100).optional(),
  doors: vine.number().min(0).max(10).optional(),
  luggage: vine.number().min(0).max(20).optional(),
  features: vine.array(vine.string().trim().maxLength(50)).optional(),
  currentOdometerKm: vine.number().min(0).optional(),
  purchaseDate: vine
    .date({ formats: ['YYYY-MM-DD'] })
    .nullable()
    .optional(),
  purchaseAmount: vine.number().min(0).nullable().optional(),
  ownership: vine.enum(OWNERSHIP_TYPES).optional(),
  publicTitle: vine.string().trim().maxLength(150).nullable().optional(),
  publicDescription: vine.string().trim().maxLength(2000).nullable().optional(),
  isListedOnline: vine.boolean().optional(),
  status: vine.enum(CAR_STATUSES).optional(),
})

/**
 * Factory for updating a car, enforcing unique registration and VIN except self.
 */
export function updateCarValidator(carId: string) {
  return vine.create({
    branchId: vine.string().exists({ table: 'branches', column: 'id' }),
    categoryId: vine.string().exists({ table: 'categories', column: 'id' }),
    make: vine.string().trim().minLength(2).maxLength(80),
    model: vine.string().trim().minLength(1).maxLength(80),
    year: vine.number().min(1980).max(maxYear),
    colour: vine.string().trim().minLength(2).maxLength(50),
    registrationNo: vine
      .string()
      .trim()
      .toUpperCase()
      .minLength(3)
      .maxLength(50)
      .unique({
        table: 'cars',
        column: 'registration_no',
        filter: (db) => {
          db.whereNot('id', carId)
        },
      }),
    vinChassisNo: vine
      .string()
      .trim()
      .toUpperCase()
      .minLength(5)
      .maxLength(80)
      .unique({
        table: 'cars',
        column: 'vin_chassis_no',
        filter: (db) => {
          db.whereNot('id', carId)
        },
      }),
    engineNo: vine.string().trim().maxLength(80).nullable().optional(),
    transmission: vine.enum(TRANSMISSIONS).optional(),
    fuelType: vine.enum(FUEL_TYPES).optional(),
    fuelCapacityL: vine.number().min(0).max(500).nullable().optional(),
    seats: vine.number().min(1).max(100).optional(),
    doors: vine.number().min(0).max(10).optional(),
    luggage: vine.number().min(0).max(20).optional(),
    features: vine.array(vine.string().trim().maxLength(50)).optional(),
    purchaseDate: vine
      .date({ formats: ['YYYY-MM-DD'] })
      .nullable()
      .optional(),
    purchaseAmount: vine.number().min(0).nullable().optional(),
    ownership: vine.enum(OWNERSHIP_TYPES).optional(),
    publicTitle: vine.string().trim().maxLength(150).nullable().optional(),
    publicDescription: vine.string().trim().maxLength(2000).nullable().optional(),
    isListedOnline: vine.boolean().optional(),
  })
}

/**
 * Validator for changing a car's operational status (requires reason).
 */
export const updateCarStatusValidator = vine.create({
  status: vine.enum(CAR_STATUSES),
  reason: vine.string().trim().minLength(3).maxLength(255),
})

/**
 * Validator for recording an odometer reading.
 */
export const updateOdometerValidator = vine.create({
  odometerKm: vine.number().min(0),
  reason: vine.string().trim().maxLength(255).nullable().optional(),
})

/**
 * Validator for attaching an uploaded photo to a car.
 */
export const attachCarPhotoValidator = vine.create({
  fileId: vine.string().exists({ table: 'files', column: 'id' }),
  isCover: vine.boolean().optional(),
})

/**
 * Validator for reordering photos on a car.
 */
export const reorderPhotosValidator = vine.create({
  photoIds: vine.array(vine.string()),
})
