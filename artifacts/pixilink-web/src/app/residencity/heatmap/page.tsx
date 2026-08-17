import { ResidencityHeatmapWidget } from '@/components/ResidencityClientWidgets'
import ResidencityNav from '@/components/ResidencityNav'

export const metadata = {
  title: 'Metro Vancouver Sold Heatmap — Residencity',
  description: 'Full-screen heatmap of sold properties across Metro Vancouver and Fraser Valley. Filter by type, price, bedrooms, and year built.',
}

export default function HeatmapFullPage() {
  return (
    <div style={{ background: '#0d1729', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <ResidencityNav />
      <div style={{ paddingTop: 'var(--nav-height)', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Rate strip */}
        <div style={{
          background: '#0a1220', borderBottom: '1px solid rgba(255,255,255,0.07)',
          padding: '8px clamp(16px,4vw,48px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8,
        }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Bank of Canada rate: 2.75%</span>
            {' · '}Est. monthly payment on $800K mortgage: ~$3,880/mo
          </div>
          <a href="/residencity" style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>← Back to Dashboard</a>
        </div>

        <div style={{ padding: 'clamp(16px,2vw,24px) clamp(16px,4vw,48px)', flex: 1 }}>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h1 style={{ fontSize: 'clamp(18px,2.5vw,24px)', fontWeight: 700, color: '#fff', margin: 0 }}>Metro Vancouver Sold Heatmap</h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '4px 0 0' }}>
                Surrey · White Rock · Langley · Delta · Abbotsford · Burnaby · Coquitlam · Richmond · Vancouver · North Van · West Van · Maple Ridge · Pitt Meadows
              </p>
            </div>
          </div>
          <ResidencityHeatmapWidget fullscreen />
        </div>
      </div>
    </div>
  )
}
