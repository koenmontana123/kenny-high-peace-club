import { prisma } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function ElectionsPage() {
  const elections = await prisma.election.findMany({ orderBy: { createdAt: 'desc' }, include: { nominations: { include: { nominee: { select: { fullName: true } } } }, votes: true } })

  async function createElection(formData: FormData) {
    'use server'
    const title = formData.get('title') as string
    if (!title) redirect('/elections?error=missing')
    await prisma.election.create({ data: { title, type: 'CHAIRPERSON', status: 'NOMINATION' } })
    redirect('/elections')
  }

  async function vote(formData: FormData) {
    'use server'
    const token = cookies().get('session')?.value
    const session = await prisma.session.findUnique({ where: { token }, include: { user: true } })
    if (!session) redirect('/login')

    const electionId = formData.get('electionId') as string
    const candidateId = formData.get('candidateId') as string

    // Check if already voted
    const existing = await prisma.vote.findUnique({ where: { electionId_voterId: { electionId, voterId: session.user.id } } })
    if (existing) redirect('/elections?error=already_voted')

    await prisma.vote.create({ data: { electionId, voterId: session.user.id, candidateId } })
    redirect('/elections')
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Elections</h1>
      <p className="text-slate-500">Chairperson elected yearly by active members. Nominations 5 days, Campaign 3 days, Voting 1 day. CEO is relative activity scorer (no fixed threshold, min 30% of available). If top scorer wins Chair, CEO passes to next.</p>

      <Card>
        <CardHeader><CardTitle>Create Election (Patron)</CardTitle></CardHeader>
        <CardContent>
          <form action={createElection} className="flex gap-2">
            <Input name="title" placeholder="Chairperson Election 2026" required className="flex-1" />
            <Button type="submit" className="bg-teal-600">Create</Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {elections.map(e => (
          <Card key={e.id}>
            <CardHeader>
              <CardTitle>{e.title} • {e.status} • {e.votes.length} votes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm">Nominations: {e.nominations.map(n => n.nominee.fullName).join(', ') || 'None'}</div>
              <form action={vote} className="flex gap-2">
                <input type="hidden" name="electionId" value={e.id} />
                <select name="candidateId" className="border rounded px-3 py-2 text-sm flex-1">
                  {e.nominations.map(n => <option key={n.id} value={n.nomineeId}>{n.nominee.fullName}</option>)}
                </select>
                <Button type="submit" size="sm">Vote (secret ballot)</Button>
              </form>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
