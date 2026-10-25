/*
|--------------------------------------------------------------------------
| Define HTTP limiters
|--------------------------------------------------------------------------
|
| The "limiter.define" method creates an HTTP middleware to apply rate
| limits on a route or a group of routes.
|
*/

import limiter from '@adonisjs/limiter/services/main'

/**
 * Brute-force protection for POST /auth/login: 5 attempts per minute for the
 * same IP + email, then locked out for 15 minutes. Keyed on both so one
 * office sharing a public IP doesn't lock everyone out because of one
 * person's typos. The IP comes from X-Forwarded-For when the request is
 * forwarded by a trusted proxy (the Next.js frontend on the same machine -
 * loopback is trusted by default, see config/app.ts http.trustProxy).
 */
export const loginThrottle = limiter.define('login', (ctx) => {
  const email = String(ctx.request.input('email', '')).trim().toLowerCase()
  return limiter
    .allowRequests(5)
    .every('1 minute')
    .blockFor('15 minutes')
    .usingKey(`login_${ctx.request.ip()}_${email}`)
})
