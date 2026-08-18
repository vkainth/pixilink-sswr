'use client'

import { usePathname, useRouter } from 'next/navigation'
import type { AgentPortalSession } from '@/lib/agent-portal-auth'

const P = {
  sidebarBg: '#0f172a',
  primary: '#23a9e1',
  sidebarText: 'rgba(255,255,255,0.65)',
  sidebarBorder: 'rgba(255,255,255,0.08)',
  bg: '#f1f5f9',
}

const NAV = [
  { href: '/agent-portal/leads', label: 'Leads', icon: '◎' },
  { href: '/agent-portal/profile', label: 'Profile & Branding', icon: '✎' },
  { href: '/agent-portal/integrations', label: 'Integrations', icon: '⚡' },
  { href: '/agent-portal/billing', label: 'Billing', icon: '💳' },
]

interface Props {
  session: AgentPortalSession | null
  children: React.ReactNode
}

export default function AgentPortalShell({ session, children }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const isLoginPage = pathname?.includes('/agent-portal/login')

  if (isLoginPage || !session) {
    return <>{children}</>
  }

  async function handleLogout() {
    await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/api/agent-portal/logout`, { method: 'POST' })
    router.push('/agent-portal/login')
    router.refresh()
  }

  const domain = session.domain ?? `${session.slug}.pixilink.ca`
  const accentColor = session.theme_color ?? P.primary

  return (
    <>
      <style>{`
        [data-agent-portal] {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        [data-agent-portal] a { text-decoration: none; }
        [data-agent-portal] table { border-collapse: collapse; width: 100%; }
        [data-agent-portal] button { font-family: inherit; }
        [data-agent-portal] input, [data-agent-portal] select, [data-agent-portal] textarea { font-family: inherit; }
      `}</style>
      <div data-agent-portal="" style={{ display: 'flex', minHeight: '100vh', background: P.bg, color: '#1e293b', fontSize: 14 }}>
        {/* Sidebar */}
        <aside style={{
          width: 220, flexShrink: 0, background: P.sidebarBg,
          display: 'flex', flexDirection: 'column', position: 'fixed',
          top: 0, left: 0, bottom: 0, overflowY: 'auto', zIndex: 100,
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '24px 20px 20px' }}>
            <div style={{ width: 32, height: 32, background: accentColor, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: 18 }}>P</div>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 17, letterSpacing: -0.3 }}>pixilink</span>
          </div>
          <div style={{ padding: '4px 12px 8px', fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, textTransform: 'uppercase' }}>Agent Portal</div>

          <nav style={{ flex: 1, padding: '4px 0' }}>
            {NAV.map(({ href, label, icon }) => {
              const active = pathname?.startsWith(href)
              return (
                <a
                  key={href}
                  href={href}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 20px', fontSize: 13,
                    color: active ? '#fff' : P.sidebarText,
                    background: active ? `rgba(35,169,225,0.15)` : 'transparent',
                    borderLeft: active ? `3px solid ${accentColor}` : '3px solid transparent',
                    fontWeight: active ? 600 : 400,
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: 14 }}>{icon}</span>
                  {label}
                </a>
              )
            })}
          </nav>

          <div style={{ padding: '16px 20px', borderTop: `1px solid ${P.sidebarBorder}` }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>Signed in as</div>
            <div style={{ fontSize: 13, color: '#fff', fontWeight: 600, marginBottom: 10 }}>{session.name}</div>
            <a
              href={`https://${domain}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 12, color: accentColor }}
            >
              View My Site ↗
            </a>
            <div
              onClick={handleLogout}
              style={{ marginTop: 10, fontSize: 12, color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}
            >
              Sign out
            </div>
          </div>
          <div style={{ padding: '10px 20px 14px', fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>Powered by Pixilink</div>
        </aside>

        {/* Main content */}
        <main style={{ marginLeft: 220, flex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          {children}
        </main>
      </div>
    </>
  )
}
