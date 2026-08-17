export default function SuspendedSite({ agentName }: { agentName?: string }) {
  return (
    <div style={{
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      background: '#0f172a',
      color: '#e2e8f0',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <style>{`
        body { margin: 0; background: #0f172a !important; }
      `}</style>
      <div style={{
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '16px',
        padding: '48px 40px',
        maxWidth: '500px',
        width: '100%',
        textAlign: 'center',
      }}>
        <div style={{
          width: '64px', height: '64px',
          background: '#2d1b1b',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
          fontSize: '28px',
        }}>🔒</div>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#f1f5f9', marginBottom: '12px' }}>
          Site Temporarily Unavailable
        </h1>
        <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
          {agentName ? `${agentName}'s` : 'This'} real estate site is temporarily
          unavailable due to a billing issue. If you are the agent, please contact
          Pixilink to restore access.
        </p>
        <div style={{
          marginTop: '28px',
          padding: '16px',
          background: '#0f172a',
          borderRadius: '10px',
          fontSize: '13px',
          color: '#64748b',
        }}>
          Agent support:{' '}
          <a href="mailto:support@pixilink.com" style={{ color: '#60a5fa', textDecoration: 'none' }}>
            support@pixilink.com
          </a>
        </div>
      </div>
    </div>
  )
}
