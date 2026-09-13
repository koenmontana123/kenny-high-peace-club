import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  const mode = req.headers.get('X-Session-Mode')
  if (mode !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const token = cookies().get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await prisma.session.findUnique({ where: { token }, include: { user: true } })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminIdentity = await prisma.adminIdentity.findUnique({ where: { userId: session.user.id } })
  if (!adminIdentity || !adminIdentity.isActive) {
    return NextResponse.json({ error: 'Not admin' }, { status: 403 })
  }

  const requests = await prisma.revocationRequest.findMany({
    where: { status: { in: ['RECEIVED', 'UNDER_REVIEW'] } },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { targetUser: { select: { fullName: true, memberId: true } } }
  })

  return NextResponse.json({ requests })
}

export async function POST(req: NextRequest) {
  const mode = req.headers.get('X-Session-Mode')
  if (mode !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const token = cookies().get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await prisma.session.findUnique({ where: { token }, include: { user: true } })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminIdentity = await prisma.adminIdentity.findUnique({ where: { userId: session.user.id } })
  if (!adminIdentity || !adminIdentity.isActive) {
    return NextResponse.json({ error: 'Not admin' }, { status: 403 })
  }

  const body = await req.json()
  const { id, status, note } = body

  if (!id || !status) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const request = await prisma.revocationRequest.findUnique({ where: { id } })
  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Update request
  const updated = await prisma.revocationRequest.update({
    where: { id },
    data: {
      status,
      responseNote: note || (status === 'EXECUTED' ? 'Completed. All open tasks reassigned.' : 'Declined'),
      resolvedAt: new Date()
    }
  })

  if (status === 'EXECUTED') {
    // Execute revocation
    const target = await prisma.user.findUnique({ where: { id: request.targetUserId } })
    if (target) {
      let newStatus: any = 'REVOKED'
      if (request.reason === 'STUDENT_TRANSFER') newStatus = 'TRANSFERRED'
      if (request.reason === 'GRADUATED') newStatus = 'GRADUATED'
      if (request.reason === 'STUDENT_QUIT') newStatus = 'QUIT'

      await prisma.user.update({
        where: { id: target.id },
        data: { status: newStatus }
      })

      // Find replacement: for demo, use Chief Organiser
      const replacement = await prisma.user.findFirst({
        where: { publicRole: 'CHIEF_ORGANISER', status: 'ACTIVE' }
      })

      if (replacement) {
        // Handover tasks
        await prisma.task.updateMany({
          where: { assigneeId: target.id, status: { not: 'DONE' } },
          data: { assigneeId: replacement.id }
        })

        await prisma.roleHandover.create({
          data: {
            fromUserId: target.id,
            toUserId: replacement.id,
            reason: request.reason,
            details: JSON.stringify({ note, executedBy: 'System' })
          }
        })
      }

      await prisma.auditLog.create({
        data: {
          actionType: 'REVOKE_ACCESS',
          actorId: null, // System
          targetId: target.id,
          details: JSON.stringify({ reason: request.reason, status: newStatus, attributedTo: 'System' })
        }
      })
    }
  }

  await prisma.auditLog.create({
    data: {
      actionType: 'RESOLVE_COMPLIANCE',
      actorId: null, // System
      details: JSON.stringify({ requestId: id, status, note, attributedTo: 'System' })
    }
  })

  return NextResponse.json({ message: `Request ${status}`, request: updated })
}
