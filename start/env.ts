/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  // Node
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.string(),

  // App
  APP_KEY: Env.schema.secret(),
  APP_URL: Env.schema.string({ format: 'url', tld: false }),

  // Session
  SESSION_DRIVER: Env.schema.enum(['cookie', 'memory', 'database'] as const),

  // Database (Postgres)
  DB_HOST: Env.schema.string({ format: 'host' }),
  DB_PORT: Env.schema.number(),
  DB_USER: Env.schema.string(),
  DB_PASSWORD: Env.schema.string.optional(),
  DB_DATABASE: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Variables for configuring the limiter package
  |----------------------------------------------------------
  */
  LIMITER_STORE: Env.schema.enum(['database', 'memory'] as const),
  // Shared with the Next.js frontend: proves its X-Client-IP header (the
  // visitor's address) so rate limits count visitors, not the frontend server
  PROXY_SECRET: Env.schema.string.optional(),

  /*
  |----------------------------------------------------------
  | Queue: database (jobs in Postgres, run by `node ace queue:work`) or
  | sync (run inline - tests). Default: database
  |----------------------------------------------------------
  */
  QUEUE_DRIVER: Env.schema.enum.optional(['database', 'sync'] as const),

  // Cloudinary (file storage)
  /*
  |----------------------------------------------------------
  | Customer messages (all optional: unset = recorded as skipped, not sent)
  |----------------------------------------------------------
  */
  // The public website, for links in SMS / email (e.g. https://wynk.com.gh)
  WEBSITE_URL: Env.schema.string.optional({ format: 'url', tld: false }),
  MNOTIFY_API_KEY: Env.schema.secret.optional(),
  MNOTIFY_SENDER_ID: Env.schema.string.optional(),
  MAIL_FROM_NAME: Env.schema.string.optional(),
  MAIL_FROM_ADDRESS: Env.schema.string.optional(),
  SMTP_HOST: Env.schema.string.optional(),
  SMTP_PORT: Env.schema.number.optional(),
  SMTP_USERNAME: Env.schema.string.optional(),
  SMTP_PASSWORD: Env.schema.string.optional(),
  SMTP_SECURE: Env.schema.boolean.optional(),

  CLOUDINARY_CLOUD_NAME: Env.schema.string.optional(),
  CLOUDINARY_API_KEY: Env.schema.string.optional(),
  CLOUDINARY_API_SECRET: Env.schema.secret.optional(),
})
