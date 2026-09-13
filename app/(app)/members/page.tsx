import { prisma } from '@/lib/db'
import { cookies } from 'next/headers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatusPill } from '@/components/StatusPill'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

async function getUser() {
  const token = cookies().get('session')?.value
  if (!token) return null
  const session = await prisma.session.findUnique({ where: { token }, include: { user: true } })
  return session?.user || null
}

export default async function MembersPage() {
  const currentUser = await getUser()
  if (!currentUser) return null

  const canRegister = ['TREASURER', 'PATRON', 'ADMIN', 'SUPER_ADMIN'].includes(currentUser.publicRole)

  const users = await prisma.user.findMany({
    where: {
      publicRole: { notIn: ['SUPER_ADMIN'] },
      status: { notIn: [] }
    },
    orderBy: { createdAt: 'desc' }
  })

  const active = users.filter(u => u.status === 'ACTIVE')
  const pending = users.filter(u => u.status === 'PENDING_PAYMENT')
  const revoked = users.filter(u => ['REVOKED', 'TRANSFERRED', 'GRADUATED', 'QUIT'].includes(u.status))

  // Activity leaderboard
  const leaderboard = await Promise.all(
    active.map(async (u) => {
      const ledger = await prisma.activityLedger.findMany({ where: { userId: u.id } })
      const earned = ledger.reduce((s, l) => s + l.points, 0)
      const available = 500 // demo
      const percent = Math.round((earned / available) * 100)
      return { ...u, earned, available, percent }
    })
  )
  leaderboard.sort((a, b) => b.percent - a.percent)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Members</h1>
          <p className="text-slate-500">{active.length} active • {pending.length} pending • {revoked.length} revoked</p>
        </div>
        {canRegister && (
          <Link href="/members/new">
            <Button className="bg-teal-600 hover:bg-teal-700">Register Member</Button>
          </Link>
        )}
      </div>

      {pending.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader>
            <CardTitle className="text-amber-800">Pending Payment ({pending.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pending.map(u => (
                <div key={u.id} className="flex items-center justify-between p-3 border rounded-lg bg-amber-50/50">
                  <div>
                    <div className="font-medium">{u.fullName} • {u.memberId}</div>
                    <div className="text-xs text-slate-500">{u.email} • {u.grade}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill status={u.status} />
                    <Link href={`/members/${u.id}`} className="text-teal-600 text-sm">Manage →</Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Activity Leaderboard</CardTitle>
          <p className="text-sm text-slate-500">Relative score out of total available points • CEO is top scorer ≥30%</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {leaderboard.map((u, idx) => (
              <div key={u.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-sm font-bold text-teal-700">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {u.fullName}
                      {u.publicRole !== 'MEMBER' && <Badge variant="secondary">{u.publicRole}</Badge>}
                      {idx === 0 && <Badge variant="default">CEO Candidate</Badge>}
                    </div>
                    <div className="text-xs text-slate-500">{u.memberId} • {u.grade} • {u.email}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm font-bold">{u.earned} of {u.available} ({u.percent}%)</div>
                  <div className="text-xs text-slate-500">Activity</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">{u.fullName} • {u.memberId}</div>
                  <div className="text-xs text-slate-500">{u.email} • {u.publicRole} • {u.grade || 'Teacher'}</div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill status={u.status} />
                  <Link href={`/members/${u.id}`} className="text-teal-600 text-sm">View →</Link>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {revoked.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-600">Revoked / Transferred</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {revoked.map(u => (
                <div key={u.id} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
                  <div>
                    <div className="font-medium">{u.fullName} • {u.memberId}</div>
                    <div className="text-xs text-slate-500">{u.status} • {u.email}</div>
                  </div>
                  <StatusPill status={u.status} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
