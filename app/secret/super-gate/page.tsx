import { prisma } from '@/lib/db'
import * as bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield } from 'lucide-react'
import { checkRateLimit } from '@/lib/auth'

async function superGateLogin(formData: FormData) {
  'use server'

  const email = (formData.get('email') as string)?.toLowerCase().trim()
  const password = formData.get('password') as string
  const ip = headers().get('x-forwarded-for') || 'unknown'

  if (!checkRateLimit(ip)) {
    return redirect(`/_secret/super-gate?error=rate_limited`)
  }

  if (!email || !password) {
    return redirect(`/_secret/super-gate?error=missing`)
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || user.publicRole !== 'SUPER_ADMIN') {
    return redirect(`/_secret/super-gate?error=invalid`)
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    await prisma.auditLog.create({
      data: {
        actionType: 'SUPER_GATE_LOGIN',
        actorId: user.id,
        details: JSON.stringify({ success: false, ip }),
        ipAddress: ip
      }
    })
    return redirect(`/_secret/super-gate?error=invalid`)
  }

  const token = uuidv4()
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + 4)

  await prisma.session.create({
    data: { token, userId: user.id, expiresAt, ipAddress: ip }
  })

  await prisma.auditLog.create({
    data: {
      actionType: 'SUPER_GATE_LOGIN',
      actorId: user.id,
      details: JSON.stringify({ success: true, ip }),
      ipAddress: ip
    }
  })

  cookies().set('session', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    path: '/'
  })

  redirect('/super?super_mode=1')
}

export default function SuperGatePage({ searchParams }: { searchParams: { error?: string } }) {
  const error = searchParams?.error
  let msg = ''
  if (error === 'invalid') msg = 'Invalid super admin credentials'
  if (error === 'rate_limited') msg = 'Too many attempts. Try again in 15 minutes.'
  if (error === 'missing') msg = 'Fill all fields'

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <Card className="w-full max-w-md shadow-xl bg-slate-800 border-slate-700 text-white">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-teal-600 flex items-center justify-center">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl text-white">Super Admin Portal</CardTitle>
            <CardDescription className="text-slate-400">Kenny High Peace Club • Platform Owner</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form action={superGateLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Email</label>
              <Input name="email" type="email" required className="bg-slate-700 border-slate-600 text-white" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Password</label>
              <Input name="password" type="password" required className="bg-slate-700 border-slate-600 text-white" />
            </div>
            {msg && <div className="bg-red-900/50 border border-red-700 text-red-300 p-2 rounded text-sm">{msg}</div>}
            <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700">
              Enter Super Portal
            </Button>
            <p className="text-xs text-slate-500 text-center">Session 4 hours • Strict SameSite • Rate limited 5/15min</p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
