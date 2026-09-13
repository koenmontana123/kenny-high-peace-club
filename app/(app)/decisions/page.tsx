import { prisma } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'

export default async function DecisionsPage() {
  const logs = await prisma.auditLog.findMany({
    where: { actionType: { in: ['EVENT_APPROVED', 'EVENT_REJECTED', 'DEADLOCK_RESOLVED', 'FEE_CHANGE_APPROVED'] } },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { actor: { select: { fullName: true } } }
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Decisions Log</h1>
      <p className="text-slate-500">Public log of all major decisions: approvals, rejections, deadlocks, fee changes.</p>

      <div className="space-y-2">
        {logs.map(log => (
          <Card key={log.id}>
            <CardContent className="p-3">
              <div className="flex justify-between">
                <div>
                  <div className="font-medium text-sm">{log.actionType} • {log.actor?.fullName || 'System'}</div>
                  <div className="text-xs text-slate-500">{formatDate(log.createdAt)} • {log.details}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {logs.length === 0 && <Card><CardContent className="p-8 text-center text-slate-500">No decisions yet</CardContent></Card>}
      </div>
    </div>
  )
}
