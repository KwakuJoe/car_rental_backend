import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import type Category from '#models/category'
import BaseFilter from '#filters/base_filter'

type CategoryQuery = ModelQueryBuilderContract<typeof Category>

export default class CategoryFilter extends BaseFilter<typeof Category> {
  apply(): CategoryQuery {
    this.search()
    this.byBoolean('active', 'active')
    this.byBoolean('selfDriveAllowed', 'self_drive_allowed')
    this.byOrderBy(
      {
        sortOrder: 'sort_order',
        name: 'name',
        createdAt: 'created_at',
      },
      'sortOrder'
    )
    return this.query as CategoryQuery
  }

  private search(): void {
    const search = this.get('search')
    if (!search) return
    this.query = this.query.where((q) => {
      q.whereILike('name', `%${search}%`)
        .orWhereILike('slug', `%${search}%`)
        .orWhereILike('description', `%${search}%`)
    }) as any
  }

  private byBoolean(param: string, column: string): void {
    const value = this.get(param)
    if (value === undefined || value === null) return
    this.query = this.query.where(column, value) as any
  }
}
