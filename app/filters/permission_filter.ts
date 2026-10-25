import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import type Permission from '#models/permission'
import BaseFilter from '#filters/base_filter'

type PermissionQuery = ModelQueryBuilderContract<typeof Permission>

export default class PermissionFilter extends BaseFilter<typeof Permission> {
  apply(): PermissionQuery {
    this.search()
    this.byGroup()
    this.byOrderBy(
      {
        slug: 'slug',
        name: 'name',
        createdAt: 'created_at',
      },
      'slug'
    )
    return this.query as PermissionQuery
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

  private byGroup(): void {
    const group = this.get('group')
    if (!group) return
    this.query = this.query.where('group', group) as any
  }
}
