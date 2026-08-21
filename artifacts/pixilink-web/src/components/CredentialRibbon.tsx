import { agentLanguages, type AgentProfile } from '@/lib/types'

interface Props {
  agent: AgentProfile
}

export default function CredentialRibbon({ agent }: Props) {
  const settings = agent.settings
  const licensedSince = settings?.licensed_since?.trim()
  const languages = agentLanguages(settings?.languages)
  const licenseNumber = agent.license_number?.trim()
  const brokerage = agent.brokerage?.trim()

  const items: { label: string; value: string }[] = []
  if (brokerage) items.push({ label: 'Brokerage', value: brokerage })
  if (licenseNumber) items.push({ label: 'BCFSA Licence', value: licenseNumber })
  if (licensedSince) {
    const yearsActive = new Date().getFullYear() - parseInt(licensedSince, 10)
    items.push({ label: 'Licensed Since', value: `${licensedSince}${yearsActive > 0 ? ` · ${yearsActive} yrs` : ''}` })
  }
  if (languages.length > 0) items.push({ label: 'Languages', value: languages.join(', ') })

  if (items.length === 0) return null

  return (
    <div
      role="region"
      aria-label="Agent credentials"
      style={{
        background: '#f8f8f6',
        borderBottom: '1px solid #e5e7eb',
        padding: '14px 0',
      }}
    >
      <div className="container">
        <div
          className="credential-ribbon-inner"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px 32px',
            alignItems: 'center',
          }}
        >
          {items.map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                  color: '#767676',
                }}
              >
                {item.label}
              </span>
              <span style={{ fontSize: 10, color: '#767676', letterSpacing: 0.5 }}>·</span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--primary-bg)',
                }}
              >
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @media (max-width: 640px) {
          .credential-ribbon-inner { gap: 6px 20px !important; }
        }
      `}</style>
    </div>
  )
}
