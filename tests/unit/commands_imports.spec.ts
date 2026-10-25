import { test } from '@japa/runner'
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

/**
 * Ace imports every command file before the app boots. A command that imports a
 * model or service at the top of its file can define the User model before the
 * hash provider exists, which breaks password hashing for ALL commands in that
 * run (this broke business:create once). Commands must import app code lazily
 * inside run(). The functional tests can't catch this - they boot the app first.
 */
const ALLOWED_TOP_LEVEL = ['#services/temporary_password_service']

test('command files only import app code lazily inside run()', async ({ assert }) => {
  const dir = fileURLToPath(new URL('../../commands/', import.meta.url))
  for (const file of await readdir(dir)) {
    if (!file.endsWith('.ts')) continue
    const source = await readFile(`${dir}${file}`, 'utf-8')
    const offending = [
      ...source.matchAll(/^import\s.+from\s+'(#(?:models|services|database)\/[^']+)'/gm),
    ]
      .map((match) => match[1])
      .filter((path) => !ALLOWED_TOP_LEVEL.includes(path))
    assert.deepEqual(
      offending,
      [],
      `commands/${file} imports app code at the top: ${offending.join(', ')}`
    )
  }
})
