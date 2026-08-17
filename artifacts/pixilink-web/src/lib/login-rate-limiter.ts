const MAX_ATTEMPTS = 5
const LOCK_DURATION_MS = 15 * 60 * 1000
const EVICT_AFTER_MS = 30 * 60 * 1000

interface Entry {
  attempts: number
  lockedUntil: number
  lastSeen: number
}

const store = new Map<string, Entry>()

function evict() {
  const now = Date.now()
  for (const [ip, entry] of store) {
    if (now - entry.lastSeen > EVICT_AFTER_MS) {
      store.delete(ip)
    }
  }
}

export function checkLimit(ip: string): { ok: boolean; remaining: number; retryAfterMs: number } {
  evict()
  const now = Date.now()
  const entry = store.get(ip)

  if (!entry) return { ok: true, remaining: MAX_ATTEMPTS, retryAfterMs: 0 }

  if (entry.lockedUntil > now) {
    return { ok: false, remaining: 0, retryAfterMs: entry.lockedUntil - now }
  }

  // Lock has expired — reset the entry so the counter starts fresh
  if (entry.lockedUntil > 0 && entry.lockedUntil <= now) {
    store.delete(ip)
    return { ok: true, remaining: MAX_ATTEMPTS, retryAfterMs: 0 }
  }

  const remaining = Math.max(0, MAX_ATTEMPTS - entry.attempts)
  return { ok: remaining > 0, remaining, retryAfterMs: 0 }
}

export function recordFailure(ip: string): void {
  const now = Date.now()
  const entry = store.get(ip) ?? { attempts: 0, lockedUntil: 0, lastSeen: now }
  entry.attempts += 1
  entry.lastSeen = now
  if (entry.attempts >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCK_DURATION_MS
  }
  store.set(ip, entry)
}

export function recordSuccess(ip: string): void {
  store.delete(ip)
}

export function getClientIp(req: Request): string {
  const cf = (req.headers as Headers).get('cf-connecting-ip')
  if (cf) return cf
  const xff = (req.headers as Headers).get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return 'unknown'
}
