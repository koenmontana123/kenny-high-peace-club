import { prisma } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { redirect } from 'next/navigation'

export default async function SuperSettingsPage() {
  const settings = await prisma.clubSettings.findUnique({ where: { id: 'default' } })

  async function updateSettings(formData: FormData) {
    'use server'
    const fee = parseInt(formData.get('registrationFee') as string, 10)
    const discount = parseInt(formData.get('adminDiscountRate') as string, 10)
    const maxAdmins = parseInt(formData.get('maxActiveAdmins') as string, 10)

    await prisma.clubSettings.update({
      where: { id: 'default' },
      data: {
        registrationFee: fee || 200,
        adminDiscountRate: discount || 50,
        maxActiveAdmins: maxAdmins || 3
      }
    })
    redirect('/super/settings')
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-white">Platform Settings</h1>
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader><CardTitle className="text-white">Settings</CardTitle></CardHeader>
        <CardContent>
          <form action={updateSettings} className="space-y-3">
            <div>
              <label className="text-sm text-slate-400">Registration Fee (KES)</label>
              <Input name="registrationFee" type="number" defaultValue={settings?.registrationFee} className="bg-slate-700 border-slate-600 text-white" />
            </div>
            <div>
              <label className="text-sm text-slate-400">Admin Discount Rate (%)</label>
              <Input name="adminDiscountRate" type="number" defaultValue={settings?.adminDiscountRate} className="bg-slate-700 border-slate-600 text-white" />
            </div>
            <div>
              <label className="text-sm text-slate-400">Max Active Admins</label>
              <Input name="maxActiveAdmins" type="number" defaultValue={settings?.maxActiveAdmins} className="bg-slate-700 border-slate-600 text-white" />
            </div>
            <Button type="submit" className="bg-teal-600">Save</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
