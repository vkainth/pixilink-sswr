/**
 * Form engagement tracking, for the daily funnel report.
 *
 * The point is to show interest that never became a lead: someone who started filling a
 * form and walked away is evidence of demand, and today that person is invisible.
 *
 * Two events per form:
 *   form_start   - fired ONCE, on the first real keystroke. Not on focus: focus fires from
 *                  tabbing past a field or an autofill pass, which would inflate the count
 *                  with people who never intended to fill anything in.
 *   form_abandon - fired on page hide if the form was started and never submitted.
 *
 * A submitted form fires start with no abandon, so:  abandons = starts - submissions.
 *
 * Deliberately anonymous: no field values, no partial email or phone, no identifier. It
 * answers "how many people tried", which is the question, and nothing about who they were.
 */

const BEACON_PATH = '/api/sold-gate-event'

type FormId = string

const started = new Set<FormId>()
const submitted = new Set<FormId>()
let listenerBound = false

function send(event: 'form_start' | 'form_abandon', agentSlug?: string, useBeacon = false) {
  const url = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}${BEACON_PATH}`
  const body = JSON.stringify({ event, agent_slug: agentSlug ?? null })

  // On page hide, fetch() is routinely killed mid-flight. sendBeacon survives unload,
  // which is the whole reason abandonment is measurable at all.
  if (useBeacon && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    try {
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }))
      return
    } catch {
      // fall through to fetch
    }
  }

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {})
}

function bindOnce() {
  if (listenerBound || typeof document === 'undefined') return
  listenerBound = true

  const flush = () => {
    started.forEach(id => {
      if (!submitted.has(id)) {
        const slug = id.includes('|') ? id.split('|')[1] : undefined
        send('form_abandon', slug || undefined, true)
      }
    })
    // Clear so a restored page (back/forward cache) cannot double-count.
    started.clear()
  }

  // visibilitychange + pagehide together: visibilitychange is the reliable one on mobile
  // Safari, pagehide covers desktop navigation. beforeunload is deliberately not used —
  // it is unreliable on mobile and can block the navigation.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
  })
  window.addEventListener('pagehide', flush)
}

/** Call on the first real keystroke in a form. Safe to call repeatedly — only fires once. */
export function markFormStarted(formName: string, agentSlug?: string) {
  const id = `${formName}|${agentSlug ?? ''}`
  if (started.has(id)) return
  started.add(id)
  bindOnce()
  send('form_start', agentSlug)
}

/** Call when the form submits successfully, so it is not counted as abandoned. */
export function markFormSubmitted(formName: string, agentSlug?: string) {
  submitted.add(`${formName}|${agentSlug ?? ''}`)
}
