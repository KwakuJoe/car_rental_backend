import { BaseCommand, args } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { generateTemporaryPassword } from '#services/temporary_password_service'

/**
 * Server-side recovery tool for when a staff account is locked out and
 * there's no email-based reset flow. For day-to-day resets of other staff
 * accounts, admins use the `/admin/users/:id/reset-password` endpoint from
 * the frontend instead - this command exists for whoever has CLI/SSH
 * access to the install.
 */
export default class PasswordReset extends BaseCommand {
  static commandName = 'password:reset'
  static description =
    "Generate a new temporary password for a user's account and force a reset on next login"

  static options: CommandOptions = {
    startApp: true,
  }

  @args.string({ description: 'Email of the account to reset', required: false })
  declare email?: string

  async run() {
    // Imported lazily: ace eagerly imports every command file (e.g. for
    // `node ace list`) before the app has finished booting. `User` composes
    // `withAuthFinder(hash)` at class-definition time, which captures
    // whatever `hash` currently is - if that happens before the hash
    // provider's `booted` hook assigns it, password hashing breaks with
    // "Cannot read properties of undefined (reading 'use')".
    const { default: User } = await import('#models/user')

    const email =
      this.email ??
      (await this.prompt.ask('Email', {
        validate: (value) => (value.includes('@') ? true : 'Enter a valid email address'),
      }))

    const user = await User.findBy('email', email)
    if (!user) {
      this.logger.error(`No account found for "${email}"`)
      this.exitCode = 1
      return
    }

    const temporaryPassword = generateTemporaryPassword()
    user.password = temporaryPassword
    user.mustResetPassword = true
    await user.save()

    this.logger.success(`Temporary password generated for ${user.email}`)
    this.logger.log(`  Temporary password: ${temporaryPassword}`)
    this.logger.warning(
      'This password is shown only once. The user must change it on next login before accessing anything else.'
    )
  }
}
