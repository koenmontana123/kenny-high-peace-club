import { prisma } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function SuperDashboard() {
  const totalUsers = await prisma.user.count()
  const activeAdmins = await prisma.adminIdentity.count({ where: { isActive: true } })
  const totalEvents = await prisma.event.count()
  const totalMessages = await prisma.chatMessage.count()
  const auditCount = await prisma.auditLog.count()
  const pendingRevocations = await prisma.revocationRequest.count({ where: { status: { in: ['RECEIVED', 'UNDER_REVIEW'] } } })

  const recentAudit = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { actor: { select: { fullName: true } }, target: { select: { fullName: true } } }
  })

  const admins = await prisma.adminIdentity.findMany({
    include: { user: { select: { fullName: true, email: true, memberId: true, publicRole: true } } }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Super Admin Portal</h1>
        <p className="text-slate-400">Full access to everything: every user, every chat message including deleted and System-attributed with true sender, every audit log, appoint/replace/remove Admins, reset passwords, create clubs, impersonate users.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader><CardTitle className="text-sm text-slate-400">Total Users</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-white">{totalUsers}</div></CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader><CardTitle className="text-sm text-slate-400">Active Admins</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-white">{activeAdmins} / 3 max</div></CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader><CardTitle className="text-sm text-slate-400">Total Events</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-white">{totalEvents}</div></CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader><CardTitle className="text-sm text-slate-400">Pending Revocations</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-white">{pendingRevocations}</div></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader><CardTitle className="text-white">Admin Identities (Secret)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {admins.map(a => (
              <div key={a.id} className="p-3 bg-slate-700 rounded-lg">
                <div className="font-medium text-white">{a.realName} • {a.user.memberId} • {a.user.email}</div>
                <div className="text-xs text-slate-400">PublicRole: {a.user.publicRole} (must be MEMBER) • Active: {a.isActive ? 'Yes' : 'No'} • Discount: {a.discountRate}%</div>
                <div className="text-xs text-slate-500 mt-1">Appears as normal member in directory, chat, leaderboard. No badges.</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader><CardTitle className="text-white">Recent Audit (Unblinded)</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-[400px] overflow-auto">
            {recentAudit.map(log => (
              <div key={log.id} className="p-2 bg-slate-700 rounded text-xs">
                <div className="font-medium text-white">{log.actionType} • {log.actor?.fullName || 'System'} → {log.target?.fullName || ''}</div>
                <div className="text-slate-400">{new Date(log.createdAt).toLocaleString()} • {log.details}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader><CardTitle className="text-white">Capabilities</CardTitle></CardHeader>
        <CardContent className="text-sm text-slate-300 space-y-1">
          <div>✅ Every user in every club including every Admin's real identity</div>
          <div>✅ Every chat message including deleted and System-attributed, with true sender</div>
          <div>✅ Every audit log unblinded</div>
          <div>✅ Appoint, replace, or remove Admins silently</div>
          <div>✅ Reset any password</div>
          <div>✅ Create new clubs</div>
          <div>✅ Impersonate users (logged and visible to impersonated user)</div>
          <div>✅ Super Admin never pays any fee, regardless of login mode</div>
          <div>✅ Super Admin can hold multiple roles at once (only exception)</div>
          <div>✅ Super Admin can log in as normal member and chat/participate</div>
        </CardContent>
      </Card>
    </div>
  )
}
