import { prisma } from '@/lib/db'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Shield, Users, FileText, Settings, Building, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'

async function getSuperUser() {
  const token = cookies().get('session')?.value
  if (!token) return null
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true }
  })
  if (!session || session.expiresAt < new Date()) return null
  if (session.user.publicRole !== 'SUPER_ADMIN') return null
  return session.user
}

export default async function SuperLayout({ children }: { children: React.ReactNode }) {
  const user = await getSuperUser()
  if (!user) {
    // Redirect to super gate path
    const superGate = process.env.SUPER_GATE_PATH?.replace(/"/g, '') || '/root-m9x2p4'
    redirect(superGate)
  }

  async function logout() {
    'use server'
    const token = cookies().get('session')?.value
    if (token) await prisma.session.deleteMany({ where: { token } })
    cookies().set('session', '', { expires: new Date(0), path: '/' })
    const superGate = process.env.SUPER_GATE_PATH?.replace(/"/g, '') || '/root-m9x2p4'
    redirect(superGate)
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex">
      <aside className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-sm">Super Admin</div>
              <div className="text-xs text-slate-400">Kenny High</div>
            </div>
          </div>
          <div className="mt-4 text-xs">
            <div className="font-medium">{user.fullName}</div>
            <div className="text-slate-400">{user.email}</div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <Link href="/super" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-slate-700">
            <Shield className="w-4 h-4" /> Dashboard
          </Link>
          <Link href="/super/admins" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-slate-700">
            <Users className="w-4 h-4" /> Admins
          </Link>
          <Link href="/super/audit" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-slate-700">
            <FileText className="w-4 h-4" /> Audit Log
          </Link>
          <Link href="/super/clubs" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-slate-700">
            <Building className="w-4 h-4" /> Clubs
          </Link>
          <Link href="/super/settings" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-slate-700">
            <Settings className="w-4 h-4" /> Settings
          </Link>
          <div className="pt-4 border-t border-slate-700 mt-4">
            <a href="/dashboard" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm bg-teal-600 hover:bg-teal-700">
              ← View as member (this tab)
            </a>
            <p className="text-[10px] text-slate-500 mt-2 px-3">Per-tab modes: sessionStorage holds mode per tab; X-Session-Mode header sent with requests. Cookie holds identity only.</p>
          </div>
        </nav>

        <div className="p-4 border-t border-slate-700">
          <form action={logout}>
            <Button variant="ghost" className="w-full justify-start text-slate-300" type="submit">
              Sign Out
            </Button>
          </form>
        </div>
      </aside>

      <main className="flex-1 p-6 bg-slate-900 overflow-auto">
        {children}
      </main>
    </div>
  )
}
