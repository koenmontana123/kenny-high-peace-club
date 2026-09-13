import { prisma } from '@/lib/db'
import * as bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Bird } from 'lucide-react'
import { checkRateLimit, getRateLimitRemaining } from '@/lib/auth'

async function adminGateLogin(formData: FormData) {
  'use server'

  const email = (formData.get('email') as string)?.toLowerCase().trim()
  const password = formData.get('password') as string
  const ip = headers().get('x-forwarded-for') || 'unknown'

  if (!checkRateLimit(ip)) {
    return redirect(`/_secret/admin-gate?error=rate_limited`)
  }

  if (!email || !password) {
    return redirect(`/_secret/admin-gate?error=missing`)
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    return redirect(`/_secret/admin-gate?error=invalid`)
  }

  // Must have AdminIdentity and be active
  const adminIdentity = await prisma.adminIdentity.findUnique({ where: { userId: user.id } })
  if (!adminIdentity || !adminIdentity.isActive) {
    // Still check password to avoid timing leak, but fail
    await bcrypt.compare(password, user.passwordHash)
    return redirect(`/_secret/admin-gate?error=invalid`)
  }

  if (user.status !== 'ACTIVE') {
    return redirect(`/_secret/admin-gate?error=revoked`)
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    await prisma.auditLog.create({
      data: {
        actionType: 'ADMIN_GATE_LOGIN',
        actorId: user.id,
        details: JSON.stringify({ success: false, ip }),
        ipAddress: ip
      }
    })
    return redirect(`/_secret/admin-gate?error=invalid`)
  }

  // Check publicRole must be MEMBER per spec
  if (user.publicRole !== 'MEMBER') {
    return redirect(`/_secret/admin-gate?error=not_member`)
  }

  const token = uuidv4()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  await prisma.session.create({
    data: { token, userId: user.id, expiresAt, ipAddress: ip }
  })

  await prisma.auditLog.create({
    data: {
      actionType: 'ADMIN_GATE_LOGIN',
      actorId: user.id,
      details: JSON.stringify({ success: true, ip, mode: 'ADMIN' }),
      ipAddress: ip
    }
  })

  cookies().set('session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    path: '/'
  })

  // Set a flag for client to auto-enable ADMIN mode via sessionStorage
  // We redirect to dashboard with a query param that client script will pick up
  redirect('/dashboard?admin_mode=1')
}

export default function AdminGatePage({ searchParams }: { searchParams: { error?: string } }) {
  const error = searchParams?.error
  let msg = ''
  if (error === 'invalid') msg = 'Invalid credentials or not authorized'
  if (error === 'rate_limited') msg = 'Too many attempts. Try again in 15 minutes.'
  if (error === 'missing') msg = 'Fill all fields'
  if (error === 'revoked') msg = 'Account not active'
  if (error === 'not_member') msg = 'Admin must be MEMBER role'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-amber-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-teal-600 flex items-center justify-center">
            <Bird className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl">Kenny High Peace Club</CardTitle>
            <CardDescription className="italic">Talk it out. Walk it out. Live it out.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form action={adminGateLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input name="password" type="password" required />
            </div>
            {msg && <div className="bg-red-50 border border-red-200 text-red-700 p-2 rounded text-sm">{msg}</div>}
            <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700">
              Sign In
            </Button>
            <p className="text-xs text-slate-400 text-center">Secure access • Session 7 days</p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
