import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { StatusPill } from './StatusPill'

export function SuggestionCard({ suggestion }: { suggestion: any }) {
  return (
    <Card>
      <CardHeader><CardTitle className="flex justify-between"><span>{suggestion.title}</span><StatusPill status={suggestion.status} /></CardTitle></CardHeader>
      <CardContent><p className="text-sm">{suggestion.description}</p></CardContent>
    </Card>
  )
}
