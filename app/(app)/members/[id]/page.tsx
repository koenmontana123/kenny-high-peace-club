import { prisma } from '@/lib/db'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusPill } from '@/components/StatusPill'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import * as bcrypt from 'bcryptjs'
import { CredentialDisplay } from '@/components/CredentialDisplay'

async function getCurrentUser() {
  const token = cookies().get('session')?.value
  if (!token) return null
  const session = await prisma.session.findUnique({ where: { token }, include: { user: true } })
  return session?.user || null
}

export default async function MemberDetailPage({ params }: { params: { id: string } }) {
  const currentUser = await getCurrentUser()
  if (!currentUser) redirect('/login')

  const user = await prisma.user.findUnique({ where: { id: params.id } })
  if (!user) return <div>Not found</div>

  const settings = await prisma.clubSettings.findUnique({ where: { id: 'default' } })
  const canManage = ['TREASURER', 'PATRON', 'ADMIN', 'SUPER_ADMIN'].includes(currentUser.publicRole) || await prisma.adminIdentity.findUnique({ where: { userId: currentUser.id } }).then(a => !!a?.isActive)

  const registrationPayment = await prisma.registrationPayment.findFirst({ where: { userId: user.id } })
  const eventPayments = await prisma.eventPayment.findMany({ where: { userId: user.id }, include: { event: true } })
  const outstanding = eventPayments.filter(p => p.status === 'UNPAID').reduce((s, p) => s + p.amount, 0)

  const ledger = await prisma.activityLedger.findMany({ where: { userId: user.id } })
  const earned = ledger.reduce((s, l) => s + l.points, 0)

  async function markRegistrationPaid() {
    'use server'
    const token = cookies().get('session')?.value
    const session = await prisma.session.findUnique({ where: { token }, include: { user: true } })
    if (!session) redirect('/login')

    const target = await prisma.user.findUnique({ where: { id: params.id } })
    if (!target || target.status !== 'PENDING_PAYMENT') redirect(`/members/${params.id}?error=not_pending`)

    const settings = await prisma.clubSettings.findUnique({ where: { id: 'default' } })

    await prisma.registrationPayment.create({
      data: {
        userId: target.id,
        amount: settings?.registrationFee || 200,
        treasurerId: session.user.id
      }
    })

    await prisma.auditLog.create({
      data: {
        actionType: 'MARK_REGISTRATION_PAID',
        actorId: session.user.id,
        targetId: target.id,
        details: JSON.stringify({ amount: settings?.registrationFee })
      }
    })

    redirect(`/members/${params.id}`)
  }

  async function generateCredentials(formData: FormData) {
    'use server'
    const token = cookies().get('session')?.value
    const session = await prisma.session.findUnique({ where: { token }, include: { user: true } })
    if (!session) redirect('/login')

    const target = await prisma.user.findUnique({ where: { id: params.id } })
    if (!target) redirect('/members')

    // Check if registration paid
    const regPayment = await prisma.registrationPayment.findFirst({ where: { userId: target.id } })
    if (!regPayment && target.status === 'PENDING_PAYMENT') {
      redirect(`/members/${params.id}?error=not_paid`)
    }

    // Generate temp password
    const words = ['peace', 'river', 'mountain', 'sunrise', 'harmony', 'bridge', 'forest', 'ocean', 'meadow', 'valley', 'dove', 'unity', 'hope', 'light']
    const w1 = words[Math.floor(Math.random() * words.length)]
    const w2 = words[Math.floor(Math.random() * words.length)]
    const num = Math.floor(Math.random() * 90) + 10
    const tempPassword = `${w1}-${w2}-${num}`

    const hashed = await bcrypt.hash(tempPassword, 10)

    await prisma.user.update({
      where: { id: target.id },
      data: {
        passwordHash: hashed,
        mustChangePassword: true,
        status: 'ACTIVE'
      }
    })

    await prisma.activityLedger.create({
      data: {
        userId: target.id,
        points: 20,
        reason: 'Registration fee paid'
      }
    })

    await prisma.auditLog.create({
      data: {
        actionType: 'ISSUE_CREDENTIALS',
        actorId: session.user.id,
        targetId: target.id,
        details: JSON.stringify({ memberId: target.memberId })
      }
    })

    // Store temp password in a cookie for one-time display? We'll redirect with query param (insecure but demo)
    // Better to store in sessionStorage via client? For simplicity, redirect with temp password in query (one-time)
    redirect(`/members/${params.id}?tempPassword=${encodeURIComponent(tempPassword)}&showCredentials=1`)
  }

  async function resetPassword() {
    'use server'
    const token = cookies().get('session')?.value
    const session = await prisma.session.findUnique({ where: { token }, include: { user: true } })
    if (!session) redirect('/login')

    const words = ['peace', 'river', 'mountain', 'sunrise', 'harmony', 'bridge', 'forest', 'ocean', 'meadow', 'valley', 'dove', 'unity', 'hope', 'light']
    const w1 = words[Math.floor(Math.random() * words.length)]
    const w2 = words[Math.floor(Math.random() * words.length)]
    const num = Math.floor(Math.random() * 90) + 10
    const tempPassword = `${w1}-${w2}-${num}`

    const hashed = await bcrypt.hash(tempPassword, 10)

    await prisma.user.update({
      where: { id: params.id },
      data: {
        passwordHash: hashed,
        mustChangePassword: true
      }
    })

    redirect(`/members/${params.id}?tempPassword=${encodeURIComponent(tempPassword)}&showCredentials=1`)
  }

  // For credential modal
  const showCredentials = false // will be handled client side via query param

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{user.fullName}</h1>
        <StatusPill status={user.status} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Member Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-slate-500">Member ID:</span> <span className="font-mono font-bold">{user.memberId}</span></div>
              <div><span className="text-slate-500">Email:</span> {user.email}</div>
              <div><span className="text-slate-500">Grade:</span> {user.grade || 'N/A'}</div>
              <div><span className="text-slate-500">Role:</span> <Badge variant="secondary">{user.publicRole}</Badge></div>
              <div><span className="text-slate-500">Status:</span> <StatusPill status={user.status} /></div>
              <div><span className="text-slate-500">Joined:</span> {formatDate(user.createdAt)}</div>
            </div>
            {user.note && <div className="text-sm"><span className="text-slate-500">Note:</span> {user.note}</div>}

            <div className="pt-4 border-t">
              <h4 className="font-semibold mb-2">Registration</h4>
              {registrationPayment ? (
                <div className="text-sm text-green-700 bg-green-50 p-2 rounded">✅ Registration fee KES {registrationPayment.amount} paid on {formatDate(registrationPayment.createdAt)}</div>
              ) : (
                <div className="text-sm text-amber-700 bg-amber-50 p-2 rounded">⚠️ Registration fee KES {settings?.registrationFee} not yet paid</div>
              )}
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-semibold mb-2">Balance</h4>
              <div className="text-sm">Outstanding: KES {outstanding} • Earned points: {earned}</div>
              <div className="mt-2 space-y-1">
                {eventPayments.map(p => (
                  <div key={p.id} className="flex justify-between text-xs border-b py-1">
                    <span>{p.event.title}</span>
                    <span className="flex items-center gap-2">{p.amount} <StatusPill status={p.status} /></span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {canManage && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Treasurer Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {user.status === 'PENDING_PAYMENT' && (
                  <form action={markRegistrationPaid}>
                    <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700">Mark Registration Fee Paid (KES {settings?.registrationFee})</Button>
                  </form>
                )}

                {(user.status === 'PENDING_PAYMENT' && !registrationPayment) ? (
                  <div className="text-xs text-slate-500">Generate credentials unlocks after marking paid</div>
                ) : (
                  <form action={generateCredentials}>
                    <Button type="submit" variant="outline" className="w-full">
                      {user.status === 'PENDING_PAYMENT' ? 'Generate Credentials' : 'Regenerate Credentials'}
                    </Button>
                  </form>
                )}

                <form action={resetPassword}>
                  <Button type="submit" variant="outline" className="w-full">Reset Password</Button>
                </form>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><a href={`/chat?dm=${user.id}`} className="text-teal-600 hover:underline">Message {user.fullName} →</a></div>
              <div><a href={`/members`} className="text-slate-600 hover:underline">Back to Members</a></div>
            </CardContent>
          </Card>
        </div>
      </div>

      <CredentialDisplay memberName={user.fullName} memberId={user.memberId} email={user.email} />
    </div>
  )
}
