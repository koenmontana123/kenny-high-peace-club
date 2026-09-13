import { prisma } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusPill } from '@/components/StatusPill'
import Link from 'next/link'
import { formatDate, formatKES } from '@/lib/utils'

export default async function SuggestionsPage() {
  const suggestions = await prisma.event.findMany({
    where: { origin: 'SUGGESTED' },
    orderBy: { createdAt: 'desc' },
    include: {
      suggestedBy: { select: { fullName: true } },
      suggestionVotes: true
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Event Suggestions</h1>
          <p className="text-slate-500">Pipeline: SUGGESTED → IN_DISCUSSION → AMENDMENTS_PENDING → PENDING_PATRON_SIGNOFF → PENDING_TREASURER → APPROVED</p>
        </div>
        <Link href="/events/suggest" className="text-teal-600 text-sm border px-3 py-2 rounded-lg">+ Suggest Event</Link>
      </div>

      <div className="grid gap-4">
        {suggestions.map(ev => (
          <Card key={ev.id}>
            <CardHeader>
              <CardTitle className="flex justify-between">
                <span>{ev.title}</span>
                <StatusPill status={ev.status} />
              </CardTitle>
              <p className="text-sm text-slate-500">{ev.suggestedBy?.fullName} • {formatDate(ev.date)} • {formatKES(ev.amountPerMember)} • {ev.suggestionVotes.length} votes</p>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-2">{ev.description}</p>
              <Link href={`/events/${ev.id}`} className="text-teal-600 text-sm">View Discussion →</Link>
            </CardContent>
          </Card>
        ))}
        {suggestions.length === 0 && <Card><CardContent className="p-8 text-center text-slate-500">No suggestions yet</CardContent></Card>}
      </div>
    </div>
  )
}
