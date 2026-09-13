import { prisma } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/card'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function GroupsPage() {
  const token = cookies().get('session')?.value
  const session = await prisma.session.findUnique({ where: { token } })
  if (!session) redirect('/login')

  const groups = await prisma.chatRoom.findMany({ where: { type: 'GROUP' }, include: { members: { include: { user: { select: { fullName: true } } } }, messages: true } })

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Group Chats</h1>
      <p className="text-slate-500">Any leader can create group. Any member can create group among themselves (min 3). Creator is moderator, can add/remove. System auto-creates "Suggestion: [Event Title]" group.</p>
      <div className="grid gap-3">
        {groups.map(g => (
          <Card key={g.id}><CardContent className="p-4"><div className="font-medium">{g.name}</div><div className="text-xs text-slate-500">{g.members.length} members • {g.messages.length} messages</div><div className="text-xs">{g.members.map(m => m.user.fullName).join(', ')}</div></CardContent></Card>
        ))}
      </div>
    </div>
  )
}
