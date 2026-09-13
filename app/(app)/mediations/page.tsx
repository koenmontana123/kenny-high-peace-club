import { prisma } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusPill } from '@/components/StatusPill'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function MediationsPage() {
  const token = cookies().get('session')?.value
  const session = await prisma.session.findUnique({ where: { token }, include: { user: true } })
  if (!session) redirect('/login')

  const mediations = await prisma.mediation.findMany({
    orderBy: { createdAt: 'desc' },
    include: { mediator: { select: { fullName: true } } }
  })

  async function createMediation(formData: FormData) {
    'use server'
    const token = cookies().get('session')?.value
    const session = await prisma.session.findUnique({ where: { token }, include: { user: true } })
    if (!session) redirect('/login')

    const issue = formData.get('issue') as string
    const partyA = formData.get('partyA') as string
    const partyB = formData.get('partyB') as string
    const confidential = formData.get('confidential') === 'on'

    if (!issue) redirect('/mediations?error=missing')

    await prisma.mediation.create({
      data: {
        issue,
        partyA: partyA || 'Student A',
        partyB: partyB || 'Student B',
        confidential,
        mediatorId: session.user.id,
        status: 'IN_PROGRESS'
      }
    })

    await prisma.activityLedger.create({
      data: {
        userId: session.user.id,
        points: 15,
        reason: 'Mediation logged'
      }
    })

    redirect('/mediations')
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Mediations</h1>
      <p className="text-slate-500">Visible only to PATRON, ADMIN, CHAIRPERSON, CEO, VICE_CHAIRPERSON, CHIEF_ORGANISER, MEDIATOR. Parties anonymized as Student A, Student B.</p>

      <Card>
        <CardHeader><CardTitle>Log Mediation Case</CardTitle></CardHeader>
        <CardContent>
          <form action={createMediation} className="space-y-3">
            <Input name="issue" placeholder="Issue description" required />
            <div className="grid grid-cols-2 gap-2">
              <Input name="partyA" placeholder="Party A (anonymized)" defaultValue="Student A" />
              <Input name="partyB" placeholder="Party B (anonymized)" defaultValue="Student B" />
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="confidential" /> Confidential</label>
            <Button type="submit" className="bg-teal-600">Log Case</Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {mediations.map(m => (
          <Card key={m.id}>
            <CardContent className="p-4">
              <div className="flex justify-between">
                <div>
                  <div className="font-medium">{m.issue}</div>
                  <div className="text-xs text-slate-500">{m.partyA} vs {m.partyB} • Mediator: {m.mediator.fullName} • {m.confidential ? 'Confidential' : 'Not confidential'}</div>
                  {m.resolution && <div className="text-sm mt-1">Resolution: {m.resolution}</div>}
                </div>
                <StatusPill status={m.status} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
