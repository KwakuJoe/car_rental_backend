import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import type Role from '#models/role'
import BaseFilter from '#filters/base_filter'

type RoleQuery = ModelQueryBuilderContract<typeof Role>

export default class RoleFilter extends BaseFilter<typeof Role> {
  apply(): RoleQuery {
    this.search()
    this.byIsSystem()
    this.byIsSuperAdmin()
    this.byOrderBy(
      {
        name: 'name',
        slug: 'slug',
        createdAt: 'created_at',
      },
      'name'
    )
    return this.query as RoleQuery
  }

  private search(): void {
    const search = this.get('search')
    if (!search) return
    this.query = this.query.where((q) => {
      q.whereILike('name', `%${search}%`).orWhereILike('slug', `%${search}%`)
    }) as any
  }

  private byIsSystem(): void {
    const isSystem = this.get('isSystem')
    if (isSystem === undefined || isSystem === null) return
    this.query = this.query.where('is_system', isSystem) as any
  }

  private byIsSuperAdmin(): void {
    const isSuperAdmin = this.get('isSuperAdmin')
    if (isSuperAdmin === undefined || isSuperAdmin === null) return
    this.query = this.query.where('is_super_admin', isSuperAdmin) as any
  }
}
