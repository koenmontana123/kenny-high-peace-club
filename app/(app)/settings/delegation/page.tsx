import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function DelegationPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Delegation</h1>
      <Card>
        <CardHeader><CardTitle>Vice Chair Delegation</CardTitle></CardHeader>
        <CardContent className="text-sm text-slate-500">
          <p>Chair can delegate to Vice Chair. Vice Chair deputises when delegated.</p>
          <p className="mt-2">This is managed via role assignments. Chair appoints Vice Chair, confirmed by members. Same term as Chair.</p>
        </CardContent>
      </Card>
    </div>
  )
}
