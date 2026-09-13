import { prisma } from '@/lib/db'
import * as bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Bird } from 'lucide-react'

async function loginAction(formData: FormData) {
  'use server'

  const email = (formData.get('email') as string)?.toLowerCase().trim()
  const password = formData.get('password') as string

  if (!email || !password) {
    return redirect('/login?error=missing')
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    // Audit log
    await prisma.auditLog.create({
      data: {
        actionType: 'LOGIN',
        details: JSON.stringify({ email, success: false, reason: 'user not found' }),
        ipAddress: headers().get('x-forwarded-for') || 'unknown'
      }
    })
    return redirect('/login?error=invalid')
  }

  if (user.status === 'PENDING_PAYMENT') {
    return redirect('/login?error=pending')
  }

  if (['REVOKED', 'GRADUATED', 'TRANSFERRED', 'QUIT'].includes(user.status)) {
    return redirect('/login?error=revoked')
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    await prisma.auditLog.create({
      data: {
        actionType: 'LOGIN',
        actorId: user.id,
        details: JSON.stringify({ success: false }),
        ipAddress: headers().get('x-forwarded-for') || 'unknown'
      }
    })
    return redirect('/login?error=invalid')
  }

  // Create session
  const token = uuidv4()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  await prisma.session.create({
    data: {
      token,
      userId: user.id,
      expiresAt,
      ipAddress: headers().get('x-forwarded-for') || 'unknown'
    }
  })

  await prisma.auditLog.create({
    data: {
      actionType: 'LOGIN',
      actorId: user.id,
      details: JSON.stringify({ success: true, role: user.publicRole }),
      ipAddress: headers().get('x-forwarded-for') || 'unknown'
    }
  })

  cookies().set('session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    path: '/'
  })

  if (user.mustChangePassword) {
    redirect('/change-password')
  }

  redirect('/dashboard')
}

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  const error = searchParams?.error
  let errorMessage = ''
  if (error === 'invalid') errorMessage = 'Invalid email or password'
  if (error === 'missing') errorMessage = 'Please fill in all fields'
  if (error === 'pending') errorMessage = 'Account pending payment. Contact Treasurer.'
  if (error === 'revoked') errorMessage = 'Account has been revoked or transferred.'

  return (
    <Card className="w-full max-w-md shadow-xl border-0">
      <CardHeader className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-teal-600 flex items-center justify-center">
          <Bird className="w-8 h-8 text-white" />
        </div>
        <div>
          <CardTitle className="text-2xl font-bold text-slate-900">Kenny High Peace Club</CardTitle>
          <CardDescription className="text-base mt-2 italic">Talk it out. Walk it out. Live it out.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form action={loginAction} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <Input id="email" name="email" type="email" placeholder="you@kennyhigh.test" required autoComplete="email" />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">Password</label>
            <Input id="password" name="password" type="password" placeholder="••••••••" required autoComplete="current-password" />
          </div>

          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">
              {errorMessage}
            </div>
          )}

          <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700">
            Sign In
          </Button>

          <div className="text-center text-xs text-slate-500 mt-4">
            <p>Demo logins: check docs/super-admin.md</p>
            <p className="mt-1">Patron: adeyemi@kennyhigh.test / peace123</p>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
