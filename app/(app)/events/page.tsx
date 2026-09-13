import { prisma } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusPill } from '@/components/StatusPill'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { formatDate, formatKES } from '@/lib/utils'
import { cookies } from 'next/headers'

async function getUser() {
  const token = cookies().get('session')?.value
  if (!token) return null
  const session = await prisma.session.findUnique({ where: { token }, include: { user: true } })
  return session?.user || null
}

export default async function EventsPage() {
  const user = await getUser()
  if (!user) return null

  const canPropose = ['PATRON', 'ADMIN', 'CHAIRPERSON', 'CEO', 'VICE_CHAIRPERSON', 'TREASURER', 'CHIEF_ORGANISER', 'SUPER_ADMIN'].includes(user.publicRole)

  const events = await prisma.event.findMany({
    orderBy: { date: 'asc' },
    include: {
      proposedBy: { select: { fullName: true } },
      suggestedBy: { select: { fullName: true } }
    }
  })

  const approved = events.filter(e => e.status === 'APPROVED')
  const pending = events.filter(e => e.status === 'PENDING_APPROVAL')
  const deadlocked = events.filter(e => e.status === 'DEADLOCKED')
  const completed = events.filter(e => e.status === 'COMPLETED')
  const suggestions = events.filter(e => ['SUGGESTED', 'IN_DISCUSSION', 'PENDING_TREASURER', 'PENDING_PATRON_SIGNOFF', 'AMENDMENTS_PENDING'].includes(e.status))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Events</h1>
          <p className="text-slate-500">{events.length} total • {approved.length} approved • {pending.length} pending</p>
        </div>
        <div className="flex gap-2">
          <Link href="/events/suggest">
            <Button variant="outline">Suggest Event</Button>
          </Link>
          {canPropose && (
            <Link href="/events/new">
              <Button className="bg-teal-600 hover:bg-teal-700">Propose Event</Button>
            </Link>
          )}
        </div>
      </div>

      {deadlocked.length > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader>
            <CardTitle className="text-red-800">Deadlocked ({deadlocked.length}) • Needs Patron Decision</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {deadlocked.map(ev => (
              <div key={ev.id} className="p-3 bg-white border rounded-lg flex justify-between">
                <div>
                  <div className="font-medium">{ev.title}</div>
                  <div className="text-xs text-slate-500">{ev.proposedBy?.fullName} • {formatDate(ev.date)} • {formatKES(ev.amountPerMember)}</div>
                </div>
                <Link href={`/events/${ev.id}`} className="text-teal-600 text-sm">View →</Link>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Approved Upcoming</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {approved.length === 0 ? <p className="text-sm text-slate-500">No approved events</p> : approved.map(ev => (
              <div key={ev.id} className="p-3 border rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{ev.title}</div>
                    <div className="text-xs text-slate-500">{formatDate(ev.date)} • {ev.location} • {ev.type}</div>
                    <div className="text-xs mt-1">{ev.description.slice(0, 80)}...</div>
                  </div>
                  <StatusPill status={ev.status} />
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm">{ev.amountPerMember > 0 ? formatKES(ev.amountPerMember) : 'Free'}</span>
                  <Link href={`/events/${ev.id}`} className="text-teal-600 text-xs">View →</Link>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending & Suggestions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[...pending, ...suggestions].map(ev => (
              <div key={ev.id} className="p-3 border rounded-lg">
                <div className="flex justify-between">
                  <div className="font-medium">{ev.title}</div>
                  <StatusPill status={ev.status} />
                </div>
                <div className="text-xs text-slate-500">{ev.suggestedBy?.fullName || ev.proposedBy?.fullName} • {formatDate(ev.date)} • {ev.origin}</div>
                <div className="flex justify-between mt-2">
                  <span className="text-xs">{formatKES(ev.amountPerMember)}</span>
                  <Link href={`/events/${ev.id}`} className="text-teal-600 text-xs">View →</Link>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Completed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {completed.map(ev => (
            <div key={ev.id} className="flex justify-between p-3 border rounded-lg bg-slate-50">
              <div>
                <div className="font-medium">{ev.title}</div>
                <div className="text-xs text-slate-500">{formatDate(ev.date)} • {ev.location}</div>
              </div>
              <StatusPill status={ev.status} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
