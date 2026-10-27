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

/**
 * The public website (no login). Browsing is generous; making a booking,
 * saying "I've paid" and looking a booking up are tight, per IP - each of
 * those holds a car, alerts staff or sends an SMS.
 */
export const publicReadThrottle = limiter.define('public_read', (ctx) =>
  limiter.allowRequests(120).every('1 minute').usingKey(`public_read_${ctx.request.ip()}`)
)

export const publicBookThrottle = limiter.define('public_book', (ctx) =>
  limiter
    .allowRequests(5)
    .every('10 minutes')
    .blockFor('30 minutes')
    .usingKey(`public_book_${ctx.request.ip()}`)
)

export const publicPayThrottle = limiter.define('public_pay', (ctx) =>
  limiter.allowRequests(10).every('10 minutes').usingKey(`public_pay_${ctx.request.ip()}`)
)

export const publicLookupThrottle = limiter.define('public_lookup', (ctx) =>
  limiter
    .allowRequests(5)
    .every('15 minutes')
    .blockFor('30 minutes')
    .usingKey(`public_lookup_${ctx.request.ip()}`)
)
