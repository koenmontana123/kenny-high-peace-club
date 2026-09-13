import { prisma } from '@/lib/db'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusPill } from '@/components/StatusPill'
import { formatKES } from '@/lib/utils'

export default async function EventPaymentsPage({ params }: { params: { id: string } }) {
  const token = cookies().get('session')?.value
  if (!token) redirect('/login')
  const session = await prisma.session.findUnique({ where: { token }, include: { user: true } })
  if (!session) redirect('/login')

  const role = session.user.publicRole
  if (!['TREASURER', 'PATRON', 'SUPER_ADMIN', 'ADMIN'].includes(role)) {
    const admin = await prisma.adminIdentity.findUnique({ where: { userId: session.user.id } })
    if (!admin?.isActive) redirect('/dashboard')
  }

  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: {
      payments: { include: { user: { select: { fullName: true, memberId: true } } } }
    }
  })
  if (!event) return <div>Not found</div>

  const collected = event.payments.filter(p => p.status === 'PAID').reduce((s, p) => s + p.amount, 0)
  const expected = event.payments.reduce((s, p) => s + p.amount, 0)

  async function markPayment(formData: FormData) {
    'use server'
    const token = cookies().get('session')?.value
    const session = await prisma.session.findUnique({ where: { token }, include: { user: true } })
    if (!session) redirect('/login')

    const paymentId = formData.get('paymentId') as string
    const status = formData.get('status') as string
    const waiverReason = formData.get('waiverReason') as string

    await prisma.eventPayment.update({
      where: { id: paymentId },
      data: {
        status: status as any,
        waiverReason: waiverReason || null,
        markedById: session.user.id,
        markedAt: new Date()
      }
    })

    if (status === 'PAID') {
      const payment = await prisma.eventPayment.findUnique({ where: { id: paymentId } })
      if (payment) {
        await prisma.activityLedger.create({
          data: {
            userId: payment.userId,
            points: 5,
            reason: `Event fee paid on time for ${payment.eventId}`,
            eventId: payment.eventId
          }
        })
      }
    }

    redirect(`/events/${params.id}/payments`)
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Payments: {event.title}</h1>
          <p className="text-slate-500">Collected {formatKES(collected)} / {formatKES(expected)} • {event.payments.filter(p => p.status === 'PAID').length} paid</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mark Payments (Paid / Unpaid / Waived)</CardTitle>
          <p className="text-sm text-slate-500">Members pay in person. Treasurer marks each. Debt clearance gate: members with outstanding balance cannot RSVP to new events.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {event.payments.map(payment => (
            <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-medium">{payment.user.fullName} • {payment.user.memberId}</div>
                <div className="text-xs text-slate-500">{formatKES(payment.amount)} • {payment.waiverReason || ''}</div>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill status={payment.status} />
                <form action={markPayment} className="flex gap-1">
                  <input type="hidden" name="paymentId" value={payment.id} />
                  <select name="status" defaultValue={payment.status} className="border rounded px-2 py-1 text-xs">
                    <option value="PAID">PAID</option>
                    <option value="UNPAID">UNPAID</option>
                    <option value="WAIVED">WAIVED</option>
                  </select>
                  <Input name="waiverReason" placeholder="Waiver reason" defaultValue={payment.waiverReason || ''} className="w-32 h-7 text-xs" />
                  <Button type="submit" size="sm" className="h-7 bg-teal-600">Save</Button>
                </form>
              </div>
            </div>
          ))}
          {event.payments.length === 0 && <p className="text-sm text-slate-500">No payments yet. Event must be APPROVED to generate payment rows.</p>}
        </CardContent>
      </Card>
    </div>
  )
}
