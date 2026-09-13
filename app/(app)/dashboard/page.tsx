import { prisma } from '@/lib/db'
import { cookies } from 'next/headers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ConcerningYouCard } from '@/components/ConcerningYouCard'
import { DebtBanner } from '@/components/DebtBanner'
import { StatusPill } from '@/components/StatusPill'
import { formatDate, formatKES } from '@/lib/utils'
import Link from 'next/link'

async function getUser() {
  const token = cookies().get('session')?.value
  if (!token) return null
  const session = await prisma.session.findUnique({ where: { token }, include: { user: true } })
  if (!session) return null
  return session.user
}

export default async function DashboardPage({ searchParams }: { searchParams: { welcome?: string } }) {
  const user = await getUser()
  if (!user) return null

  const role = user.publicRole

  // Concerning You logic per role
  let concerningItems: any[] = []

  // Common: outstanding balance
  const eventPayments = await prisma.eventPayment.findMany({
    where: { userId: user.id, status: 'UNPAID' },
    include: { event: true }
  })
  const outstandingAmount = eventPayments.reduce((sum, p) => sum + p.amount, 0)

  if (outstandingAmount > 0) {
    concerningItems.push({
      type: 'PAYMENT',
      title: `Outstanding balance KES ${outstandingAmount}`,
      description: `${eventPayments.length} unpaid event(s)`,
      href: '/payments',
      urgent: true
    })
  }

  // Role specific
  if (['CHAIRPERSON', 'CEO'].includes(role)) {
    const pendingApprovals = await prisma.event.count({ where: { status: 'PENDING_APPROVAL' } })
    if (pendingApprovals > 0) {
      concerningItems.push({
        type: 'APPROVAL',
        title: `${pendingApprovals} event(s) awaiting approval`,
        href: '/events/approvals',
        urgent: true
      })
    }
    const deadlocked = await prisma.event.count({ where: { status: 'DEADLOCKED' } })
    if (deadlocked > 0) {
      concerningItems.push({
        type: 'DEADLOCK',
        title: `${deadlocked} deadlocked event(s)`,
        description: 'Patron needs to decide',
        href: '/events/approvals',
        urgent: true
      })
    }
    const suggestions = await prisma.event.count({ where: { status: 'IN_DISCUSSION' } })
    if (suggestions > 0) {
      concerningItems.push({
        type: 'SUGGESTION',
        title: `${suggestions} suggestion(s) awaiting vote`,
        href: '/events/suggestions'
      })
    }
  }

  if (role === 'TREASURER') {
    const pendingReg = await prisma.user.count({ where: { status: 'PENDING_PAYMENT' } })
    if (pendingReg > 0) {
      concerningItems.push({
        type: 'REGISTRATION',
        title: `${pendingReg} pending registration payment(s)`,
        href: '/members',
        urgent: true
      })
    }
    const pendingTreasurer = await prisma.event.count({ where: { status: 'PENDING_TREASURER' } })
    if (pendingTreasurer > 0) {
      concerningItems.push({
        type: 'AMOUNT_APPROVAL',
        title: `${pendingTreasurer} suggestion(s) awaiting amount approval`,
        href: '/events/suggestions',
        urgent: true
      })
    }
    const feeChanges = await prisma.feeChange.count({ where: { status: 'PENDING_APPROVAL' } })
    if (feeChanges > 0) {
      concerningItems.push({
        type: 'FEE_CHANGE',
        title: `${feeChanges} fee change request(s)`,
        href: '/settings/fees'
      })
    }
  }

  if (role === 'PATRON') {
    const deadlocked = await prisma.event.count({ where: { status: 'DEADLOCKED' } })
    if (deadlocked > 0) {
      concerningItems.push({
        type: 'DEADLOCK',
        title: `${deadlocked} deadlocked event(s) need decision`,
        href: '/events/approvals',
        urgent: true
      })
    }
    const patronSignoff = await prisma.event.count({ where: { status: 'PENDING_PATRON_SIGNOFF' } })
    if (patronSignoff > 0) {
      concerningItems.push({
        type: 'SIGNOFF',
        title: `${patronSignoff} suggestion(s) awaiting sign-off`,
        href: '/events/suggestions',
        urgent: true
      })
    }
  }

  if (role === 'MEDIATOR') {
    const cases = await prisma.mediation.count({ where: { mediatorId: user.id, status: 'IN_PROGRESS' } })
    if (cases > 0) {
      concerningItems.push({
        type: 'MEDIATION',
        title: `${cases} mediation case(s) in progress`,
        href: '/mediations'
      })
    }
  }

  // Member specific
  if (role === 'MEMBER') {
    const mySuggestions = await prisma.event.findMany({
      where: { suggestedById: user.id, status: { notIn: ['APPROVED', 'REJECTED', 'WITHDRAWN'] } }
    })
    for (const s of mySuggestions) {
      concerningItems.push({
        type: 'MY_SUGGESTION',
        title: `Your suggestion "${s.title}" is ${s.status}`,
        href: `/events/suggestions`
      })
    }
  }

  // Tasks assigned
  const myTasks = await prisma.task.count({ where: { assigneeId: user.id, status: { not: 'DONE' } } })
  if (myTasks > 0) {
    concerningItems.push({
      type: 'TASK',
      title: `${myTasks} task(s) assigned to you`,
      href: '/tasks'
    })
  }

  // Upcoming events
  const upcomingEvents = await prisma.event.findMany({
    where: { status: 'APPROVED', date: { gte: new Date() } },
    orderBy: { date: 'asc' },
    take: 5
  })

  // Activity score
  const activityLedger = await prisma.activityLedger.findMany({ where: { userId: user.id } })
  const earned = activityLedger.reduce((sum, l) => sum + l.points, 0)
  // Rough available = 500 for demo
  const available = 500
  const percent = available > 0 ? Math.round((earned / available) * 100) : 0

  // Treasurer stats
  let treasurerStats = null
  if (role === 'TREASURER' || role === 'PATRON') {
    const totalMembers = await prisma.user.count({ where: { status: 'ACTIVE' } })
    const pendingPayments = await prisma.user.count({ where: { status: 'PENDING_PAYMENT' } })
    const totalCollected = await prisma.eventPayment.aggregate({
      where: { status: 'PAID' },
      _sum: { amount: true }
    })
    const pendingApprovals = await prisma.event.count({ where: { status: 'PENDING_APPROVAL' } })
    treasurerStats = { totalMembers, pendingPayments, totalCollected: totalCollected._sum.amount || 0, pendingApprovals }
  }

  // Leader stats
  let leaderStats = null
  if (['CHAIRPERSON', 'CEO', 'VICE_CHAIRPERSON', 'CHIEF_ORGANISER'].includes(role)) {
    const totalMembers = await prisma.user.count({ where: { status: 'ACTIVE' } })
    const openTasks = await prisma.task.count({ where: { status: { not: 'DONE' } } })
    const mediations = await prisma.mediation.count()
    leaderStats = { totalMembers, openTasks, mediations, upcoming: upcomingEvents.length }
  }

  return (
    <div className="space-y-6">
      {searchParams?.welcome && (
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
          <h3 className="font-semibold text-teal-800">Welcome! 🕊️ Password changed successfully.</h3>
          <p className="text-sm text-teal-700">You're all set. Talk it out. Walk it out. Live it out.</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-slate-500">Welcome back, {user.fullName} • {role}</p>
        </div>
        <Badge variant="secondary">{user.memberId}</Badge>
      </div>

      <ConcerningYouCard items={concerningItems} role={role} />

      {outstandingAmount > 0 && (
        <DebtBanner amount={outstandingAmount} outstandingCount={eventPayments.length} />
      )}

      {/* Role-specific cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatKES(outstandingAmount)} owed</div>
            <p className="text-xs text-slate-500 mt-1">{earned} of {available} points ({percent}%)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {await prisma.attendance.count({ where: { userId: user.id, status: 'PRESENT' } })} present
            </div>
            <p className="text-xs text-slate-500 mt-1">Keep it up! 🕊️</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myTasks} open</div>
            <Link href="/tasks" className="text-xs text-teal-600 hover:underline">View tasks →</Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Next Event</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingEvents[0] ? (
              <>
                <div className="font-semibold truncate">{upcomingEvents[0].title}</div>
                <div className="text-xs text-slate-500">{formatDate(upcomingEvents[0].date)} • {upcomingEvents[0].location}</div>
              </>
            ) : (
              <div className="text-sm text-slate-500">No upcoming events</div>
            )}
          </CardContent>
        </Card>
      </div>

      {treasurerStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-teal-200">
            <CardHeader><CardTitle className="text-sm">Members</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{treasurerStats.totalMembers}</div></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Pending Registration</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{treasurerStats.pendingPayments}</div></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Total Collected</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{formatKES(treasurerStats.totalCollected)}</div></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Pending Approvals</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{treasurerStats.pendingApprovals}</div></CardContent>
          </Card>
        </div>
      )}

      {leaderStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardHeader><CardTitle className="text-sm">Members</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{leaderStats.totalMembers}</div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Upcoming Events</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{leaderStats.upcoming}</div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Open Tasks</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{leaderStats.openTasks}</div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Mediations</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{leaderStats.mediations}</div></CardContent></Card>
        </div>
      )}

      {/* Upcoming events list */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Events</CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingEvents.length === 0 ? (
            <p className="text-sm text-slate-500">No events pending approval — you're all caught up. 🕊️</p>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.map(ev => (
                <div key={ev.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{ev.title}</div>
                    <div className="text-xs text-slate-500">{formatDate(ev.date)} • {ev.location} • {ev.type}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill status={ev.status} />
                    <span className="text-sm">{ev.amountPerMember > 0 ? formatKES(ev.amountPerMember) : 'Free'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link href="/chat" className="p-4 bg-white border rounded-lg hover:bg-slate-50 text-center">
          <div className="text-2xl mb-1">💬</div>
          <div className="text-sm font-medium">Chat</div>
        </Link>
        <Link href="/events/suggestions" className="p-4 bg-white border rounded-lg hover:bg-slate-50 text-center">
          <div className="text-2xl mb-1">💡</div>
          <div className="text-sm font-medium">Suggest Event</div>
        </Link>
        <Link href="/members" className="p-4 bg-white border rounded-lg hover:bg-slate-50 text-center">
          <div className="text-2xl mb-1">👥</div>
          <div className="text-sm font-medium">Members</div>
        </Link>
        <Link href="/resources" className="p-4 bg-white border rounded-lg hover:bg-slate-50 text-center">
          <div className="text-2xl mb-1">📚</div>
          <div className="text-sm font-medium">Resources</div>
        </Link>
      </div>
    </div>
  )
}
