import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

export const AGENT_PORTAL_COOKIE = 'agent_portal_token'

export interface AgentPortalSession {
  id: number
  name: string
  email: string
  slug: string
  theme_color: string | null
  theme_slug: string | null
  domain: string | null
}

function getSecret(): Uint8Array {
  const s = process.env.AGENT_PORTAL_JWT_SECRET || process.env.ADMIN_JWT_SECRET || 'fallback-dev-secret'
  return new TextEncoder().encode(s)
}

export async function signAgentPortalJwt(payload: AgentPortalSession): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(getSecret())
}

export async function verifyAgentPortalJwt(token: string): Promise<AgentPortalSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as unknown as AgentPortalSession
  } catch {
    return null
  }
}

export async function getAgentPortalSession(): Promise<AgentPortalSession | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(AGENT_PORTAL_COOKIE)?.value
    if (!token) return null
    return verifyAgentPortalJwt(token)
  } catch {
    return null
  }
}
