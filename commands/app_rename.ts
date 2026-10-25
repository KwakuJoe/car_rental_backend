import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

/**
 * Run once, right after pulling this template into a new project
 * (`npm init adonisjs@latest my-app -- -K github:<user>/<repo>` doesn't run
 * any post-scaffold hooks of its own - `package.json`'s name already gets
 * set to the destination folder name for free, but the database names in
 * .env don't, so this fills that gap).
 */
export default class AppRename extends BaseCommand {
  static commandName = 'app:rename'
  static description = 'Rename this project (package.json name, database names in .env)'

  static options: CommandOptions = {
    startApp: false,
  }

  async run() {
    const projectName = await this.prompt.ask('Project name', {
      default: 'my-app',
      validate: (value) => (value.trim().length > 0 ? true : 'Project name is required'),
    })

    const slug = projectName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    const dbSlug = slug.replace(/-/g, '_')

    const root = fileURLToPath(new URL('../', import.meta.url))

    const packageJsonPath = `${root}package.json`
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'))
    packageJson.name = slug
    await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)

    const envPath = `${root}.env`
    try {
      const env = await readFile(envPath, 'utf-8')
      await writeFile(envPath, env.replace(/^DB_DATABASE=.*$/m, `DB_DATABASE=${dbSlug}_db`))
    } catch {
      this.logger.warning('No .env file found - skipping database name update')
    }

    const envTestPath = `${root}.env.test`
    try {
      const envTest = await readFile(envTestPath, 'utf-8')
      await writeFile(
        envTestPath,
        envTest.replace(/^DB_DATABASE=.*$/m, `DB_DATABASE=${dbSlug}_db_test`)
      )
    } catch {
      // .env.test is optional - skip silently if it isn't there
    }

    this.logger.success(`Project renamed to "${slug}"`)
  }
}
