import { timingSafeEqual } from 'node:crypto'
import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'

const matches = (given: string, expected: string) => {
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** The request came from our Next.js server (it knows PROXY_SECRET). */
export function fromFrontend(ctx: HttpContext) {
  const secret = env.get('PROXY_SECRET')
  const given = ctx.request.header('x-proxy-secret')
  return !!secret && !!given && matches(given, secret)
}

/**
 * The visitor's IP. Browsers reach us through the Next.js server, so the
 * socket address is the frontend's; it tells us the visitor's in
 * X-Client-IP, believed only with the shared secret (otherwise anyone could
 * claim any address and slip past the rate limits). Without a secret
 * configured (local development) it's the usual request IP.
 */
export function clientIp(ctx: HttpContext) {
  const claimed = ctx.request.header('x-client-ip')?.trim()
  if (claimed && claimed.length <= 64 && fromFrontend(ctx)) return claimed
  return ctx.request.ip()
}
