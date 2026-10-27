import env from '#start/env'
import { defineConfig, transports } from '@adonisjs/mail'

/**
 * Customer email over SMTP (same setup as the Assembly OS backend). Every
 * SMTP_* value is optional: without SMTP_HOST, MessageService records emails
 * as skipped instead of sending them (local dev, tests).
 */
const mailConfig = defineConfig({
  default: 'smtp',

  from: {
    address: env.get('MAIL_FROM_ADDRESS', 'no-reply@localhost'),
    name: env.get('MAIL_FROM_NAME', 'Car rental'),
  },

  mailers: {
    smtp: transports.smtp({
      host: env.get('SMTP_HOST', 'localhost'),
      port: env.get('SMTP_PORT', 587),
      secure: env.get('SMTP_SECURE', false),
      // IPv4 only: dual-stack hosts can time out trying IPv6 first
      localAddress: '0.0.0.0',
      auth: env.get('SMTP_USERNAME')
        ? { type: 'login', user: env.get('SMTP_USERNAME')!, pass: env.get('SMTP_PASSWORD')! }
        : undefined,
    }),
  },
})

export default mailConfig

declare module '@adonisjs/mail/types' {
  export interface MailersList extends InferMailers<typeof mailConfig> {}
}
