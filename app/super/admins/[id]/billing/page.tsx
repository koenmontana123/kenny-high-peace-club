import { prisma } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function BillingPage({ params }: { params: { id: string } }) {
  const admin = await prisma.adminIdentity.findUnique({
    where: { id: params.id },
    include: { user: true, discountLedger: true }
  })
  if (!admin) return <div className="text-white">Not found</div>

  const earned = admin.discountLedger.filter(l => l.type === 'EARNED').reduce((s, l) => s + l.amount, 0)
  const spent = admin.discountLedger.filter(l => l.type === 'SPENT').reduce((s, l) => s + l.amount, 0)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Billing: {admin.realName}</h1>
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader><CardTitle className="text-white">Discount Ledger</CardTitle></CardHeader>
        <CardContent className="text-sm text-slate-300">
          <div>Earned: KES {earned}</div>
          <div>Spent: KES {spent}</div>
          <div className="font-bold">Balance: KES {earned - spent}</div>
          <div className="mt-4 space-y-1">
            {admin.discountLedger.map(l => (
              <div key={l.id} className="flex justify-between border-b border-slate-700 py-1">
                <span>{l.type} • {l.description}</span>
                <span>KES {l.amount}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
