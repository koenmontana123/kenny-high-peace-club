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

async function proposeEvent(formData: FormData) {
  'use server'

  const token = cookies().get('session')?.value
  if (!token) redirect('/login')
  const session = await prisma.session.findUnique({ where: { token }, include: { user: true } })
  if (!session) redirect('/login')

  const role = session.user.publicRole
  const allowed = ['PATRON', 'ADMIN', 'CHAIRPERSON', 'CEO', 'VICE_CHAIRPERSON', 'TREASURER', 'CHIEF_ORGANISER', 'SUPER_ADMIN']
  if (!allowed.includes(role)) {
    const admin = await prisma.adminIdentity.findUnique({ where: { userId: session.user.id } })
    if (!admin?.isActive) redirect('/dashboard')
  }

  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const date = formData.get('date') as string
  const location = formData.get('location') as string
  const type = formData.get('type') as string
  const amount = parseInt(formData.get('amount') as string, 10) || 0

  if (!title || !description || !date || !location) redirect('/events/new?error=missing')

  const event = await prisma.event.create({
    data: {
      title,
      description,
      date: new Date(date),
      location,
      type: type as any,
      amountPerMember: amount,
      status: 'PENDING_APPROVAL',
      origin: 'PROPOSED',
      proposedById: session.user.id
    }
  })

  await prisma.auditLog.create({
    data: {
      actionType: 'EVENT_PROPOSED',
      actorId: session.user.id,
      details: JSON.stringify({ eventId: event.id, title })
    }
  })

  redirect(`/events/${event.id}`)
}

export default async function NewEventPage({ searchParams }: { searchParams: { error?: string } }) {
  const user = await getUser()
  if (!user) redirect('/login')

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Propose New Event</h1>
      <p className="text-slate-500">Leaders can propose events. Free events need Chair + CEO approval. Paid events need Chair + CEO + Treasurer.</p>

      <Card>
        <CardHeader>
          <CardTitle>Event Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={proposeEvent} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title *</label>
              <Input name="title" required placeholder="Inter-school Peace Debate" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description *</label>
              <textarea name="description" required className="w-full border rounded-md p-3 text-sm min-h-[100px]" placeholder="Detailed description..."></textarea>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Date *</label>
                <Input name="date" type="date" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Location *</label>
                <Input name="location" required placeholder="Main Hall" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <select name="type" className="w-full border rounded-md h-10 px-3 text-sm">
                  <option value="MEETING">MEETING</option>
                  <option value="TRAINING">TRAINING</option>
                  <option value="COMMUNITY">COMMUNITY</option>
                  <option value="SOCIAL">SOCIAL</option>
                  <option value="FUNDRAISER">FUNDRAISER</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount per member (KES)</label>
                <Input name="amount" type="number" min="0" defaultValue="0" />
              </div>
            </div>

            {searchParams?.error && <div className="bg-red-50 border border-red-200 text-red-700 p-2 rounded text-sm">Fill required fields</div>}

            <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700">Propose Event (PENDING_APPROVAL)</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
