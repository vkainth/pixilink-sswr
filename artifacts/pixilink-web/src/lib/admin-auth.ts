import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const COOKIE_NAME = 'admin_token'
const EXPIRY = '8h'

function getSecret(): Uint8Array {
  const secret = process.env.ADMIN_JWT_SECRET
  if (!secret) throw new Error('ADMIN_JWT_SECRET env var is not set')
  return new TextEncoder().encode(secret)
}

export interface AdminSession {
  id: number
  name: string
  email: string
}

export async function signAdminJwt(payload: AdminSession): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(getSecret())
}

export async function verifyAdminJwt(token: string): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    if (
      typeof payload.id === 'number' &&
      typeof payload.name === 'string' &&
      typeof payload.email === 'string'
    ) {
      return { id: payload.id, name: payload.name, email: payload.email }
    }
    return null
  } catch {
    return null
  }
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyAdminJwt(token)
}

export { COOKIE_NAME as ADMIN_COOKIE_NAME }
