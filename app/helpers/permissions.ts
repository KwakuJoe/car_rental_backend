import type User from '#models/user'

/**
 * Same rule as the permission middleware, for checks inside a controller
 * (e.g. showing unmasked ID numbers): a per-user override wins either way,
 * then super admin, then the role's permissions.
 */
export async function userCan(user: User, slug: string): Promise<boolean> {
  await user.load((preloader) =>
    preloader.load('role', (roleQuery) => roleQuery.preload('permissions'))
  )
  const override = user.permissionsOverride?.[slug]
  if (override !== undefined) return override
  const role = user.role
  return (
    !!role && (role.isSuperAdmin || role.permissions.some((permission) => permission.slug === slug))
  )
}
