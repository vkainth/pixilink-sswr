'use client'

import { usePathname, useRouter } from 'next/navigation'
import { apiPath } from '@/lib/admin-api-path'

const NAV = [
  { href: '/admin/agents', label: '◉  Agents' },
  { href: '/admin/leads', label: '◎  Leads Overview' },
  { href: '/admin/users', label: '👤  Registered Users' },
  { href: '/admin/billing', label: '💳  Billing' },
  { href: '/admin/analytics', label: '▦  Analytics' },
  { href: '/admin/audit-log', label: '📋  Audit Log' },
  { href: '/admin/settings', label: '⚙  Platform Settings' },
]

interface Props {
  adminName: string
  hasSession: boolean
  children: React.ReactNode
}

export default function AdminShell({ adminName, hasSession, children }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const isLoginPage = pathname?.includes('/admin/login')

  if (isLoginPage || !hasSession) {
    return <>{children}</>
  }

  async function handleLogout() {
    await fetch(apiPath('/api/admin/logout'), { method: 'POST' })
    router.push('/admin/login')
    router.refresh()
  }

  const isAgentContext = pathname?.match(/\/admin\/agents\/\d+\/manage/)

  if (isAgentContext) {
    return <>{children}</>
  }

  return (
    <>
      <style>{`
        [data-admin] { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        [data-admin] table { border-collapse: collapse; width: 100%; }
        [data-admin] th { font-weight: 600; }
        [data-admin] a { text-decoration: none; }
        [data-admin] .badge {
          display: inline-block; padding: 2px 8px; border-radius: 12px;
          font-size: 11px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase;
        }
        [data-admin] .badge-active   { background: #e3fcef; color: #006644; }
        [data-admin] .badge-suspended { background: #ffebe6; color: #bf2600; }
        [data-admin] .badge-inactive  { background: #f4f5f7; color: #5e6c84; }
      `}</style>
      <div data-admin="" style={{ display: 'flex', minHeight: '100vh', background: '#f1f5f9', color: '#1e293b', fontSize: 14 }}>
        {/* Sidebar */}
        <aside style={{
          width: 220, flexShrink: 0, background: '#0f172a', color: 'rgba(255,255,255,0.65)',
          display: 'flex', flexDirection: 'column', position: 'fixed',
          top: 0, left: 0, bottom: 0, overflowY: 'auto', zIndex: 100,
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '24px 20px 20px' }}>
            <div style={{ width: 32, height: 32, background: '#23a9e1', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: 18 }}>P</div>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 17, letterSpacing: -0.3 }}>pixilink</span>
          </div>
          <div style={{ padding: '4px 12px 8px', fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, textTransform: 'uppercase' }}>Staff Admin</div>

          <nav style={{ padding: '4px 0', flex: 1 }}>
            {NAV.map(({ href, label }) => {
              const active = pathname?.startsWith(href)
              return (
                <a
                  key={href}
                  href={href}
                  style={{
                    display: 'flex', alignItems: 'center', padding: '10px 20px', fontSize: 13,
                    color: active ? '#23a9e1' : 'rgba(255,255,255,0.65)',
                    background: active ? 'rgba(35,169,225,0.15)' : 'transparent',
                    borderLeft: active ? '3px solid #23a9e1' : '3px solid transparent',
                    fontWeight: active ? 600 : 400,
                    transition: 'all 0.15s',
                  }}
                >
                  {label}
                </a>
              )
            })}
          </nav>

          <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            {adminName && (
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>Admin</div>
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
        <main style={{ marginLeft: 220, flex: 1, minHeight: '100vh' }}>
          {children}
        </main>
      </div>
    </>
  )
}
