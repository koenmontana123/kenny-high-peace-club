import { prisma } from './db'
import * as bcrypt from 'bcryptjs'
import { createSession } from './session'

export async function verifyCredentials(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() }
  })

  if (!user) return null

  // Check status - PENDING_PAYMENT cannot login
  if (user.status === 'PENDING_PAYMENT') {
    throw new Error('PENDING_PAYMENT')
  }
  if (['REVOKED', 'GRADUATED', 'TRANSFERRED', 'QUIT'].includes(user.status)) {
    throw new Error('ACCOUNT_REVOKED')
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) return null

  return user
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export function validatePassword(password: string): { valid: boolean, error?: string } {
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' }
  }
  if (!/\d/.test(password)) {
    return { valid: false, error: 'Password must contain at least 1 number' }
  }
  return { valid: true }
}

// Rate limiting for gate logins
const attempts = new Map<string, { count: number, resetAt: number }>()

export function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = attempts.get(ip)
  if (!record || now > record.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 })
    return true
  }
  if (record.count >= 5) {
    return false
  }
  record.count++
  return true
}

export function getRateLimitRemaining(ip: string): number {
  const record = attempts.get(ip)
  if (!record) return 5
  if (Date.now() > record.resetAt) return 5
  return Math.max(0, 5 - record.count)
}
