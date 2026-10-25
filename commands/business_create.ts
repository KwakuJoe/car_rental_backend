import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'
import { generateTemporaryPassword } from '#services/temporary_password_service'

/**
 * Default opening hours for the main branch, editable later from the admin.
 * 0 = Sunday ... 6 = Saturday.
 */
const DEFAULT_OPENING_HOURS = [
  { weekday: 0, opensAt: null, closesAt: null, isClosed: true },
  { weekday: 1, opensAt: '08:00', closesAt: '18:00', isClosed: false },
  { weekday: 2, opensAt: '08:00', closesAt: '18:00', isClosed: false },
  { weekday: 3, opensAt: '08:00', closesAt: '18:00', isClosed: false },
  { weekday: 4, opensAt: '08:00', closesAt: '18:00', isClosed: false },
  { weekday: 5, opensAt: '08:00', closesAt: '18:00', isClosed: false },
  { weekday: 6, opensAt: '09:00', closesAt: '15:00', isClosed: false },
]

export default class BusinessCreate extends BaseCommand {
  static commandName = 'business:create'
  static description =
    'Bootstrap this install: the car rental business, its main branch, roles, and the owner account'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    // Imported lazily: ace eagerly imports every command file (e.g. for
    // `node ace list`) before the app has finished booting. `User` composes
    // `withAuthFinder(hash)` at class-definition time, which captures
    // whatever `hash` currently is - if that happens before the hash
    // provider's `booted` hook assigns it, password hashing breaks with
    // "Cannot read properties of undefined (reading 'use')". Importing here,
    // inside `run()`, guarantees the app is fully booted first.
    const { default: Business } = await import('#models/business')
    const { default: Branch } = await import('#models/branch')
    const { default: OpeningHour } = await import('#models/opening_hour')
    const { default: Role } = await import('#models/role')
    const { default: User } = await import('#models/user')
    const { default: RolePermissionSeeder } =
      await import('#database/seeders/role_permission_seeder')

    const existingBusiness = await Business.first()
    if (existingBusiness) {
      this.logger.error(
        `This install is already set up for "${existingBusiness.name}". Only one business is supported per install.`
      )
      this.exitCode = 1
      return
    }

    this.logger.info('Setting up your car rental business')

    const name = await this.prompt.ask('Business name', {
      validate: (value) => (value.trim().length >= 2 ? true : 'Business name is required'),
    })
    const email = await this.prompt.ask('Business email', {
      validate: (value) => (value.includes('@') ? true : 'Enter a valid email address'),
    })
    const phone = await this.prompt.ask('Business phone (optional)')
    const city = await this.prompt.ask('City', { default: 'Accra' })
    const region = await this.prompt.ask('Region', { default: 'Greater Accra' })

    const ownerName = await this.prompt.ask('Owner name', {
      validate: (value) => (value.trim().length >= 2 ? true : 'Name is required'),
    })
    const ownerEmail = await this.prompt.ask('Owner email', {
      validate: (value) => (value.includes('@') ? true : 'Enter a valid email address'),
    })

    if (await User.findBy('email', ownerEmail)) {
      this.logger.error(`An account with the email "${ownerEmail}" already exists.`)
      this.exitCode = 1
      return
    }

    const temporaryPassword = generateTemporaryPassword()

    const { business, branch, owner } = await db.transaction(async (trx) => {
      const newBusiness = await Business.create(
        {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          city: city.trim() || null,
          region: region.trim() || null,
        },
        { client: trx }
      )

      const mainBranch = await Branch.create(
        {
          businessId: newBusiness.id,
          name: `${newBusiness.name} - Main Branch`,
          code: 'MAIN',
          isMain: true,
          email: newBusiness.email,
          phone: newBusiness.phone,
          city: newBusiness.city,
          region: newBusiness.region,
        },
        { client: trx }
      )

      await OpeningHour.createMany(
        DEFAULT_OPENING_HOURS.map((hours) => ({ ...hours, branchId: mainBranch.id })),
        { client: trx }
      )

      await new RolePermissionSeeder(trx).run()
      const ownerRole = await Role.query({ client: trx }).where('slug', 'owner').firstOrFail()

      const newOwner = await User.create(
        {
          fullName: ownerName.trim(),
          email: ownerEmail.trim(),
          password: temporaryPassword,
          roleId: ownerRole.id,
          mustResetPassword: true,
        },
        { client: trx }
      )
      await newOwner.related('branches').attach([mainBranch.id])

      return { business: newBusiness, branch: mainBranch, owner: newOwner }
    })

    this.logger.success(`"${business.name}" is set up with main branch "${branch.name}"`)
    this.logger.log(`  Owner email:        ${owner.email}`)
    this.logger.log(`  Temporary password: ${temporaryPassword}`)
    this.logger.warning(
      'This password is shown only once. The owner must change it on first login before accessing anything else.'
    )
  }
}
