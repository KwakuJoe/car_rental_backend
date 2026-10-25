import { randomBytes } from 'node:crypto'

/**
 * Generates a random temporary password for newly created staff accounts.
 * Recipients are always forced to change it (see `mustResetPassword`) before
 * they can use the system, so this only needs to satisfy the password
 * validator's length rule, not be memorable.
 */
export function generateTemporaryPassword(): string {
  return randomBytes(9).toString('base64url')
}
