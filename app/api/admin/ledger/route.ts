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

  const ledger = await prisma.adminDiscountLedger.findMany({
    where: { adminIdentityId: adminIdentity.id }
  })

  const earned = ledger.filter(l => l.type === 'EARNED').reduce((s, l) => s + l.amount, 0)
  const spent = ledger.filter(l => l.type === 'SPENT').reduce((s, l) => s + l.amount, 0)
  const balance = earned - spent

  return NextResponse.json({ earned, spent, balance, ledger })
}
