import { AccessToken, DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
import type { DbAccessTokensProviderOptions } from '@adonisjs/auth/types/access_tokens'
import type { Secret } from '@adonisjs/core/helpers'
import db from '@adonisjs/lucid/services/db'
import type { LucidModel } from '@adonisjs/lucid/types/model'

/** Staff are signed out after this long without using the app (shared desk computers) */
export const IDLE_MINUTES = 120
/** ...and after this long whatever happens (about one shift) */
export const SESSION_HOURS = 12

/**
 * Staff sign-in tokens that also run out when unused: the stock provider
 * checks only the absolute expiry. A token idle for longer than
 * IDLE_MINUTES is deleted and refused, so a desk computer left signed in
 * doesn't stay open. "Used" means a request the person made - not an open
 * page refreshing itself (X-Background, see AuthMiddleware). The idle check
 * runs only after the secret matches, so nobody can sign others out by
 * guessing token ids.
 */
export class StaffTokensProvider<Model extends LucidModel> extends DbAccessTokensProvider<Model> {
  static forStaff<Model extends LucidModel>(
    model: DbAccessTokensProviderOptions<Model>['tokenableModel']
  ) {
    return new StaffTokensProvider<Model>({
      tokenableModel: model,
      expiresIn: `${SESSION_HOURS} hours`,
    })
  }

  async verify(tokenValue: Secret<string>): Promise<AccessToken | null> {
    const decoded = AccessToken.decode(this.prefix, tokenValue.release())
    if (!decoded) return null
    const client = await this.getDb()
    const row = await client
      .query()
      .from(this.table)
      .where({ id: decoded.identifier, type: this.type })
      .first()
    if (!row) return null
    const token = this.dbRowToAccessToken(row)
    if (!token.verify(decoded.secret) || token.isExpired()) return null

    const lastUsed = new Date(row.last_used_at ?? row.created_at).getTime()
    if (Date.now() - lastUsed > IDLE_MINUTES * 60_000) {
      await client.from(this.table).where({ id: row.id, type: row.type }).delete()
      return null
    }
    // Use is recorded by the auth middleware (touch), which skips background refreshes
    return token
  }

  /** The staff member used the app just now (not an automatic refresh of an open page). */
  async touch(identifier: string | number | BigInt) {
    const client = await this.getDb()
    await client
      .from(this.table)
      .where({ id: String(identifier), type: this.type })
      .update({ last_used_at: new Date() })
  }
}

/**
 * Signs a staff member out everywhere (all their tokens), optionally keeping
 * the one in use - after a password reset or change, or a deactivation.
 */
export async function signOutEverywhere(
  user: { id: string | number },
  options: { except?: string | number | BigInt | null } = {}
) {
  const query = db.from('auth_access_tokens').where('tokenable_id', user.id)
  if (options.except !== undefined && options.except !== null) {
    query.whereNot('id', String(options.except))
  }
  await query.delete()
}
