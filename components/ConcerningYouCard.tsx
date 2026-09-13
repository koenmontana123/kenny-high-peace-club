import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import Link from 'next/link'

type ConcerningItem = {
  type: string
  title: string
  description?: string
  href?: string
  urgent?: boolean
}

export function ConcerningYouCard({ items, role }: { items: ConcerningItem[], role: string }) {
  if (items.length === 0) {
    return (
      <Card className="border-teal-200 bg-teal-50/50">
        <CardHeader>
          <CardTitle className="text-teal-800 flex items-center gap-2">
            ☮ Concerning You
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-600">Nothing on your plate right now — you're all caught up. 🕊️</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-amber-200 bg-amber-50/30">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">☮ Concerning You</span>
          <Badge variant="secondary">{items.length} pending</Badge>
        </CardTitle>
        <p className="text-sm text-slate-500">Role: {role} • Action needed</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={i} className="flex items-start justify-between p-3 bg-white rounded-lg border">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant={item.urgent ? 'destructive' : 'secondary'}>{item.type}</Badge>
                  {item.urgent && <span className="text-xs text-red-600 font-medium">Urgent</span>}
                </div>
                <div className="font-medium mt-1">{item.title}</div>
                {item.description && <div className="text-sm text-slate-500">{item.description}</div>}
              </div>
              {item.href && (
                <Link href={item.href} className="text-teal-600 text-sm font-medium hover:underline ml-4">
                  View →
                </Link>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
