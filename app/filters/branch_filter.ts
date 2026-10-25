import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import type Branch from '#models/branch'
import BaseFilter from '#filters/base_filter'

type BranchQuery = ModelQueryBuilderContract<typeof Branch>

export default class BranchFilter extends BaseFilter<typeof Branch> {
  apply(): BranchQuery {
    this.search()
    this.byBoolean('isMain', 'is_main')
    this.byBoolean('isActive', 'is_active')
    if (!this.get('sortBy')) {
      // Main branch first, then alphabetical
      this.query = this.query.orderBy('is_main', 'desc') as any
    }
    this.byOrderBy({ name: 'name', code: 'code', city: 'city', createdAt: 'created_at' }, 'name')
    return this.query as BranchQuery
  }

  private search(): void {
    const search = this.get('search')
    if (!search) return
    this.query = this.query.where((q) => {
      q.whereILike('name', `%${search}%`)
        .orWhereILike('code', `%${search}%`)
        .orWhereILike('city', `%${search}%`)
        .orWhereILike('address', `%${search}%`)
    }) as any
  }

  private byBoolean(param: string, column: string): void {
    const value = this.get(param)
    if (value === undefined || value === null) return
    this.query = this.query.where(column, value) as any
  }
}
