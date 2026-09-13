import { prisma } from '@/lib/db'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusPill } from '@/components/StatusPill'

export default async function AttendancePage({ params }: { params: { id: string } }) {
  const token = cookies().get('session')?.value
  if (!token) redirect('/login')
  const session = await prisma.session.findUnique({ where: { token }, include: { user: true } })
  if (!session) redirect('/login')

  const role = session.user.publicRole
  if (!['TREASURER', 'CEO', 'PATRON', 'SUPER_ADMIN', 'ADMIN'].includes(role)) {
    const admin = await prisma.adminIdentity.findUnique({ where: { userId: session.user.id } })
    if (!admin?.isActive) redirect('/dashboard')
  }

  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: {
      attendances: { include: { user: { select: { fullName: true, memberId: true } } } }
    }
  })
  if (!event) return <div>Not found</div>

  const allMembers = await prisma.user.findMany({ where: { status: 'ACTIVE' }, orderBy: { fullName: 'asc' } })

  const present = event.attendances.filter(a => a.status === 'PRESENT').length
  const apology = event.attendances.filter(a => a.status === 'ABSENT_APOLOGY').length
  const noApology = event.attendances.filter(a => a.status === 'ABSENT_NO_APOLOGY').length

  async function markAttendance(formData: FormData) {
    'use server'
    const token = cookies().get('session')?.value
    const session = await prisma.session.findUnique({ where: { token }, include: { user: true } })
    if (!session) redirect('/login')

    const eventId = formData.get('eventId') as string
    const userId = formData.get('userId') as string
    const status = formData.get('status') as string
    const note = formData.get('note') as string

    await prisma.attendance.upsert({
      where: { eventId_userId: { eventId, userId } },
      update: { status: status as any, note: note || null, markedById: session.user.id, markedAt: new Date() },
      create: { eventId, userId, status: status as any, note: note || null, markedById: session.user.id, markedAt: new Date() }
    })

    await prisma.activityLedger.create({
      data: {
        userId,
        points: status === 'PRESENT' ? 10 : 5,
        reason: `Attendance ${status} for event ${eventId}`,
        eventId
      }
    })

    redirect(`/events/${eventId}/attendance`)
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Attendance: {event.title}</h1>
          <p className="text-slate-500">Present: {present} • Absent (apology): {apology} • Absent (no apology): {noApology}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mark Attendance</CardTitle>
          <p className="text-sm text-slate-500">Search member ID or name, mark instantly. Saves with markedBy and markedAt. Optimistic UI.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={markAttendance} className="flex gap-2">
            <input type="hidden" name="eventId" value={event.id} />
            <select name="userId" className="border rounded-md px-3 py-2 text-sm flex-1">
              {allMembers.map(m => (
                <option key={m.id} value={m.id}>{m.memberId} - {m.fullName}</option>
              ))}
            </select>
            <select name="status" className="border rounded-md px-3 py-2 text-sm">
              <option value="PRESENT">✅ Present</option>
              <option value="ABSENT_APOLOGY">🟡 Absent — with apology</option>
              <option value="ABSENT_NO_APOLOGY">🔴 Absent — no apology</option>
            </select>
            <Input name="note" placeholder="Reason (optional)" className="w-40" />
            <Button type="submit" className="bg-teal-600">Mark</Button>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-6">
            {allMembers.map(member => {
              const att = event.attendances.find(a => a.userId === member.id)
              return (
                <div key={member.id} className="flex items-center justify-between p-2 border rounded-lg">
                  <div>
                    <div className="font-medium text-sm">{member.fullName}</div>
                    <div className="text-xs text-slate-500">{member.memberId}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {att ? <StatusPill status={att.status} /> : <span className="text-xs text-slate-400">Not marked</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
