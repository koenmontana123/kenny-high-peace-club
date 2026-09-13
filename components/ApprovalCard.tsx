import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { StatusPill } from './StatusPill'

export function ApprovalCard({ event }: { event: any }) {
  return (
    <Card>
      <CardHeader><CardTitle>{event.title}</CardTitle></CardHeader>
      <CardContent>
        <StatusPill status={event.status} />
        <p className="text-sm mt-2">{event.description}</p>
      </CardContent>
    </Card>
  )
}
