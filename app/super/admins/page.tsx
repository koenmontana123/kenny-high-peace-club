import { prisma } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function AdminsPage() {
  const admins = await prisma.adminIdentity.findMany({
    include: { user: { select: { fullName: true, email: true, memberId: true, publicRole: true, grade: true } } }
  })

  const users = await prisma.user.findMany({ where: { status: 'ACTIVE', publicRole: 'MEMBER' }, select: { id: true, fullName: true, email: true, memberId: true, grade: true } })

  const settings = await prisma.clubSettings.findUnique({ where: { id: 'default' } })

  async function appointAdmin(formData: FormData) {
    'use server'
    const userId = formData.get('userId') as string
    if (!userId) redirect('/super/admins?error=missing')

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) redirect('/super/admins?error=notfound')

    // Enforce cap
    const activeCount = await prisma.adminIdentity.count({ where: { isActive: true } })
    const settings = await prisma.clubSettings.findUnique({ where: { id: 'default' } })
    const max = settings?.maxActiveAdmins || 3
    if (activeCount >= max) redirect(`/super/admins?error=cap&max=${max}`)

    // Must be plain MEMBER, cannot hold CHAIRPERSON, CEO, TREASURER
    if (['CHAIRPERSON', 'CEO', 'TREASURER'].includes(user.publicRole)) {
      redirect('/super/admins?error=forbidden_role')
    }

    // Check if already admin
    const existing = await prisma.adminIdentity.findUnique({ where: { userId } })
    if (existing) {
      await prisma.adminIdentity.update({ where: { userId }, data: { isActive: true } })
    } else {
      await prisma.adminIdentity.create({
        data: {
          userId,
          realName: user.fullName,
          grade: user.grade,
          isActive: true,
          discountRate: settings?.adminDiscountRate || 50
        }
      })
    }

    await prisma.auditLog.create({
      data: {
        actionType: 'APPOINT_ADMIN',
        actorId: (await prisma.user.findFirst({ where: { publicRole: 'SUPER_ADMIN' } }))?.id,
        targetId: userId,
        details: JSON.stringify({ grade: user.grade })
      }
    })

    redirect('/super/admins')
  }

  async function deactivateAdmin(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    await prisma.adminIdentity.update({ where: { id }, data: { isActive: false } })
    redirect('/super/admins')
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Admin Roster Management</h1>
      <p className="text-slate-400">2–3 active Admins at a time (cap {settings?.maxActiveAdmins || 3}). Admins do NOT know each other's identities. Compartmentalized. Each overlay shows only own actions. Compliance queue shows status but never which Admin handled. Only Super Admin portal shows full cross-admin picture. No ranks. All peers. Super Admin breaks ties. Staggered by grade (12, 11, 10) so graduation doesn't create gap. Cap enforced: appointing 4th requires deactivating one first.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader><CardTitle className="text-white">Active Admins ({admins.filter(a => a.isActive).length})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {admins.filter(a => a.isActive).map(a => (
              <div key={a.id} className="p-3 bg-slate-700 rounded flex justify-between">
                <div>
                  <div className="font-medium text-white">{a.realName} • {a.user.memberId}</div>
                  <div className="text-xs text-slate-400">{a.user.email} • Grade {a.grade} • {a.user.publicRole}</div>
                </div>
                <form action={deactivateAdmin}>
                  <input type="hidden" name="id" value={a.id} />
                  <Button type="submit" size="sm" variant="destructive">Deactivate</Button>
                </form>
              </div>
            ))}
            {admins.filter(a => a.isActive).length === 0 && <div className="text-slate-400 text-sm">No active admins</div>}
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader><CardTitle className="text-white">Inactive Admins</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {admins.filter(a => !a.isActive).map(a => (
              <div key={a.id} className="p-2 bg-slate-700 rounded text-sm">
                <div className="text-white">{a.realName} • {a.user.memberId}</div>
                <div className="text-xs text-slate-400">{a.user.email}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader><CardTitle className="text-white">Appoint New Admin (Silently)</CardTitle></CardHeader>
        <CardContent>
          <form action={appointAdmin} className="flex gap-2">
            <select name="userId" className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white" required>
              <option value="">Select member (must be plain MEMBER, not Chair/CEO/Treasurer)</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.fullName} • {u.memberId} • {u.grade} • {u.email}</option>
              ))}
            </select>
            <Button type="submit" className="bg-teal-600">Appoint</Button>
          </form>
          <p className="text-xs text-slate-500 mt-2">Admin appears as normal member in directory, chat, leaderboard. No badges. Must pay fees like normal member with hidden discount ledger (50%). Clear pending payments button in overlay applies credit oldest-first, attributed to System.</p>
        </CardContent>
      </Card>
    </div>
  )
}
