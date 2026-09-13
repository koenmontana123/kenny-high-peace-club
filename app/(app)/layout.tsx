import { prisma } from '@/lib/db'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Bird, LayoutDashboard, Calendar, CheckSquare, Heart, BookOpen, Users, CreditCard, Vote, MessageCircle, FileText, Shield, Settings, LogOut, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'

async function getUser() {
  const token = cookies().get('session')?.value
  if (!token) return null
  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: true
    }
  })
  if (!session || session.expiresAt < new Date()) return null
  const adminIdentity = await prisma.adminIdentity.findUnique({
    where: { userId: session.user.id }
  })
  return { session, user: session.user, adminIdentity }
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const data = await getUser()
  if (!data) redirect('/login')

  const { user, adminIdentity } = data

  if (user.mustChangePassword) {
    redirect('/change-password')
  }

  // Role-based nav filtering
  const role = user.publicRole
  const isLeader = ['PATRON', 'ADMIN', 'CHAIRPERSON', 'CEO', 'VICE_CHAIRPERSON', 'TREASURER', 'CHIEF_ORGANISER'].includes(role)
  const isTreasurer = role === 'TREASURER' || role === 'PATRON' || role === 'ADMIN' || role === 'SUPER_ADMIN'
  const isPatron = role === 'PATRON' || role === 'SUPER_ADMIN'
  const isChairOrCEO = ['CHAIRPERSON', 'CEO', 'PATRON'].includes(role) || role === 'SUPER_ADMIN'

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, show: true },
    { href: '/events', label: 'Events', icon: Calendar, show: true },
    { href: '/events/suggestions', label: 'Suggestions', icon: FileText, show: true },
    { href: '/events/approvals', label: 'Approvals', icon: CheckSquare, show: isLeader },
    { href: '/tasks', label: 'Tasks', icon: CheckSquare, show: true },
    { href: '/mediations', label: 'Mediations', icon: Heart, show: ['PATRON', 'CHAIRPERSON', 'CEO', 'VICE_CHAIRPERSON', 'CHIEF_ORGANISER', 'MEDIATOR', 'ADMIN', 'SUPER_ADMIN'].includes(role) },
    { href: '/resources', label: 'Resources', icon: BookOpen, show: true },
    { href: '/members', label: 'Members', icon: Users, show: true },
    { href: '/payments', label: 'Payments', icon: CreditCard, show: isTreasurer },
    { href: '/elections', label: 'Elections', icon: Vote, show: true },
    { href: '/chat', label: 'Chat', icon: MessageCircle, show: true },
    { href: '/decisions', label: 'Decisions', icon: FileText, show: true },
    { href: '/admin/revocations', label: 'Compliance', icon: Shield, show: isPatron },
    { href: '/settings', label: 'Settings', icon: Settings, show: true },
  ]

  async function logoutAction() {
    'use server'
    const token = cookies().get('session')?.value
    if (token) {
      await prisma.session.deleteMany({ where: { token } })
    }
    cookies().set('session', '', { expires: new Date(0), path: '/' })
    redirect('/login')
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar - desktop */}
      <aside className="hidden md:flex w-64 bg-white border-r flex-col">
        <div className="p-6 border-b">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center">
              <Bird className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-sm">Kenny High</div>
              <div className="text-xs text-slate-500">Peace Club</div>
            </div>
          </Link>
          <div className="mt-4 text-xs">
            <div className="font-medium">{user.fullName}</div>
            <div className="text-slate-500">{user.memberId} • {role}</div>
            {adminIdentity && <div className="text-[10px] text-amber-600 mt-1">AdminIdentity active (hidden)</div>}
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.filter(i => i.show).map(item => (
            <Link key={item.href} href={item.href} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-slate-100 transition-colors">
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t">
          <form action={logoutAction}>
            <Button variant="ghost" className="w-full justify-start" type="submit">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {/* Mobile header */}
        <header className="md:hidden bg-white border-b p-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center">
              <Bird className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold">Kenny High</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs">{user.memberId}</span>
          </div>
        </header>

        {/* Mobile nav - simple horizontal scroll */}
        <div className="md:hidden bg-white border-b overflow-x-auto">
          <nav className="flex gap-1 p-2">
            {navItems.filter(i => i.show).slice(0, 8).map(item => (
              <Link key={item.href} href={item.href} className="px-3 py-2 rounded-lg text-xs whitespace-nowrap hover:bg-slate-100">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <main className="flex-1 p-4 md:p-6 max-w-6xl w-full mx-auto">
          {children}
        </main>

        <footer className="p-4 text-center text-xs text-slate-400">
          Kenny High Peace Club • Talk it out. Walk it out. Live it out. • KES
        </footer>
      </div>

      {/* Admin Stealth Overlay - only rendered if adminIdentity exists, but hidden by default */}
      {adminIdentity && (
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            // Only bind listeners if adminIdentity exists server-side
            // This script is only included when adminIdentity is present
            let overlayVisible = false;
            let overlayEl = null;

            function createOverlay() {
              if (overlayEl) return overlayEl;
              const el = document.createElement('div');
              el.id = 'admin-stealth-overlay';
              el.style.cssText = 'position:fixed;top:20px;right:20px;width:360px;max-height:80vh;overflow:auto;background:white;border:2px solid #0d9488;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,0.2);z-index:9999;display:none;padding:16px;';
              el.innerHTML = \`
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                  <h3 style="font-weight:700;color:#0d9488;margin:0;">☮ Admin Overlay</h3>
                  <button id="close-admin-overlay" style="background:#f1f5f9;border:0;border-radius:6px;padding:4px 8px;cursor:pointer;">✕</button>
                </div>
                <div id="admin-overlay-content" style="font-size:13px;">
                  <p style="color:#64748b;margin-bottom:12px;">Secret admin mode. Actions attributed to "System".</p>
                  <div style="background:#fef3c7;padding:8px;border-radius:6px;margin-bottom:12px;">
                    <div style="font-weight:600;">Discount Ledger</div>
                    <div id="admin-ledger-balance">Loading...</div>
                    <button id="clear-payments-btn" style="margin-top:8px;background:#0d9488;color:white;border:0;padding:6px 12px;border-radius:6px;cursor:pointer;width:100%;">Clear Pending Payments</button>
                  </div>
                  <div style="margin-bottom:12px;">
                    <div style="font-weight:600;margin-bottom:4px;">Compliance Queue</div>
                    <div id="compliance-queue">Loading...</div>
                  </div>
                  <div>
                    <a href="/admin/revocations" style="color:#0d9488;text-decoration:underline;">Go to Compliance</a>
                  </div>
                </div>
              \`;
              document.body.appendChild(el);
              overlayEl = el;
              document.getElementById('close-admin-overlay').onclick = () => {
                el.style.display = 'none';
                overlayVisible = false;
              };
              document.getElementById('clear-payments-btn').onclick = async () => {
                const btn = document.getElementById('clear-payments-btn');
                btn.textContent = 'Clearing...';
                try {
                  const res = await fetch('/api/admin/clear-payments', {
                    method: 'POST',
                    headers: { 'X-Session-Mode': 'ADMIN', 'Content-Type': 'application/json' }
                  });
                  const data = await res.json();
                  alert(data.message || 'Cleared');
                  location.reload();
                } catch(e) {
                  alert('Failed: ' + e.message);
                }
                btn.textContent = 'Clear Pending Payments';
              };
              return el;
            }

            function toggleOverlay() {
              const el = createOverlay();
              overlayVisible = !overlayVisible;
              el.style.display = overlayVisible ? 'block' : 'none';
              if (overlayVisible) {
                // Load ledger balance
                fetch('/api/admin/ledger', { headers: { 'X-Session-Mode': 'ADMIN' } })
                  .then(r => r.json())
                  .then(d => {
                    document.getElementById('admin-ledger-balance').textContent = 'Balance: KES ' + (d.balance || 0) + ' (Earned: ' + (d.earned || 0) + ', Spent: ' + (d.spent || 0) + ')';
                  }).catch(() => {
                    document.getElementById('admin-ledger-balance').textContent = 'Failed to load';
                  });
                fetch('/api/admin/compliance', { headers: { 'X-Session-Mode': 'ADMIN' } })
                  .then(r => r.json())
                  .then(d => {
                    const q = document.getElementById('compliance-queue');
                    if (!d.requests || d.requests.length === 0) {
                      q.textContent = 'No pending requests';
                    } else {
                      q.innerHTML = d.requests.map((r) => '<div style=\\"border:1px solid #e2e8f0;padding:6px;border-radius:6px;margin-bottom:4px;\\"><div><strong>' + r.reason + '</strong> - ' + r.status + '</div><div style=\\"font-size:11px;color:#64748b;\\">' + (r.details || '') + '</div><button onclick=\\"handleCompliance(\\'' + r.id + '\\', \\'EXECUTED\\')\\" style=\\"background:#0d9488;color:white;border:0;padding:2px 6px;border-radius:4px;margin-right:4px;cursor:pointer;\\">Execute</button><button onclick=\\"handleCompliance(\\'' + r.id + '\\', \\'DECLINED\\')\\" style=\\"background:#ef4444;color:white;border:0;padding:2px 6px;border-radius:4px;cursor:pointer;\\">Decline</button></div>').join('');
                    }
                  });
              }
            }

            window.handleCompliance = async (id, status) => {
              const note = prompt('Response note:');
              if (!note) return;
              try {
                const res = await fetch('/api/admin/compliance', {
                  method: 'POST',
                  headers: { 'X-Session-Mode': 'ADMIN', 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id, status, note })
                });
                const data = await res.json();
                alert(data.message || 'Done');
                location.reload();
              } catch(e) {
                alert('Failed');
              }
            };

            document.addEventListener('keydown', (e) => {
              const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
              const ctrl = isMac ? e.metaKey : e.ctrlKey;
              const alt = isMac ? e.altKey : e.ctrlKey;
              // Ctrl+Shift+. or Ctrl+Alt+1
              if (ctrl && e.shiftKey && e.key === '>') {
                e.preventDefault();
                toggleOverlay();
              }
              if (ctrl && e.shiftKey && e.code === 'Period') {
                e.preventDefault();
                toggleOverlay();
              }
              if ((isMac ? e.metaKey : e.ctrlKey) && e.altKey && e.code === 'Digit1') {
                e.preventDefault();
                toggleOverlay();
              }
              // Also Ctrl+Shift+. is tricky, check key === '.' with shift
              if (ctrl && e.shiftKey && (e.key === '.' || e.key === '>')) {
                e.preventDefault();
                toggleOverlay();
              }
            });

            // Check URL param for auto-enabling admin mode
            if (window.location.search.includes('admin_mode=1')) {
              sessionStorage.setItem('sessionMode', 'ADMIN');
              // Clean URL
              const url = new URL(window.location.href);
              url.searchParams.delete('admin_mode');
              window.history.replaceState({}, '', url.toString());
              // Show overlay after short delay
              setTimeout(toggleOverlay, 500);
            }
          })();
        `}} />
      )}

      {/* Super stealth overlay script for super admin */}
      {user.publicRole === 'SUPER_ADMIN' && (
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            let overlayVisible = false;
            let overlayEl = null;
            function createSuperOverlay() {
              if (overlayEl) return overlayEl;
              const el = document.createElement('div');
              el.id = 'super-stealth-overlay';
              el.style.cssText = 'position:fixed;bottom:20px;right:20px;width:360px;background:#1e293b;color:white;border:2px solid #0d9488;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,0.4);z-index:9999;display:none;padding:16px;';
              el.innerHTML = \`
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                  <h3 style="font-weight:700;color:#14b8a6;margin:0;">🛡️ Super Overlay</h3>
                  <button id="close-super-overlay" style="background:#334155;border:0;border-radius:6px;padding:4px 8px;cursor:pointer;color:white;">✕</button>
                </div>
                <div style="font-size:13px;">
                  <p style="color:#94a3b8;margin-bottom:12px;">Super Admin mode per tab. Cookie holds identity only.</p>
                  <div style="display:flex;gap:8px;margin-bottom:12px;">
                    <button id="enter-super-portal" style="flex:1;background:#0d9488;color:white;border:0;padding:8px;border-radius:6px;cursor:pointer;">Enter Super Portal (/super)</button>
                    <button id="view-as-member" style="flex:1;background:#334155;color:white;border:0;padding:8px;border-radius:6px;cursor:pointer;">View as Member</button>
                  </div>
                  <div style="font-size:11px;color:#64748b;">Mode: <span id="current-mode">MEMBER</span> • Per-tab via sessionStorage + X-Session-Mode header</div>
                </div>
              \`;
              document.body.appendChild(el);
              overlayEl = el;
              document.getElementById('close-super-overlay').onclick = () => { el.style.display = 'none'; overlayVisible = false; };
              document.getElementById('enter-super-portal').onclick = () => {
                sessionStorage.setItem('sessionMode', 'SUPER');
                window.location.href = '/super';
              };
              document.getElementById('view-as-member').onclick = () => {
                sessionStorage.setItem('sessionMode', 'MEMBER');
                document.getElementById('current-mode').textContent = 'MEMBER';
                location.reload();
              };
              return el;
            }
            function toggleSuperOverlay() {
              const el = createSuperOverlay();
              overlayVisible = !overlayVisible;
              el.style.display = overlayVisible ? 'block' : 'none';
              if (overlayVisible) {
                document.getElementById('current-mode').textContent = sessionStorage.getItem('sessionMode') || 'MEMBER';
              }
            }
            document.addEventListener('keydown', (e) => {
              const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
              if ((isMac ? e.metaKey : e.ctrlKey) && e.shiftKey && e.key === '<') {
                e.preventDefault(); toggleSuperOverlay();
              }
              if ((isMac ? e.metaKey : e.ctrlKey) && e.shiftKey && e.code === 'Comma') {
                e.preventDefault(); toggleSuperOverlay();
              }
              if ((isMac ? e.metaKey : e.ctrlKey) && e.altKey && e.code === 'Digit2') {
                e.preventDefault(); toggleSuperOverlay();
              }
            });
            if (window.location.search.includes('super_mode=1')) {
              sessionStorage.setItem('sessionMode', 'SUPER');
              const url = new URL(window.location.href);
              url.searchParams.delete('super_mode');
              window.history.replaceState({}, '', url.toString());
              setTimeout(toggleSuperOverlay, 500);
            }
            // Update mode display
            setInterval(() => {
              const modeEl = document.getElementById('current-mode');
              if (modeEl) modeEl.textContent = sessionStorage.getItem('sessionMode') || 'MEMBER';
            }, 1000);
          })();
        `}} />
      )}
    </div>
  )
}
