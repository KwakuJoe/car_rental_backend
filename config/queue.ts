import env from '#start/env'
import { defineConfig, drivers } from '@adonisjs/queue'

/**
 * Background jobs: sending SMS / email and the recurring checks (hold
 * expiry, overdue returns, document expiry). Jobs live in Postgres (no
 * Redis); `node ace queue:work` runs them. Tests use `sync` (inline).
 */
export default defineConfig({
  default: env.get('QUEUE_DRIVER', 'database'),

  adapters: {
    database: drivers.database({
      connectionName: 'pg',
    }),
    sync: drivers.sync(),
  },

  worker: {
    concurrency: 5,
    idleDelay: '2s',
    timeout: '2m',
  },

  locations: ['./app/jobs/**/*.{ts,js}'],
})
