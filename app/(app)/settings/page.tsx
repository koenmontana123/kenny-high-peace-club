import { prisma } from '@/lib/db'
import { cookies } from 'next/headers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { redirect } from 'next/navigation'
import * as bcrypt from 'bcryptjs'

export default async function SettingsPage() {
  const token = cookies().get('session')?.value
  const session = await prisma.session.findUnique({ where: { token }, include: { user: true } })
  if (!session) redirect('/login')

  const settings = await prisma.clubSettings.findUnique({ where: { id: 'default' } })

  async function changePassword(formData: FormData) {
    'use server'
    const token = cookies().get('session')?.value
    const session = await prisma.session.findUnique({ where: { token }, include: { user: true } })
    if (!session) redirect('/login')

    const current = formData.get('current') as string
    const newPass = formData.get('new') as string
    const confirm = formData.get('confirm') as string

    const valid = await bcrypt.compare(current, session.user.passwordHash)
    if (!valid) redirect('/settings?error=invalid')
    if (newPass.length < 8 || !/\d/.test(newPass)) redirect('/settings?error=weak')
    if (newPass !== confirm) redirect('/settings?error=mismatch')

    const hashed = await bcrypt.hash(newPass, 10)
    await prisma.user.update({ where: { id: session.user.id }, data: { passwordHash: hashed } })

    redirect('/settings?success=1')
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader><CardTitle>Club Settings</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2">
          <div>Registration Fee: KES {settings?.registrationFee}</div>
          <div>Currency: {settings?.currency}</div>
          <div>Admin Discount Rate: {settings?.adminDiscountRate}%</div>
          <div>Max Active Admins: {settings?.maxActiveAdmins}</div>
          <a href="/settings/fees" className="text-teal-600 hover:underline">Manage Fees →</a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Change Password</CardTitle></CardHeader>
        <CardContent>
          <form action={changePassword} className="space-y-3">
            <Input name="current" type="password" placeholder="Current password" required />
            <Input name="new" type="password" placeholder="New password (min 8 chars, 1 number)" required />
            <Input name="confirm" type="password" placeholder="Confirm new password" required />
            <Button type="submit" className="bg-teal-600">Change Password</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
