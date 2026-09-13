import { prisma } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusPill } from '@/components/StatusPill'
import Link from 'next/link'
import { formatDate, formatKES } from '@/lib/utils'

export default async function ApprovalsPage() {
  const pending = await prisma.event.findMany({
    where: { status: { in: ['PENDING_APPROVAL', 'DEADLOCKED'] } },
    orderBy: { createdAt: 'desc' },
    include: { proposedBy: { select: { fullName: true } } }
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Approvals</h1>
      <p className="text-slate-500">Free events need Chair + CEO. Paid events need Chair + CEO + Treasurer. Deadlocks go to Patron.</p>

      <div className="grid gap-4">
        {pending.map(ev => (
          <Card key={ev.id} className={ev.status === 'DEADLOCKED' ? 'border-red-200' : ''}>
            <CardHeader>
              <CardTitle className="flex justify-between">
                <span>{ev.title}</span>
                <StatusPill status={ev.status} />
              </CardTitle>
              <p className="text-sm text-slate-500">{ev.proposedBy?.fullName} • {formatDate(ev.date)} • {formatKES(ev.amountPerMember)} • {ev.type}</p>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-3">{ev.description}</p>
              <Link href={`/events/${ev.id}`} className="text-teal-600 text-sm">Review and Approve →</Link>
            </CardContent>
          </Card>
        ))}
        {pending.length === 0 && <Card><CardContent className="p-8 text-center text-slate-500">No events pending approval — you're all caught up. 🕊️</CardContent></Card>}
      </div>
    </div>
  )
}
