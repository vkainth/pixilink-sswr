import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPlatformSettings } from '@/lib/admin-api'
import PlatformSettingsForm from './_form.client'

export const dynamic = 'force-dynamic'

export default async function PlatformSettingsPage() {
  const jar = await cookies()
  const session = jar.get('pxl_admin_session')?.value
  if (!session) redirect('/admin/login')

  // fresh: this screen edits the value, so it must not read a cached copy.
  const settings = await getPlatformSettings(true)

  return (
    <div style={{ padding: '32px 40px', maxWidth: 760 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0, marginBottom: 6 }}>
          Platform Settings
        </h1>
        <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
          Global controls that apply across all agent sites.
        </p>
      </div>

      <PlatformSettingsForm initialGlobalNoindex={settings.global_noindex} />
    </div>
  )
}
