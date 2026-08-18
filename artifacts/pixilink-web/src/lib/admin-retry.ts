/**
 * Save helper for the AI generate-* routes.
 *
 * Those routes call Claude and only then POST the result to Laravel. The
 * Laravel admin API sits behind a shared, IP-keyed rate limiter
 * (throttle:600,1 on the whole `admin` prefix), so under load the save can come
 * back 429 — discarding a generation that has already been paid for.
 *
 * Retrying costs a few seconds. Not retrying costs a generation, silently.
 *
 * Only 429 is retried. Any other failure is the caller's to handle: a 500 or a
 * validation error will not fix itself by being repeated.
 */
export interface RetryOptions {
  /** Total attempts including the first. */
  attempts?: number
  /** First backoff step; doubles each attempt. */
  baseDelayMs?: number
  /** Ceiling for any single wait, including a server-sent Retry-After. */
  maxDelayMs?: number
}

export async function fetchRetryingOn429(
  url: string,
  init: RequestInit,
  { attempts = 4, baseDelayMs = 1000, maxDelayMs = 15000 }: RetryOptions = {},
): Promise<Response> {
  let res = await fetch(url, init)

  for (let attempt = 1; attempt < attempts && res.status === 429; attempt++) {
    // Prefer the server's own Retry-After when it sends one; fall back to
    // exponential backoff. Both are capped so a batch run cannot stall.
    const retryAfterHeader = Number(res.headers.get('Retry-After'))
    const delayMs = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
      ? Math.min(retryAfterHeader * 1000, maxDelayMs)
      : Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs)

    await new Promise(resolve => setTimeout(resolve, delayMs))
    res = await fetch(url, init)
  }

  return res
}
