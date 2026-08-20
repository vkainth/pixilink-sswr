'use client'

import { usePathname, useRouter } from 'next/navigation'
import { apiPath } from '@/lib/admin-api-path'

const P = {
  sidebarBg: '#0f172a',
  primary: '#23a9e1',
  sidebarText: 'rgba(255,255,255,0.65)',
  sidebarBorder: 'rgba(255,255,255,0.08)',
  bg: '#f1f5f9',
}

interface Props {
  agentId: number
  agentName: string
  adminName: string
  children: React.ReactNode
}

function navItem(agentId: number, section: string, label: string, icon: string) {
  return { href: `/admin/agents/${agentId}/manage${section}`, label, icon }
}

export default function AgentContextShell({ agentId, agentName, adminName, children }: Props) {
  const pathname = usePathname()
  const router = useRouter()

  const NAV = [
    navItem(agentId, '', 'Overview', '⊞'),
    navItem(agentId, '/leads', 'Leads', '◎'),
    navItem(agentId, '/analytics', 'Analytics', '▦'),
    navItem(agentId, '/feature-flags', 'Feature Flags', '⚑'),
    navItem(agentId, '/integrations', 'Integrations', '⬡'),
    navItem(agentId, '/landing-pages', 'Landing Pages', '⊕'),
    navItem(agentId, '/area-comparisons', 'Area Comparisons', '⇄'),
    navItem(agentId, '/best-of-lists', 'Best-Of Lists', '★'),
    navItem(agentId, '/users', 'Registered Users', '👤'),
    navItem(agentId, '/ai-content', 'AI Content', '✦'),
    navItem(agentId, '/buildings', 'Buildings', '🏢'),
    navItem(agentId, '/buyer-solds', 'Buyer Solds', '🤝'),
    navItem(agentId, '/testimonials', 'Testimonials', '❝'),
    navItem(agentId, '/settings', 'Settings', '⚙'),
  ]

  async function handleLogout() {
    await fetch(apiPath('/api/admin/logout'), { method: 'POST' })
    router.push('/admin/login')
    router.refresh()
  }

  const base = `/admin/agents/${agentId}/manage`

  return (
    <>
      <style>{`
        [data-admin-agent] { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        [data-admin-agent] table { border-collapse: collapse; width: 100%; }
        [data-admin-agent] th { font-weight: 600; }
        [data-admin-agent] a { text-decoration: none; }
        [data-admin-agent] .badge {
          display: inline-block; padding: 2px 8px; border-radius: 12px;
          font-size: 11px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase;
        }
        [data-admin-agent] .badge-active   { background: #e3fcef; color: #006644; }
        [data-admin-agent] .badge-suspended { background: #ffebe6; color: #bf2600; }
        [data-admin-agent] .badge-inactive  { background: #f4f5f7; color: #5e6c84; }
      `}</style>
      <div data-admin-agent="" style={{ display: 'flex', minHeight: '100vh', background: P.bg, color: '#1e293b', fontSize: 14 }}>
        {/* Sidebar */}
        <aside style={{
          width: 240, flexShrink: 0, background: P.sidebarBg, color: P.sidebarText,
          display: 'flex', flexDirection: 'column', position: 'fixed',
          top: 0, left: 0, bottom: 0, overflowY: 'auto', zIndex: 100,
        }}>
          {/* Back link */}
          <div style={{ padding: '18px 20px 12px' }}>
            <a
              href="/admin/agents"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 12, color: 'rgba(255,255,255,0.4)',
                transition: 'color 0.15s',
              }}
            >
              ← All Agents
            </a>
          </div>

          {/* Agent name header */}
          <div style={{ padding: '0 20px 16px', borderBottom: `1px solid ${P.sidebarBorder}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, background: P.primary, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, color: '#fff', fontSize: 16, flexShrink: 0,
              }}>
                {agentName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{agentName}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2, textTransform: 'uppercase', letterSpacing: 1.5 }}>Agent Site</div>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ padding: '8px 0', flex: 1 }}>
            {NAV.map(({ href, label, icon }) => {
              const isOverview = href === base
              const active = isOverview
                ? pathname === base || pathname === base + '/'
                : pathname?.startsWith(href)
              return (
                <a
                  key={href}
                  href={href}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 20px', fontSize: 13,
                    color: active ? P.primary : P.sidebarText,
                    background: active ? 'rgba(35,169,225,0.15)' : 'transparent',
                    borderLeft: active ? `3px solid ${P.primary}` : '3px solid transparent',
                    fontWeight: active ? 600 : 400,
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>{icon}</span>
                  {label}
                </a>
              )
            })}
          </nav>

          <div style={{ padding: '16px 20px', borderTop: `1px solid ${P.sidebarBorder}` }}>
            {adminName && (
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 1 }}>Admin</div>
            )}
            {adminName && (
              <div style={{ fontSize: 13, color: '#fff', fontWeight: 600, marginBottom: 10, wordBreak: 'break-all' }}>
                {adminName}
              </div>
            )}
            <button
              onClick={handleLogout}
              style={{
                background: 'none', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.4)',
                borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit',
              }}
            >
              Sign out
            </button>
          </div>
          <div style={{ padding: '10px 20px 14px', fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>Pixilink Platform v2</div>
        </aside>

        {/* Main content */}
        <main style={{ marginLeft: 240, flex: 1, minHeight: '100vh' }}>
          {children}
        </main>
      </div>
    </>
  )
}
