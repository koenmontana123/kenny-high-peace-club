import { prisma } from '@/lib/db'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

async function suggestEvent(formData: FormData) {
  'use server'
  const token = cookies().get('session')?.value
  if (!token) redirect('/login')
  const session = await prisma.session.findUnique({ where: { token }, include: { user: true } })
  if (!session) redirect('/login')

  // Check debt clearance gate
  const unpaid = await prisma.eventPayment.findMany({ where: { userId: session.user.id, status: 'UNPAID' } })
  if (unpaid.length > 0) redirect('/events/suggest?error=debt')

  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const date = formData.get('date') as string
  const location = formData.get('location') as string
  const type = formData.get('type') as string
  const amount = parseInt(formData.get('amount') as string, 10) || 0

  if (!title || !description || !date || !location) redirect('/events/suggest?error=missing')

  // Create suggestion
  const event = await prisma.event.create({
    data: {
      title,
      description,
      date: new Date(date),
      location,
      type: type as any,
      amountPerMember: amount,
      status: 'SUGGESTED',
      origin: 'SUGGESTED',
      suggestedById: session.user.id,
      proposedById: session.user.id
    }
  })

  // Auto-create private chat group for leaders + Patron
  const leaders = await prisma.user.findMany({
    where: {
      publicRole: { in: ['CHAIRPERSON', 'CEO', 'VICE_CHAIRPERSON', 'TREASURER', 'CHIEF_ORGANISER', 'PATRON'] },
      status: 'ACTIVE'
    }
  })

  const chatRoom = await prisma.chatRoom.create({
    data: {
      name: `Suggestion: ${title}`,
      type: 'GROUP',
      createdById: session.user.id
    }
  })

  for (const leader of leaders) {
    await prisma.chatRoomMember.create({
      data: {
        roomId: chatRoom.id,
        userId: leader.id,
        isModerator: leader.publicRole === 'PATRON'
      }
    })
  }

  await prisma.event.update({
    where: { id: event.id },
    data: { chatRoomId: chatRoom.id, status: 'IN_DISCUSSION' }
  })

  await prisma.auditLog.create({
    data: {
      actionType: 'SUGGESTION_CREATED',
      actorId: session.user.id,
      details: JSON.stringify({ eventId: event.id, title })
    }
  })

  redirect(`/events/${event.id}`)
}

export default function SuggestEventPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Suggest an Event</h1>
      <p className="text-slate-500">Any active, paid-up member can suggest. Pipeline: Leaders + Patron discuss (3 days or until all vote), Patron sign-off, Treasurer approves amount. Everyone pays including leaders (Patron exempt, Super Admin never pays).</p>

      {searchParams?.error === 'debt' && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded">Clear your previous balance first to suggest events.</div>}

      <Card>
        <CardHeader>
          <CardTitle>Suggestion Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={suggestEvent} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title *</label>
              <Input name="title" required placeholder="Peace Poetry Night" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description *</label>
              <textarea name="description" required className="w-full border rounded-md p-3 text-sm min-h-[100px]" placeholder="What, why, how..."></textarea>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Proposed Date *</label>
                <Input name="date" type="date" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Location *</label>
                <Input name="location" required placeholder="Library Hall" />
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
            <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700">Submit Suggestion</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
