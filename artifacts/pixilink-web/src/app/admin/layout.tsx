import { getAdminSession } from '@/lib/admin-auth'
import AdminShell from './_shell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession()
  return (
    <AdminShell adminName={session?.name ?? ''} hasSession={!!session}>
      {children}
    </AdminShell>
  )
}
