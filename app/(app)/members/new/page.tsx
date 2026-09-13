import { prisma } from '@/lib/db'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

async function getUser() {
  const token = cookies().get('session')?.value
  if (!token) return null
  const session = await prisma.session.findUnique({ where: { token }, include: { user: true } })
  return session?.user || null
}

async function registerMember(formData: FormData) {
  'use server'

  const token = cookies().get('session')?.value
  if (!token) redirect('/login')
  const session = await prisma.session.findUnique({ where: { token }, include: { user: true } })
  if (!session) redirect('/login')

  const role = session.user.publicRole
  if (!['TREASURER', 'PATRON', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
    // Also check AdminIdentity
    const adminId = await prisma.adminIdentity.findUnique({ where: { userId: session.user.id } })
    if (!adminId?.isActive) redirect('/dashboard')
  }

  const fullName = formData.get('fullName') as string
  const email = (formData.get('email') as string)?.toLowerCase().trim()
  const grade = formData.get('grade') as string
  const note = formData.get('note') as string

  if (!fullName || !email) redirect('/members/new?error=missing')

  // Check existing
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) redirect('/members/new?error=exists')

  // Generate memberId
  const year = new Date().getFullYear()
  const lastUser = await prisma.user.findFirst({
    where: { memberId: { startsWith: `KHP-${year}-` } },
    orderBy: { memberId: 'desc' }
  })
  let nextNum = 1
  if (lastUser) {
    const num = parseInt(lastUser.memberId.split('-')[2], 10)
    if (!isNaN(num)) nextNum = num + 1
  } else {
    const all = await prisma.user.findFirst({ orderBy: { memberId: 'desc' } })
    if (all) {
      const match = all.memberId.match(/KHP-\d+-(\d+)/)
      if (match) nextNum = parseInt(match[1], 10) + 1
    }
  }
  const memberId = `KHP-${year}-${String(nextNum).padStart(3, '0')}`

  // Create user with PENDING_PAYMENT, cannot login yet
  const user = await prisma.user.create({
    data: {
      memberId,
      fullName,
      email,
      passwordHash: 'pending', // No credentials yet
      publicRole: 'MEMBER',
      status: 'PENDING_PAYMENT',
      grade: grade || null,
      note: note || null,
      mustChangePassword: false
    }
  })

  await prisma.auditLog.create({
    data: {
      actionType: 'REGISTER_MEMBER',
      actorId: session.user.id,
      targetId: user.id,
      details: JSON.stringify({ memberId, email })
    }
  })

  redirect(`/members/${user.id}`)
}

export default async function NewMemberPage({ searchParams }: { searchParams: { error?: string } }) {
  const user = await getUser()
  if (!user) redirect('/login')

  const canRegister = ['TREASURER', 'PATRON', 'ADMIN', 'SUPER_ADMIN'].includes(user.publicRole) || await prisma.adminIdentity.findUnique({ where: { userId: user.id } }).then(a => !!a?.isActive)
  if (!canRegister) redirect('/dashboard')

  const error = searchParams?.error
  let msg = ''
  if (error === 'missing') msg = 'Fill required fields'
  if (error === 'exists') msg = 'Email already exists'

  const settings = await prisma.clubSettings.findUnique({ where: { id: 'default' } })

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Register New Member</h1>
      <p className="text-slate-500">Registration fee: KES {settings?.registrationFee || 200} • Member will be PENDING_PAYMENT until Treasurer marks paid and generates credentials.</p>

      <Card>
        <CardHeader>
          <CardTitle>Member Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={registerMember} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name *</label>
              <Input name="fullName" required placeholder="John Doe" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email *</label>
              <Input name="email" type="email" required placeholder="john@kennyhigh.test" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Grade</label>
              <Input name="grade" placeholder="9th, 10th, 11th, 12th" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Note (optional)</label>
              <Input name="note" placeholder="Any notes" />
            </div>

            {msg && <div className="bg-red-50 border border-red-200 text-red-700 p-2 rounded text-sm">{msg}</div>}

            <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700">
              Create Member (PENDING_PAYMENT)
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
