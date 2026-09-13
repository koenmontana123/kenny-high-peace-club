import { prisma } from '@/lib/db'
import { cookies } from 'next/headers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusPill } from '@/components/StatusPill'
import { formatKES } from '@/lib/utils'

export default async function PaymentsPage() {
  const token = cookies().get('session')?.value
  const session = await prisma.session.findUnique({ where: { token }, include: { user: true } })
  if (!session) return null

  const payments = await prisma.eventPayment.findMany({
    where: { event: { status: { in: ['APPROVED', 'COMPLETED'] } } },
    include: { event: true, user: { select: { fullName: true, memberId: true } } },
    orderBy: { createdAt: 'desc' }
  })

  const totalCollected = payments.filter(p => p.status === 'PAID').reduce((s, p) => s + p.amount, 0)
  const totalExpected = payments.reduce((s, p) => s + p.amount, 0)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Payments</h1>
      <p className="text-slate-500">Total collected {formatKES(totalCollected)} / {formatKES(totalExpected)} • Treasurer view</p>

      <div className="grid gap-2">
        {payments.slice(0, 100).map(p => (
          <Card key={p.id}>
            <CardContent className="p-3 flex justify-between">
              <div>
                <div className="font-medium text-sm">{p.user.fullName} • {p.event.title}</div>
                <div className="text-xs text-slate-500">{p.user.memberId} • {formatKES(p.amount)}</div>
              </div>
              <StatusPill status={p.status} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
