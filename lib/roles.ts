export type PublicRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'PATRON'
  | 'CHAIRPERSON'
  | 'CEO'
  | 'VICE_CHAIRPERSON'
  | 'TREASURER'
  | 'CHIEF_ORGANISER'
  | 'MEDIATOR'
  | 'MEMBER'

export const ROLE_HIERARCHY: PublicRole[] = [
  'SUPER_ADMIN',
  'ADMIN',
  'PATRON',
  'CHAIRPERSON',
  'CEO',
  'VICE_CHAIRPERSON',
  'TREASURER',
  'CHIEF_ORGANISER',
  'MEDIATOR',
  'MEMBER'
]

export const ROLE_LABELS: Record<PublicRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  PATRON: 'Patron',
  CHAIRPERSON: 'Chairperson',
  CEO: 'CEO',
  VICE_CHAIRPERSON: 'Vice Chair',
  TREASURER: 'Treasurer',
  CHIEF_ORGANISER: 'Chief Organiser',
  MEDIATOR: 'Mediator',
  MEMBER: 'Member'
}

export function isLeader(role: PublicRole): boolean {
  return ['PATRON', 'ADMIN', 'CHAIRPERSON', 'CEO', 'VICE_CHAIRPERSON', 'TREASURER', 'CHIEF_ORGANISER'].includes(role)
}

export function canProposeEvents(role: PublicRole): boolean {
  return isLeader(role)
}

export function canApproveEvents(role: PublicRole): boolean {
  return ['CHAIRPERSON', 'CEO', 'TREASURER', 'PATRON', 'ADMIN'].includes(role)
}

export function assertSingleRole(currentRole: PublicRole, newRole: PublicRole, isSuperAdmin: boolean = false) {
  if (isSuperAdmin) return // Super admin exempt
  // Admin must have publicRole MEMBER
  if (newRole === 'ADMIN') {
    throw new Error('Use AdminIdentity for secret admin, not publicRole ADMIN')
  }
  // Cannot hold CHAIRPERSON, CEO, TREASURER if you are AdminIdentity
  const forbiddenForAdmin = ['CHAIRPERSON', 'CEO', 'TREASURER']
  // This check is done in appointment logic by checking AdminIdentity existence
  if (forbiddenForAdmin.includes(newRole) && currentRole === 'ADMIN') {
    throw new Error('Admin cannot hold CHAIRPERSON, CEO, or TREASURER')
  }
  // One public role at a time enforced by single field, but check combo
  // The only exception is SUPER_ADMIN
}

export function isAdminPublicRoleForbidden(role: PublicRole): boolean {
  return ['CHAIRPERSON', 'CEO', 'TREASURER'].includes(role)
}
