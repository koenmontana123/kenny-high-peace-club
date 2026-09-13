import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

export function TreasurerAmountReview({ suggestion }: { suggestion: any }) {
  return (
    <Card>
      <CardHeader><CardTitle>Amount Review: {suggestion.title}</CardTitle></CardHeader>
      <CardContent>
        <div>Amount: KES {suggestion.amountPerMember}</div>
        <div className="mt-2 flex gap-2">
          <button className="bg-green-600 text-white px-3 py-1 rounded text-sm">Approve</button>
          <button className="bg-amber-600 text-white px-3 py-1 rounded text-sm">Amend</button>
          <button className="bg-red-600 text-white px-3 py-1 rounded text-sm">Reject</button>
        </div>
      </CardContent>
    </Card>
  )
}
