import { UserSchema } from '#database/schema'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import type { AccessToken } from '@adonisjs/auth/access_tokens'
import { belongsTo, column, manyToMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, ManyToMany } from '@adonisjs/lucid/types/relations'
import Role from '#models/role'
import Branch from '#models/branch'
import { withUlid } from '#models/mixins/with_ulid'
import { StaffTokensProvider } from '#services/staff_tokens_provider'

export default class User extends compose(UserSchema, withAuthFinder(hash), withUlid) {
  // 12 hours at most, and signed out after 2 idle hours (shared desk computers).
  // The frontend's session cookie lasts as long.
  static accessTokens = StaffTokensProvider.forStaff(User)
  declare currentAccessToken?: AccessToken

  /**
   * Per-user permission grants/denials layered on top of the user's role.
   * A slug set to `true` grants that permission even if the role doesn't
   * have it; `false` denies it even if the role (or isSuperAdmin) would
   * otherwise allow it. See app/middleware/permission_middleware.ts.
   */
  @column()
  declare permissionsOverride: Record<string, boolean> | null

  @belongsTo(() => Role)
  declare role: BelongsTo<typeof Role>

  /**
   * Branches this staff member works at. Every staff user is assigned to at
   * least the main branch (see UsersController#store and business:create).
   */
  @manyToMany(() => Branch, {
    pivotTable: 'branch_users',
    pivotTimestamps: true,
  })
  declare branches: ManyToMany<typeof Branch>

  get initials() {
    const [first, last] = this.fullName ? this.fullName.split(' ') : this.email.split('@')
    if (first && last) {
      return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
    }
    return `${first.slice(0, 2)}`.toUpperCase()
  }
}
