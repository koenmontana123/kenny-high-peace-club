import { prisma } from '@/lib/db'
import { cookies } from 'next/headers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { redirect } from 'next/navigation'
import { StatusPill } from '@/components/StatusPill'

export default async function RevocationsPage() {
  const token = cookies().get('session')?.value
  const session = await prisma.session.findUnique({ where: { token }, include: { user: true } })
  if (!session) redirect('/login')

  if (!['PATRON', 'SUPER_ADMIN'].includes(session.user.publicRole)) {
    const admin = await prisma.adminIdentity.findUnique({ where: { userId: session.user.id } })
    if (!admin?.isActive) redirect('/dashboard')
  }

  const requests = await prisma.revocationRequest.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      targetUser: { select: { fullName: true, memberId: true } },
      requestedBy: { select: { fullName: true } }
    }
  })

  async function createRevocation(formData: FormData) {
    'use server'
    const token = cookies().get('session')?.value
    const session = await prisma.session.findUnique({ where: { token }, include: { user: true } })
    if (!session) redirect('/login')

    const targetUserId = formData.get('targetUserId') as string
    const reason = formData.get('reason') as string
    const details = formData.get('details') as string

    if (!targetUserId || !reason) redirect('/admin/revocations?error=missing')

    await prisma.revocationRequest.create({
      data: {
        targetUserId,
        requestedById: session.user.id,
        reason: reason as any,
        details,
        status: 'RECEIVED'
      }
    })

    await prisma.auditLog.create({
      data: {
        actionType: 'REVOCATION_REQUESTED',
        actorId: session.user.id,
        targetId: targetUserId,
        details: JSON.stringify({ reason, details })
      }
    })

    redirect('/admin/revocations')
  }

  const users = await prisma.user.findMany({ where: { status: 'ACTIVE' }, select: { id: true, fullName: true, memberId: true } })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Compliance Queue / Revocations</h1>
      <p className="text-slate-500">Patron submits requests → Admin handles silently via compliance queue. Patron sees status only: Received, Under Review, Executed, Declined. Patron never sees Admin name.</p>

      <Card>
        <CardHeader><CardTitle>Submit Revocation Request (Patron)</CardTitle></CardHeader>
        <CardContent>
          <form action={createRevocation} className="space-y-3">
            <select name="targetUserId" className="w-full border rounded h-10 px-3 text-sm" required>
              <option value="">Select user</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.fullName} • {u.memberId}</option>)}
            </select>
            <select name="reason" className="w-full border rounded h-10 px-3 text-sm" required>
              <option value="TEACHER_TRANSFER">TEACHER_TRANSFER</option>
              <option value="PATRON_CHANGE">PATRON_CHANGE</option>
              <option value="STUDENT_TRANSFER">STUDENT_TRANSFER</option>
              <option value="STUDENT_QUIT">STUDENT_QUIT</option>
              <option value="CORRUPT_LEADER">CORRUPT_LEADER</option>
              <option value="GRADUATED">GRADUATED</option>
              <option value="NOT_REELECTED">NOT_REELECTED</option>
              <option value="OTHER">OTHER</option>
            </select>
            <Input name="details" placeholder="Details / reason" />
            <Button type="submit" className="bg-teal-600">Submit Request</Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {requests.map(r => (
          <Card key={r.id}>
            <CardContent className="p-4 flex justify-between">
              <div>
                <div className="font-medium">{r.targetUser.fullName} • {r.reason}</div>
                <div className="text-xs text-slate-500">{r.details} • Requested by {r.requestedBy.fullName} • Response: {r.responseNote || 'Pending'}</div>
              </div>
              <StatusPill status={r.status} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
