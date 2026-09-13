import { prisma } from '@/lib/db'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import * as bcrypt from 'bcryptjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

async function getSessionUser() {
  const token = cookies().get('session')?.value
  if (!token) return null
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true }
  })
  if (!session || session.expiresAt < new Date()) return null
  return session.user
}

async function changePasswordAction(formData: FormData) {
  'use server'

  const token = cookies().get('session')?.value
  if (!token) redirect('/login')

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true }
  })
  if (!session) redirect('/login')

  const currentPassword = formData.get('currentPassword') as string
  const newPassword = formData.get('newPassword') as string
  const confirmPassword = formData.get('confirmPassword') as string

  // If mustChangePassword, currentPassword may be temp, still verify
  const valid = await bcrypt.compare(currentPassword, session.user.passwordHash)
  if (!valid) {
    redirect('/change-password?error=invalid_current')
  }

  if (newPassword.length < 8) {
    redirect('/change-password?error=too_short')
  }
  if (!/\d/.test(newPassword)) {
    redirect('/change-password?error=no_number')
  }
  if (newPassword !== confirmPassword) {
    redirect('/change-password?error=mismatch')
  }

  const hashed = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      passwordHash: hashed,
      mustChangePassword: false
    }
  })

  await prisma.auditLog.create({
    data: {
      actionType: 'PASSWORD_CHANGED',
      actorId: session.user.id,
      details: JSON.stringify({ forced: session.user.mustChangePassword })
    }
  })

  redirect('/dashboard?welcome=1')
}

export default async function ChangePasswordPage({ searchParams }: { searchParams: { error?: string } }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const error = searchParams?.error
  let msg = ''
  if (error === 'invalid_current') msg = 'Current password incorrect'
  if (error === 'too_short') msg = 'New password must be at least 8 characters'
  if (error === 'no_number') msg = 'Password must contain at least 1 number'
  if (error === 'mismatch') msg = 'New passwords do not match'

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
        <CardDescription>
          {user.mustChangePassword ? 'You must change your temporary password before continuing.' : 'Update your password'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={changePasswordAction} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Current / Temporary Password</label>
            <Input name="currentPassword" type="password" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">New Password (min 8 chars, 1 number)</label>
            <Input name="newPassword" type="password" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Confirm New Password</label>
            <Input name="confirmPassword" type="password" required />
          </div>

          {msg && <div className="bg-red-50 border border-red-200 text-red-700 p-2 rounded text-sm">{msg}</div>}

          <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700">
            {user.mustChangePassword ? 'Set Password & Continue' : 'Change Password'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
