import { getAdminUsers, listAgents } from '@/lib/admin-api'
import AdminUsersClient from './_users.client'

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
  const [data, agents] = await Promise.all([
    getAdminUsers(),
    listAgents(),
  ])

  const agentOptions = agents.map(a => ({ id: a.id, name: a.name, slug: a.slug }))

  return <AdminUsersClient data={data} agents={agentOptions} />
}
