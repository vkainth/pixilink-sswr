import React from 'react'

/**
 * Curated icon library for trust chips + agent highlights.
 * Shared between the admin icon picker and the agent homepage renderer so
 * both always agree on what each icon id looks like.
 */
export type TrustIconId =
  | 'star'
  | 'house'
  | 'calendar'
  | 'trophy'
  | 'medal'
  | 'globe'
  | 'chart'
  | 'badge-check'
  | 'users'
  | 'handshake'

export const TRUST_ICON_OPTIONS: { id: TrustIconId; label: string }[] = [
  { id: 'star', label: '★ Star' },
  { id: 'house', label: '🏠 House' },
  { id: 'calendar', label: '📅 Calendar' },
  { id: 'trophy', label: '🏆 Trophy' },
  { id: 'medal', label: '🥇 Medal' },
  { id: 'globe', label: '🌐 Globe / Language' },
  { id: 'chart', label: '📈 Chart Up' },
  { id: 'badge-check', label: '✔ Badge Check' },
  { id: 'users', label: '👥 Users' },
  { id: 'handshake', label: '🤝 Handshake' },
]

const TRUST_ICON_IDS = new Set<string>(TRUST_ICON_OPTIONS.map((o) => o.id))

export function normalizeTrustIcon(icon?: string | null): TrustIconId {
  return icon && TRUST_ICON_IDS.has(icon) ? (icon as TrustIconId) : 'star'
}

function strokeProps(size: number, color: string): React.SVGProps<SVGSVGElement> {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    style: { color, flexShrink: 0 },
  }
}

/**
 * Renders the inline SVG for a given icon id. Defaults to the gold star used
 * by the original hardcoded trust chips when the id is missing/unknown —
 * this is what keeps legacy plain-string chip data rendering correctly.
 */
export function TrustIcon({ icon, size = 14, color = '#c9a84c' }: { icon?: string | null; size?: number; color?: string }) {
  const id = normalizeTrustIcon(icon)
  switch (id) {
    case 'house':
      return (
        <svg {...strokeProps(size, color)}>
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      )
    case 'calendar':
      return (
        <svg {...strokeProps(size, color)}>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      )
    case 'trophy':
      return (
        <svg {...strokeProps(size, color)}>
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
          <path d="M4 22h16" />
          <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
        </svg>
      )
    case 'medal':
      return (
        <svg {...strokeProps(size, color)}>
          <circle cx="12" cy="8" r="6" />
          <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
        </svg>
      )
    case 'globe':
      return (
        <svg {...strokeProps(size, color)}>
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      )
    case 'chart':
      return (
        <svg {...strokeProps(size, color)}>
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
      )
    case 'badge-check':
      return (
        <svg {...strokeProps(size, color)}>
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      )
    case 'users':
      return (
        <svg {...strokeProps(size, color)}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    case 'handshake':
      return (
        <svg {...strokeProps(size, color)}>
          <path d="m11 17 2 2a1 1 0 1 0 3-3" />
          <path d="m21 3-2.5 2.5" />
          <path d="M3 21l2.5-2.5" />
          <path d="m14 16 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 7" />
          <path d="m3 3-1 11 6.5 6.5a1 1 0 1 0 3-3" />
        </svg>
      )
    case 'star':
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ color, flexShrink: 0 }}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      )
  }
}
