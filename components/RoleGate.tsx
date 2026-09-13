import { ReactNode } from 'react'

export function RoleGate({ allowedRoles, userRole, children }: { allowedRoles: string[], userRole: string, children: ReactNode }) {
  if (!allowedRoles.includes(userRole)) return null
  return <>{children}</>
}
