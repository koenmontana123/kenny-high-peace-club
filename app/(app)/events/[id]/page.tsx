import { prisma } from '@/lib/db'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusPill } from '@/components/StatusPill'
import { Button } from '@/components/ui/button'
import { formatDate, formatKES } from '@/lib/utils'
import Link from 'next/link'

async function getCurrentUser() {
  const token = cookies().get('session')?.value
  if (!token) return null
  const session = await prisma.session.findUnique({ where: { token }, include: { user: true } })
  return session?.user || null
}

export default async function EventDetailPage({ params }: { params: { id: string } }) {
  const currentUser = await getCurrentUser()
  if (!currentUser) redirect('/login')

  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: {
      proposedBy: { select: { fullName: true, memberId: true } },
      suggestedBy: { select: { fullName: true, memberId: true } },
      approvals: { include: { approver: { select: { fullName: true, publicRole: true } } } },
      suggestionVotes: { include: { voter: { select: { fullName: true, publicRole: true } } } },
      comments: { include: { author: { select: { fullName: true } } }, orderBy: { createdAt: 'asc' } },
      payments: { include: { user: { select: { fullName: true, memberId: true } } } },
      attendances: { include: { user: { select: { fullName: true, memberId: true } } } }
    }
  })

  if (!event) return <div>Event not found</div>

  const isLeader = ['PATRON', 'CHAIRPERSON', 'CEO', 'TREASURER', 'ADMIN', 'SUPER_ADMIN'].includes(currentUser.publicRole)
  const isChairOrCEO = ['CHAIRPERSON', 'CEO'].includes(currentUser.publicRole)
  const isPatron = currentUser.publicRole === 'PATRON' || currentUser.publicRole === 'SUPER_ADMIN'
  const isTreasurer = currentUser.publicRole === 'TREASURER' || currentUser.publicRole === 'SUPER_ADMIN'

  // Check if user has outstanding balance
  const userPayments = await prisma.eventPayment.findMany({ where: { userId: currentUser.id, status: 'UNPAID' } })
  const hasDebt = userPayments.length > 0

  async function approveEvent(formData: FormData) {
    'use server'
    const token = cookies().get('session')?.value
    const session = await prisma.session.findUnique({ where: { token }, include: { user: true } })
    if (!session) redirect('/login')

    const decision = formData.get('decision') as string
    const reason = formData.get('reason') as string
    const eventId = formData.get('eventId') as string

    const ev = await prisma.event.findUnique({ where: { id: eventId } })
    if (!ev) redirect('/events')

    // Check role
    const role = session.user.publicRole
    const allowedRoles = ev.amountPerMember > 0 ? ['CHAIRPERSON', 'CEO', 'TREASURER'] : ['CHAIRPERSON', 'CEO']
    // Patron can also approve deadlocks
    if (!allowedRoles.includes(role) && role !== 'PATRON' && role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
      redirect(`/events/${eventId}?error=not_allowed`)
    }

    // Create or update approval
    await prisma.eventApproval.upsert({
      where: {
        eventId_approverId_role: {
          eventId,
          approverId: session.user.id,
          role: role as any
        }
      },
      update: {
        decision,
        reason: reason || null
      },
      create: {
        eventId,
        approverId: session.user.id,
        role: role as any,
        decision,
        reason: reason || null
      }
    })

    // Check if all required approvals are in
    const approvals = await prisma.eventApproval.findMany({ where: { eventId } })
    const chairApproved = approvals.some(a => a.role === 'CHAIRPERSON' && a.decision === 'APPROVED')
    const ceoApproved = approvals.some(a => a.role === 'CEO' && a.decision === 'APPROVED')
    const treasurerApproved = approvals.some(a => a.role === 'TREASURER' && a.decision === 'APPROVED')
    const chairRejected = approvals.some(a => a.role === 'CHAIRPERSON' && a.decision === 'REJECTED')
    const ceoRejected = approvals.some(a => a.role === 'CEO' && a.decision === 'REJECTED')

    let newStatus = ev.status

    if (chairRejected || ceoRejected) {
      // Check deadlock
      if ((chairApproved && ceoRejected) || (chairRejected && ceoApproved)) {
        newStatus = 'DEADLOCKED'
      } else if (chairRejected || ceoRejected) {
        // If any rejection without deadlock, check if both rejected? For simplicity, if one rejects and other not approved, mark REJECTED
        // But spec says if Chair and CEO disagree -> DEADLOCKED, appears on Patron dashboard
        // We'll handle deadlock case above, otherwise if rejected, mark REJECTED
        if (ev.amountPerMember === 0) {
          if (chairRejected || ceoRejected) {
            // If one rejected and other not approved, deadlock if other approved
            if (chairApproved || ceoApproved) {
              newStatus = 'DEADLOCKED'
            } else {
              newStatus = 'REJECTED'
            }
          }
        } else {
          // Paid event needs 3 approvals
          const anyRejected = approvals.some(a => a.decision === 'REJECTED')
          const allApproved = chairApproved && ceoApproved && treasurerApproved
          if (anyRejected && !allApproved) {
            // Check deadlock between chair and ceo
            if ((chairApproved && ceoRejected) || (chairRejected && ceoApproved)) {
              newStatus = 'DEADLOCKED'
            } else if (anyRejected) {
              newStatus = 'REJECTED'
            }
          }
        }
      }
    }

    if (ev.amountPerMember === 0) {
      if (chairApproved && ceoApproved) newStatus = 'APPROVED'
    } else {
      if (chairApproved && ceoApproved && treasurerApproved) newStatus = 'APPROVED'
    }

    if (newStatus !== ev.status) {
      await prisma.event.update({ where: { id: eventId }, data: { status: newStatus, rejectionReason: decision === 'REJECTED' ? reason : null } })

      await prisma.auditLog.create({
        data: {
          actionType: decision === 'APPROVED' ? 'EVENT_APPROVED' : 'EVENT_REJECTED',
          actorId: session.user.id,
          details: JSON.stringify({ eventId, decision, reason, newStatus })
        }
      })

      // If approved, create EventPayment rows for all active members
      if (newStatus === 'APPROVED') {
        const activeMembers = await prisma.user.findMany({ where: { status: 'ACTIVE' } })
        for (const m of activeMembers) {
          if (m.publicRole === 'SUPER_ADMIN') continue // super never pays
          // Patron exempt unless voted otherwise - for demo, mark WAIVED for patron
          const isPatronUser = m.publicRole === 'PATRON'
          await prisma.eventPayment.upsert({
            where: { eventId_userId: { eventId, userId: m.id } },
            update: {},
            create: {
              eventId,
              userId: m.id,
              amount: ev.amountPerMember,
              status: isPatronUser ? 'WAIVED' : (ev.amountPerMember === 0 ? 'PAID' : 'UNPAID'),
              waiverReason: isPatronUser ? 'Patron exempt - teacher' : null
            }
          })
        }
      }
    }

    redirect(`/events/${eventId}`)
  }

  async function resolveDeadlock(formData: FormData) {
    'use server'
    const token = cookies().get('session')?.value
    const session = await prisma.session.findUnique({ where: { token }, include: { user: true } })
    if (!session) redirect('/login')
    if (!['PATRON', 'SUPER_ADMIN'].includes(session.user.publicRole)) redirect('/dashboard')

    const eventId = formData.get('eventId') as string
    const decision = formData.get('decision') as string
    const justification = formData.get('justification') as string

    await prisma.event.update({
      where: { id: eventId },
      data: {
        status: decision === 'APPROVED' ? 'APPROVED' : 'REJECTED',
        patronDecision: justification,
        rejectionReason: decision === 'REJECTED' ? justification : null
      }
    })

    await prisma.auditLog.create({
      data: {
        actionType: 'DEADLOCK_RESOLVED',
        actorId: session.user.id,
        details: JSON.stringify({ eventId, decision, justification })
      }
    })

    if (decision === 'APPROVED') {
      const ev = await prisma.event.findUnique({ where: { id: eventId } })
      if (ev) {
        const activeMembers = await prisma.user.findMany({ where: { status: 'ACTIVE' } })
        for (const m of activeMembers) {
          if (m.publicRole === 'SUPER_ADMIN') continue
          const isPatronUser = m.publicRole === 'PATRON'
          await prisma.eventPayment.upsert({
            where: { eventId_userId: { eventId, userId: m.id } },
            update: {},
            create: {
              eventId,
              userId: m.id,
              amount: ev.amountPerMember,
              status: isPatronUser ? 'WAIVED' : (ev.amountPerMember === 0 ? 'PAID' : 'UNPAID'),
              waiverReason: isPatronUser ? 'Patron exempt' : null
            }
          })
        }
      }
    }

    redirect(`/events/${eventId}`)
  }

  async function rsvp(formData: FormData) {
    'use server'
    const token = cookies().get('session')?.value
    const session = await prisma.session.findUnique({ where: { token }, include: { user: true } })
    if (!session) redirect('/login')

    const eventId = formData.get('eventId') as string
    const action = formData.get('action') as string

    // Check debt clearance gate
    const unpaid = await prisma.eventPayment.findMany({ where: { userId: session.user.id, status: 'UNPAID' } })
    if (unpaid.length > 0) {
      redirect(`/events/${eventId}?error=debt`)
    }

    // For demo, RSVP is just a placeholder - we don't have RSVP model, but we can use attendance or just show message
    // We'll create a task or just audit log
    await prisma.auditLog.create({
      data: {
        actionType: 'EVENT_APPROVED',
        actorId: session.user.id,
        details: JSON.stringify({ eventId, action: 'RSVP', rsvp: action })
      }
    })

    redirect(`/events/${eventId}?rsvp=${action}`)
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{event.title}</h1>
        <StatusPill status={event.status} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>{event.description}</div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                <div><span className="text-slate-500">Date:</span> {formatDate(event.date)}</div>
                <div><span className="text-slate-500">Location:</span> {event.location}</div>
                <div><span className="text-slate-500">Type:</span> {event.type}</div>
                <div><span className="text-slate-500">Amount:</span> {formatKES(event.amountPerMember)}</div>
                <div><span className="text-slate-500">Origin:</span> {event.origin}</div>
                <div><span className="text-slate-500">Proposed by:</span> {event.proposedBy?.fullName || event.suggestedBy?.fullName || 'Unknown'}</div>
              </div>
              {event.rejectionReason && <div className="bg-red-50 border border-red-200 p-3 rounded text-red-700">Rejection: {event.rejectionReason}</div>}
              {event.patronDecision && <div className="bg-amber-50 border border-amber-200 p-3 rounded text-amber-800">Patron Decision: {event.patronDecision}</div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Approvals & Votes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {event.approvals.length === 0 && event.suggestionVotes.length === 0 && <p className="text-sm text-slate-500">No approvals yet</p>}
              {event.approvals.map(a => (
                <div key={a.id} className="flex justify-between p-2 border rounded text-sm">
                  <div>{a.approver.fullName} ({a.role})</div>
                  <div className="flex items-center gap-2"><StatusPill status={a.decision} />{a.reason && <span className="text-xs text-slate-500">{a.reason}</span>}</div>
                </div>
              ))}
              {event.suggestionVotes.map(v => (
                <div key={v.id} className="flex justify-between p-2 border rounded text-sm">
                  <div>{v.voter.fullName} ({v.voter.publicRole})</div>
                  <div><StatusPill status={v.vote} />{v.comment && <span className="text-xs ml-2">{v.comment}</span>}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          {event.comments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Discussion</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {event.comments.map(c => (
                  <div key={c.id} className="p-2 border rounded text-sm">
                    <div className="font-medium">{c.author.fullName}</div>
                    <div>{c.content}</div>
                    <div className="text-xs text-slate-400">{formatDate(c.createdAt)}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          {/* RSVP with debt gate */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">RSVP</CardTitle>
            </CardHeader>
            <CardContent>
              {hasDebt ? (
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded">Clear your previous balance first. Debt clearance gate active.</div>
              ) : (
                <form action={rsvp} className="space-y-2">
                  <input type="hidden" name="eventId" value={event.id} />
                  <div className="flex gap-2">
                    <Button type="submit" name="action" value="YES" className="flex-1 bg-teal-600 hover:bg-teal-700" disabled={hasDebt}>Yes, Attending</Button>
                    <Button type="submit" name="action" value="NO" variant="outline" className="flex-1" disabled={hasDebt}>No</Button>
                  </div>
                  {hasDebt && <p className="text-xs text-red-500">Buttons disabled due to outstanding balance</p>}
                </form>
              )}
            </CardContent>
          </Card>

          {/* Approval actions */}
          {isLeader && event.status === 'PENDING_APPROVAL' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Approve / Reject</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={approveEvent} className="space-y-3">
                  <input type="hidden" name="eventId" value={event.id} />
                  <div className="space-y-2">
                    <label className="text-xs">Reason (required for rejection)</label>
                    <textarea name="reason" className="w-full border rounded p-2 text-sm" placeholder="Reason..."></textarea>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" name="decision" value="APPROVED" className="flex-1 bg-green-600 hover:bg-green-700">Approve</Button>
                    <Button type="submit" name="decision" value="REJECTED" variant="destructive" className="flex-1">Reject</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {isPatron && event.status === 'DEADLOCKED' && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-sm text-red-800">Resolve Deadlock (Patron)</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={resolveDeadlock} className="space-y-3">
                  <input type="hidden" name="eventId" value={event.id} />
                  <div className="space-y-2">
                    <label className="text-xs">Justification *</label>
                    <textarea name="justification" required className="w-full border rounded p-2 text-sm" placeholder="Your decision and justification..."></textarea>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" name="decision" value="APPROVED" className="flex-1 bg-green-600">Approve</Button>
                    <Button type="submit" name="decision" value="REJECTED" variant="destructive" className="flex-1">Reject</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {isTreasurer && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Treasurer Tools</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Link href={`/events/${event.id}/payments`} className="block text-teal-600 hover:underline">→ Manage Payments ({event.payments.length})</Link>
                <Link href={`/events/${event.id}/attendance`} className="block text-teal-600 hover:underline">→ Mark Attendance ({event.attendances.length})</Link>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Payments Summary</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <div>Paid: {event.payments.filter(p => p.status === 'PAID').length}</div>
              <div>Unpaid: {event.payments.filter(p => p.status === 'UNPAID').length}</div>
              <div>Waived: {event.payments.filter(p => p.status === 'WAIVED').length}</div>
              <div className="pt-2 font-bold">Collected: {formatKES(event.payments.filter(p => p.status === 'PAID').reduce((s, p) => s + p.amount, 0))} / {formatKES(event.payments.reduce((s, p) => s + p.amount, 0))}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
