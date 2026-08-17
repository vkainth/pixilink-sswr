interface Props {
  eyebrow?: string
  title: string
  subtitle?: string
  actionHref?: string
  actionLabel?: string
}

export default function SectionHeader({ eyebrow, title, subtitle, actionHref, actionLabel }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32, gap: 16 }}>
      <div>
        {eyebrow && (
          <div style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 8 }}>
            {eyebrow}
          </div>
        )}
        <h2 style={{ fontSize: 'clamp(22px,2.8vw,32px)', fontWeight: 700, color: 'var(--primary-bg)', lineHeight: 1.15 }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 6 }}>{subtitle}</p>
        )}
      </div>
      {actionHref && (
        <a href={actionHref}
          style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--accent)', textDecoration: 'none', whiteSpace: 'nowrap', borderBottom: '1px solid var(--accent)', paddingBottom: 2, flexShrink: 0 }}>
          {actionLabel || 'View All'}
        </a>
      )}
    </div>
  )
}
