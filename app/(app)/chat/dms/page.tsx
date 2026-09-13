import { prisma } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/card'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function DMsPage() {
  const token = cookies().get('session')?.value
  const session = await prisma.session.findUnique({ where: { token } })
  if (!session) redirect('/login')

  const dms = await prisma.chatRoom.findMany({ where: { type: 'DM', members: { some: { userId: session.userId } } }, include: { members: { include: { user: { select: { fullName: true } } } }, messages: true } })

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Direct Messages</h1>
      <p className="text-slate-500">Any two members can DM. Open from profile card → Message. Visible only to participants, read-only Admin, and Super Admin. Blocking supported.</p>
      <div className="grid gap-3">
        {dms.map(dm => (
          <Card key={dm.id}><CardContent className="p-4"><div className="font-medium">{dm.name}</div><div className="text-xs text-slate-500">{dm.members.map(m => m.user.fullName).join(' ↔ ')} • {dm.messages.length} messages</div></CardContent></Card>
        ))}
      </div>
    </div>
  )
}
