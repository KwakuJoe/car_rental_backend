import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import type Car from '#models/car'
import BaseFilter from '#filters/base_filter'

type CarQuery = ModelQueryBuilderContract<typeof Car>

export default class CarFilter extends BaseFilter<typeof Car> {
  apply(): CarQuery {
    this.search()
    this.byExact('categoryId', 'category_id')
    this.byExact('branchId', 'branch_id')
    this.byExact('status', 'status')
    this.byExact('transmission', 'transmission')
    this.byExact('fuelType', 'fuel_type')
    this.byBoolean('isListedOnline', 'is_listed_online')

    const includeArchived = this.get('includeArchived')
    if (!includeArchived) {
      this.query = this.query.whereNull('archived_at') as any
    }

    this.byOrderBy(
      {
        make: 'make',
        model: 'model',
        year: 'year',
        registrationNo: 'registration_no',
        currentOdometerKm: 'current_odometer_km',
        status: 'status',
        createdAt: 'created_at',
      },
      'createdAt',
      'desc'
    )

    return this.query as CarQuery
  }

  private search(): void {
    const search = this.get('search')
    if (!search) return
    this.query = this.query.where((q) => {
      q.whereILike('registration_no', `%${search}%`)
        .orWhereILike('make', `%${search}%`)
        .orWhereILike('model', `%${search}%`)
        .orWhereILike('public_title', `%${search}%`)
        .orWhereILike('vin_chassis_no', `%${search}%`)
    }) as any
  }

  private byExact(param: string, column: string): void {
    const value = this.get(param)
    if (!value) return
    this.query = this.query.where(column, value) as any
  }

  private byBoolean(param: string, column: string): void {
    const value = this.get(param)
    if (value === undefined || value === null) return
    this.query = this.query.where(column, value) as any
  }
}
