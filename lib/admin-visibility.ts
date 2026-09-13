import { prisma } from './db'

/**
 * Admin visibility filter runs on every query that lists users.
 * Filters Admin/Super Admin out of any user-facing result set below Super Admin level.
 */

export type ViewerContext = {
  userId?: string
  publicRole?: string
  isSuperAdmin?: boolean
  isAdminMode?: boolean
}

export function shouldHideUser(targetUser: { publicRole: string, id: string }, viewer: ViewerContext): boolean {
  // Super Admin can see everyone
  if (viewer.isSuperAdmin) return false

  // Hide SUPER_ADMIN from everyone except SUPER_ADMIN
  if (targetUser.publicRole === 'SUPER_ADMIN') return true

  // Hide ADMIN publicRole (should not exist, but just in case)
  if (targetUser.publicRole === 'ADMIN') return true

  // For secret AdminIdentity, they appear as normal MEMBER, so we don't hide by role
  // But we hide their AdminIdentity existence
  // This function only filters by publicRole, not AdminIdentity
  return false
}

export async function filterVisibleUsers<T extends { publicRole: string, id: string }>(users: T[], viewer: ViewerContext): Promise<T[]> {
  if (viewer.isSuperAdmin) return users

  // Get all active AdminIdentity userIds to ensure they appear as normal members (not hidden)
  // Actually we want them to appear as normal members, so we don't hide them
  // We only hide SUPER_ADMIN and public ADMIN role

  return users.filter(u => !shouldHideUser(u, viewer))
}

export async function getAdminIdentityUserIds(): Promise<string[]> {
  const identities = await prisma.adminIdentity.findMany({
    where: { isActive: true },
    select: { userId: true }
  })
  return identities.map(i => i.userId)
}

// For queries that should exclude admins from counts? No, admin appears as normal member
// So this filter only removes SUPER_ADMIN

export function buildUserVisibilityWhere(viewer: ViewerContext) {
  if (viewer.isSuperAdmin) {
    return {}
  }
  // Hide SUPER_ADMIN and ADMIN public roles from normal users
  return {
    publicRole: {
      notIn: ['SUPER_ADMIN', 'ADMIN'] as any
    }
  }
}
