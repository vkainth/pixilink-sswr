import { getAllLeads } from '@/lib/admin-api'
import AdminLeadsClient from './_leads.client'

export const dynamic = 'force-dynamic'

export default async function AdminLeadsPage() {
  const data = await getAllLeads()
  return <AdminLeadsClient data={data} />
}
