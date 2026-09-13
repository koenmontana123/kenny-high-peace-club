import { prisma } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default async function AuditPage({ searchParams }: { searchParams: { actor?: string, action?: string, search?: string } }) {
  const where: any = {}
  if (searchParams?.action) where.actionType = searchParams.action
  if (searchParams?.actor) where.actorId = searchParams.actor

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { actor: { select: { fullName: true, memberId: true } }, target: { select: { fullName: true, memberId: true } } }
  })

  const totalActions = await prisma.auditLog.count()
  const activeAdmins = await prisma.adminIdentity.count({ where: { isActive: true } })
  const topActions = await prisma.auditLog.groupBy({
    by: ['actionType'],
    _count: { actionType: true },
    orderBy: { _count: { actionType: 'desc' } },
    take: 5
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Audit Log (Super Admin only)</h1>
        <Button variant="outline" className="bg-slate-800 border-slate-600 text-white">Export CSV</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader><CardTitle className="text-sm text-slate-400">Total Actions</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-white">{totalActions}</div></CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader><CardTitle className="text-sm text-slate-400">Active Admins</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-white">{activeAdmins}</div></CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader><CardTitle className="text-sm text-slate-400">Top Action Types</CardTitle></CardHeader>
          <CardContent><div className="text-sm text-white">{topActions.map(t => `${t.actionType}: ${t._count.actionType}`).join(', ')}</div></CardContent>
        </Card>
      </div>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader><CardTitle className="text-white">Filters</CardTitle></CardHeader>
        <CardContent>
          <form className="flex gap-2">
            <input name="action" placeholder="Action type" defaultValue={searchParams?.action} className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white flex-1" />
            <input name="actor" placeholder="Actor ID" defaultValue={searchParams?.actor} className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white flex-1" />
            <Button type="submit" className="bg-teal-600">Filter</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader><CardTitle className="text-white">Logs (When, Action type, Actor real name, Target, Details JSON)</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-700">
                  <th className="text-left p-2">When</th>
                  <th className="text-left p-2">Action</th>
                  <th className="text-left p-2">Actor</th>
                  <th className="text-left p-2">Target</th>
                  <th className="text-left p-2">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                    <td className="p-2 text-slate-300">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="p-2 text-white">{log.actionType}</td>
                    <td className="p-2 text-teal-300">{log.actor?.fullName || 'System'} {log.actor?.memberId && `(${log.actor.memberId})`}</td>
                    <td className="p-2 text-slate-300">{log.target?.fullName || ''}</td>
                    <td className="p-2 text-slate-400 max-w-[300px] truncate">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
