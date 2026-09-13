import { prisma } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function ClubsPage() {
  const settings = await prisma.clubSettings.findUnique({ where: { id: 'default' } })
  const users = await prisma.user.count()
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Clubs</h1>
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader><CardTitle className="text-white">{settings?.clubName}</CardTitle></CardHeader>
        <CardContent className="text-slate-300 text-sm">
          <div>Tagline: {settings?.tagline}</div>
          <div>Members: {users}</div>
          <div>Registration Fee: KES {settings?.registrationFee}</div>
          <div>Currency: {settings?.currency}</div>
        </CardContent>
      </Card>
    </div>
  )
}
