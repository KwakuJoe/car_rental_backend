import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import type User from '#models/user'
import BaseFilter from '#filters/base_filter'

type UserQuery = ModelQueryBuilderContract<typeof User>

export default class UserFilter extends BaseFilter<typeof User> {
  apply(): UserQuery {
    this.search()
    this.byRoleId()
    this.byBranchId()
    this.byIsActive()
    this.byMustResetPassword()
    this.byDateRange('created_at', 'createdFrom', 'createdTo')
    this.byOrderBy(
      {
        fullName: 'full_name',
        email: 'email',
        createdAt: 'created_at',
        lastLoginAt: 'last_login_at',
      },
      'created_at'
    )
    return this.query as UserQuery
  }

  private search(): void {
    const search = this.get('search')
    if (!search) return
    this.query = this.query.where((q) => {
      q.whereILike('full_name', `%${search}%`)
        .orWhereILike('email', `%${search}%`)
        .orWhereILike('phone', `%${search}%`)
    }) as any
  }

  private byRoleId(): void {
    const roleId = this.get('roleId')
    if (!roleId) return
    this.query = this.query.where('role_id', roleId) as any
  }

  private byBranchId(): void {
    const branchId = this.get('branchId')
    if (!branchId) return
    this.query = this.query.whereHas('branches', (q) => {
      q.where('branches.id', branchId)
    }) as any
  }

  private byIsActive(): void {
    const isActive = this.get('isActive')
    if (isActive === undefined || isActive === null) return
    this.query = this.query.where('is_active', isActive) as any
  }

  private byMustResetPassword(): void {
    const mustResetPassword = this.get('mustResetPassword')
    if (mustResetPassword === undefined || mustResetPassword === null) return
    this.query = this.query.where('must_reset_password', mustResetPassword) as any
  }
}
