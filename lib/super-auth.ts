import { getCurrentSession } from './session'

export async function requireSuperAdmin() {
  const session = await getCurrentSession()
  if (!session || session.user.publicRole !== 'SUPER_ADMIN') {
    throw new Error('Super Admin access required')
  }
  return session
}

export async function isSuperAdmin(): Promise<boolean> {
  const session = await getCurrentSession()
  return !!session && session.user.publicRole === 'SUPER_ADMIN'
}
