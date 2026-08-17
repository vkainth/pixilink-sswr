import { getAgentPortalSession } from '@/lib/agent-portal-auth'
import { getAgentPortalProfile } from '@/lib/agent-portal-api'
import { redirect } from 'next/navigation'
import ProfileForm from './_profile-form'

export default async function AgentPortalProfilePage() {
  const session = await getAgentPortalSession()
  if (!session) redirect('/agent-portal/login')

  const profile = await getAgentPortalProfile(session.id)

  return <ProfileForm agentId={session.id} profile={profile} />
}
