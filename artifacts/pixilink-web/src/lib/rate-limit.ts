interface RateEntry {
  count: number
  windowStart: number
}

const store = new Map<string, RateEntry>()

/**
 * In-process sliding-window rate limiter.
 *
 * @param ip      - Client IP address (used to namespace the key)
 * @param key     - Route/action identifier (e.g. "contact", "inquiry")
 * @param max     - Maximum allowed requests per window
 * @param windowMs - Window length in milliseconds
 * @returns true if the caller is over the limit and should be rejected
 */
export function rateLimit(ip: string, key: string, max: number, windowMs: number): boolean {
  const storeKey = `${key}:${ip}`
  const now = Date.now()
  const entry = store.get(storeKey)

  if (!entry || now - entry.windowStart > windowMs) {
    store.set(storeKey, { count: 1, windowStart: now })
    return false
  }

  if (entry.count >= max) {
    return true
  }

  entry.count++
  return false
}

/**
 * Extract the client IP from a Next.js / Edge request.
 * Reads x-forwarded-for first (set by proxies/Varnish), falls back to "unknown".
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return 'unknown'
}
