import { cookies, headers } from 'next/headers'
import { prisma } from './db'
import { v4 as uuidv4 } from 'uuid'

const SESSION_COOKIE = 'session'
const PUBLIC_SESSION_DAYS = 7
const SUPER_SESSION_HOURS = 4

export type SessionData = {
  id: string
  token: string
  userId: string
  expiresAt: Date
  user: {
    id: string
    email: string
    fullName: string
    publicRole: string
    status: string
    mustChangePassword: boolean
    memberId: string
    grade: string | null
  }
  adminIdentity?: {
    id: string
    isActive: boolean
    realName: string
    discountRate: number
  } | null
  mode: 'MEMBER' | 'ADMIN' | 'SUPER'
}

export async function createSession(userId: string, isSuperAdmin: boolean = false, ip?: string): Promise<string> {
  const token = uuidv4()
  const expiresAt = new Date()
  if (isSuperAdmin) {
    expiresAt.setHours(expiresAt.getHours() + SUPER_SESSION_HOURS)
  } else {
    expiresAt.setDate(expiresAt.getDate() + PUBLIC_SESSION_DAYS)
  }

  await prisma.session.create({
    data: {
      token,
      userId,
      expiresAt,
      ipAddress: ip
    }
  })

  return token
}

export async function getSessionFromToken(token: string): Promise<SessionData | null> {
  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          publicRole: true,
          status: true,
          mustChangePassword: true,
          memberId: true,
          grade: true
        }
      }
    }
  })

  if (!session) return null
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {})
    return null
  }

  // Check admin identity
  let adminIdentity = null
  if (session.user.publicRole !== 'SUPER_ADMIN') {
    adminIdentity = await prisma.adminIdentity.findUnique({
      where: { userId: session.user.id }
    })
  }

  // Determine mode from header (per-tab mode)
  let mode: 'MEMBER' | 'ADMIN' | 'SUPER' = 'MEMBER'
  try {
    const h = headers()
    const claimedMode = h.get('X-Session-Mode')
    if (claimedMode === 'ADMIN' && adminIdentity?.isActive) {
      mode = 'ADMIN'
    } else if (claimedMode === 'SUPER' && session.user.publicRole === 'SUPER_ADMIN') {
      mode = 'SUPER'
    } else if (session.user.publicRole === 'SUPER_ADMIN') {
      // Default super admin in member mode unless explicitly super
      mode = 'MEMBER'
    }
  } catch {
    // headers() may fail in some contexts
  }

  return {
    id: session.id,
    token: session.token,
    userId: session.userId,
    expiresAt: session.expiresAt,
    user: session.user as any,
    adminIdentity: adminIdentity as any,
    mode
  }
}

export async function getCurrentSession(): Promise<SessionData | null> {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get(SESSION_COOKIE)?.value
    if (!token) return null
    return getSessionFromToken(token)
  } catch {
    return null
  }
}

export async function requireSession(): Promise<SessionData> {
  const session = await getCurrentSession()
  if (!session) {
    throw new Error('Unauthorized')
  }
  return session
}

export function setSessionCookie(token: string, isSuperAdmin: boolean = false) {
  const cookieStore = cookies()
  const expires = new Date()
  if (isSuperAdmin) {
    expires.setHours(expires.getHours() + SUPER_SESSION_HOURS)
  } else {
    expires.setDate(expires.getDate() + PUBLIC_SESSION_DAYS)
  }

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: isSuperAdmin ? 'strict' : 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires,
    path: '/'
  })
}

export function clearSessionCookie() {
  const cookieStore = cookies()
  cookieStore.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires: new Date(0),
    path: '/'
  })
}

export async function deleteSession(token: string) {
  await prisma.session.deleteMany({ where: { token } })
}
