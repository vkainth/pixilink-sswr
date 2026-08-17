interface Props {
  emoji: string
  size?: number
  color?: string
  strokeWidth?: number
}

export default function PropIcon({ emoji, size = 24, color = 'currentColor', strokeWidth = 1.5 }: Props) {
  const p = {
    width: size,
    height: size,
    viewBox: '0 0 24 24' as const,
    fill: 'none' as const,
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    style: { display: 'inline-block', flexShrink: 0, verticalAlign: 'middle' },
  }

  const e = emoji.replace(/\uFE0F/g, '')

  switch (e) {
    case '🏡':
    case '🏠':
      return (
        <svg {...p}>
          <path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V10.5Z" />
          <path d="M9 21V12h6v9" />
        </svg>
      )
    case '🏘':
      return (
        <svg {...p}>
          <path d="M1 21V12L7 6.5l5 5V21" />
          <path d="M3 21v-7h8v7" />
          <path d="M14 21V10L19 5l4 5v11" />
          <path d="M16 21v-6h6v6" />
        </svg>
      )
    case '🏢':
      return (
        <svg {...p}>
          <path d="M6 22V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v19" />
          <path d="M2 22h20" />
          <path d="M10 7h1M14 7h1M10 11h1M14 11h1M10 15h1M14 15h1M10 19h1M14 19h1" />
        </svg>
      )
    case '🏆':
      return (
        <svg {...p}>
          <path d="M8 21h8M12 17v4" />
          <path d="M5 4H2v4a5 5 0 0 0 5 5" />
          <path d="M19 4h3v4a5 5 0 0 1-5 5" />
          <path d="M5 9c0 3.866 3.134 7 7 7s7-3.134 7-7V4H5v5Z" />
        </svg>
      )
    case '💼':
      return (
        <svg {...p}>
          <rect x="2" y="7" width="20" height="14" rx="2" />
          <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
          <path d="M2 13h20" />
        </svg>
      )
    case '📸':
    case '📷':
      return (
        <svg {...p}>
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      )
    case '⚡':
      return (
        <svg {...p}>
          <path d="M13 2L3 14h9l-1 8 10-12h-9z" />
        </svg>
      )
    case '🌊':
      return (
        <svg {...p}>
          <path d="M2 12c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0 3 2 4.5 0" />
          <path d="M2 17c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0 3 2 4.5 0" />
        </svg>
      )
    case '💎':
      return (
        <svg {...p}>
          <path d="M6 3h12l4 6-10 13L2 9z" />
          <path d="M2 9h20M6 3l4 6M18 3l-4 6" />
        </svg>
      )
    case '🔔':
      return (
        <svg {...p}>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      )
    case '📞':
      return (
        <svg {...p}>
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.72h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.02z" />
        </svg>
      )
    case '🔥':
      return (
        <svg {...p}>
          <path d="M12 2c0 6-8 7-8 13a8 8 0 0 0 16 0c0-6-8-7-8-13z" />
          <path d="M12 22v-4" />
        </svg>
      )
    case '📈':
      return (
        <svg {...p}>
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
          <polyline points="16 7 22 7 22 13" />
        </svg>
      )
    case '⚖':
      return (
        <svg {...p}>
          <path d="M12 3v18M4.5 8l7.5 7.5M19.5 8l-7.5 7.5" />
          <path d="M1.5 8h6l-3 6a3 3 0 0 1-3-6zM16.5 8h6a3 3 0 0 1-3 6l-3-6z" />
          <path d="M4 21h16" />
        </svg>
      )
    case '🌟':
    case '⭐':
      return (
        <svg {...p} fill={color}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke="none" />
        </svg>
      )
    default:
      return <span style={{ fontSize: size * 0.9, lineHeight: 1 }}>{emoji}</span>
  }
}
