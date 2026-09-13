'use client'

export type SessionMode = 'MEMBER' | 'ADMIN' | 'SUPER'

export function getSessionMode(): SessionMode {
  if (typeof window === 'undefined') return 'MEMBER'
  return (sessionStorage.getItem('sessionMode') as SessionMode) || 'MEMBER'
}

export function setSessionMode(mode: SessionMode) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem('sessionMode', mode)
  // Also set a cookie for server to read? We'll use header instead
}

export function clearSessionMode() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem('sessionMode')
}
