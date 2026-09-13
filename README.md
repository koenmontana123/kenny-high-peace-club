# Kenny High Peace Club 🕊️

[![Next.js 14](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-teal?style=for-the-badge)](./LICENSE)
[![Live Preview](https://img.shields.io/badge/Live-Preview-0d9488?style=for-the-badge&logo=googlechrome)](http://localhost:3000/login)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/koenmontana123/kenny-high-peace-club&env=DATABASE_URL,ADMIN_GATE_PATH,SUPER_GATE_PATH&envDescription=Required%20env%20vars%20for%20Kenny%20High%20Peace%20Club&envLink=https://github.com/koenmontana123/kenny-high-peace-club/blob/main/.env.example)

**Governance, payments, and communication platform for a real school peace club in Kenya.**

> Talk it out. Walk it out. Live it out.

- **Primary:** Teal `#0d9488`
- **Accent:** Sand `#fef3c7`
- **Currency:** KES (Kenyan Shillings)
- **Stack:** Next.js 14 (App Router) + TypeScript + Tailwind + Prisma + SQLite + bcryptjs + date-fns + lucide-react

---

## 🚀 Quick Start

```bash
npm install
npx prisma migrate dev
npx prisma db seed   # or npm run seed via tsx prisma/seed.ts
npm run dev
```

Open http://localhost:3000/login

### Demo Logins (all `peace123` except super/admin)

| Role | Email | Password |
|------|-------|----------|
| Patron (Teacher) | adeyemi@kennyhigh.test | peace123 |
| Chairperson | david.mwangi@kennyhigh.test | peace123 |
| CEO (top scorer 68%) | brian.kiprop@kennyhigh.test | peace123 |
| Treasurer | grace.wanjiru@kennyhigh.test | peace123 |
| Chief Organiser | faith.njeri@kennyhigh.test | peace123 |
| Mediator | sofia.hernandez@kennyhigh.test | peace123 |
| Member (has KES 150 debt) | kwame.asante@kennyhigh.test | peace123 |
| Member | lena.petrova@kennyhigh.test | peace123 |
| Vice Chair | amara.okafor@kennyhigh.test | peace123 |
| Secret Admin (appears as MEMBER) | jordan.kimani@kennyhigh.test | adminpeace123 |
| Super Admin | super@kennyhigh.test | superpeace123 |

**Prospect PENDING_PAYMENT:** Peter Ochieng `KHP-2026-009` cannot login until Treasurer marks paid.

**Revoked demo:** Mark Otieno `TRANSFERRED` with handover to Faith Njeri.

---

## 🔐 Secret Gates

Env vars (generated via `scripts/generate-gates.sh`):

```
ADMIN_GATE_PATH="/gate-a7k3f9"
SUPER_GATE_PATH="/root-m9x2p4"
```

- **Public login:** `/login` — clean, no admin traces
- **Admin gate:** `/gate-a7k3f9` → ADMIN mode, same UI, hidden overlay toggle `Ctrl+Shift+.` or `Ctrl+Alt+1` (Mac: `Cmd+Shift+.` or `Cmd+Option+1`)
- **Super gate:** `/root-m9x2p4` → Super portal at `/super`, session 4h, strict sameSite, rate-limited 5/15min

Super overlay: `Ctrl+Shift+,` or `Ctrl+Alt+2` (Mac: `Cmd+Shift+,` or `Cmd+Option+2`) → "Enter Super Admin Portal" button. `/super` has "← View as member (this tab)" button. Per-tab modes via `sessionStorage` + `X-Session-Mode` header.

See `docs/super-admin.md` for full credentials.

---

## 🎭 Roles & Hierarchy

`SUPER_ADMIN → ADMIN → PATRON → (CHAIRPERSON = CEO) → VICE_CHAIRPERSON → (TREASURER = CHIEF_ORGANISER) → MEDIATOR → MEMBER`

- Admin is secret student, `publicRole=MEMBER`, overlay in `AdminIdentity` table, invisible in UI
- Admin actions attributed to "System"
- Admin must pay fees as normal member, but has hidden discount ledger (50% default)
- "Clear pending payments" applies credit oldest-first, Treasurer sees PAID by System
- Admin cannot hold CHAIRPERSON, CEO, TREASURER — enforced
- Super Admin never pays, can hold multiple roles, owns platform

---

## 📋 Features Implemented

### Auth & Routing
- Credentials auth with bcryptjs, session cookie UUID
- One public login `/login`, role-based dashboard at `/dashboard`
- Forced password change on first login (`mustChangePassword`), middleware redirect to `/change-password`
- Role-filtered sidebar, responsive (hamburger <768px)

### Registration with Payment Gate
- Only TREASURER, PATRON, ADMIN can register at `/members/new`
- New user `PENDING_PAYMENT` with auto member ID `KHP-YYYY-NNN`, cannot login
- Treasurer marks paid → `RegistrationPayment` row
- Generate credentials → temp password `peace-river-77` style, `mustChangePassword=true`, one-time modal with Copy/Print
- Registration fee in `ClubSettings` (default KES 200), Treasurer can change at `/settings/fees` with dual approval Chair+CEO, `FeeChange` audit

### Event Proposal & Dual Approval
- Leaders propose at `/events/new`, status `PENDING_APPROVAL`, members can't see yet
- Free → Chair AND CEO must approve
- Paid → Chair AND CEO AND Treasurer
- Rejection requires reason
- Chair vs CEO disagree → `DEADLOCKED`, Patron decides at `/events/approvals` with justification
- All decisions in public Decisions Log `/decisions`
- Only Treasurer can mark COMPLETED/CANCELLED

### Member Event Suggestions Pipeline
- Any active paid member can suggest at `/events/suggest`
- States: `SUGGESTED → IN_DISCUSSION → AMENDMENTS_PENDING → PENDING_PATRON_SIGNOFF → PENDING_TREASURER → APPROVED|REJECTED|WITHDRAWN`
- Stage 2: Leaders + Patron discuss at `/events/suggestions`, comment threaded, vote APPROVE_AS_IS / APPROVE_WITH_AMENDMENTS / REJECT, 3 days or until all vote, Patron sign-off, auto-created chat group "Suggestion: [Title]"
- Stage 3: Treasurer approves amount, can Approve/Amend/Reject
- Everyone pays including leaders, Patron exempt (teacher), Super Admin never pays, Waiver with reason

### Payments & Debt Clearance
- Members see approved events with amount owed
- Treasurer marks Paid/Unpaid/Waived at `/events/[id]/payments`, live totals collected/expected
- Debt clearance gate: red banner, cannot RSVP to new events until cleared, buttons disabled with tooltip
- Leaders held to same standard

### Attendance
- Treasurer (or CEO backup) at `/events/[id]/attendance`
- Search member ID/name, three-way: Present, Absent with apology (note), Absent no apology
- Saves instantly with markedById, markedAt
- Colour-coded roster, summary counts

### Elections & CEO Selection
- Chairperson elected yearly via `/elections`, Patron can call snap
- Nominations 5d (needs second, must accept), Campaign 3d (statements), Voting 1d (secret ballot, ACTIVE only), Results show turnout, never who voted, ties trigger runoff
- CEO relative activity score: total available = sum of all possible points, each member's score = earned, highest becomes CEO, no fixed threshold, brand-new club with 3 meetings still produces CEO
- Points: 10 Present, 5 absent-apology, 5 task completed (+2 on time), 15 mediation, 10 resource, 5 event fee on time, 20 registration
- Min 30% required, else no CEO
- Public leaderboard at `/members` showing `X of Y (Z%)`

### Revocation & Handover
- Patron submits at `/admin/revocations/new` with reason enum
- Admin handles silently via compliance queue, status Received/Under Review/Executed/Declined
- On execution: status REVOKED/GRADUATED/TRANSFERRED/QUIT, open work transfers (tasks, approvals, attendance, events, chat mod), historical stays, snap election if Chair/CEO, RoleHandover audit
- Patron sees Completed but never who executed

### Admin Secret & Super Portal
- Admin overlay only bound if AdminIdentity exists, no DOM change for non-admins
- Compliance queue, discount ledger, clear payments
- Super portal at `/super` dark-themed, full access, audit log, appoint/replace/remove Admins, reset passwords, impersonation log
- Admin roster policy 2-3 active, compartmentalized, no ranks, staggered by grade, cap enforced

### Chat
- Global `/chat`: every active member auto-joined Peace Club, persists, emoji reactions, roster visible
- DMs `/chat/dms`: any two members, block/mute/archive/delete-from-view
- Groups `/chat/groups`: leader can create, member min 3, creator moderator, auto-created suggestion groups
- Text, reactions, file attachments (link), replies, edit/delete own within 24h, soft delete only (deletedAt), visible only to Super Admin, Admin reads every message invisible (messages as System), removed when revoked, report → compliance queue
- Polling every 3s

### Other Resources
- Mediation: date, parties anonymized Student A/B, issue, resolution, status, confidential, mediator, visible only to PATRON, ADMIN, CHAIR, CEO, VICE, CHIEF, MEDIATOR
- Task: title, description, due date, status TODO/IN_PROGRESS/DONE, assignee, creator
- Resource: title, description, category GUIDE/VIDEO/TEMPLATE/DOCUMENT, URL, uploader

### Dashboard Concerning You Card
- Every dashboard starts with Concerning You card at top, role-aware pending items
- Member: suggested events, owed events, tasks, RSVPs, balance
- Chair/CEO: suggestions awaiting vote, events awaiting approval, deadlocks, elections
- Treasurer: amount approvals, unpaid rosters, registration payments, fee changes
- Chief Organiser: suggestions to vote, logistics
- Mediator: cases, trainings
- Patron: deadlocks, revocations, sign-offs, elections
- Empty state: "Nothing on your plate right now — you're all caught up. 🕊️"

### Audit Log
- `/super/audit` full unblinded log, filter by actor, action type, target, date, search, summary strip, table When/Action/Actor/Target/Details JSON, CSV export
- Logged types: ADMIN_GATE_LOGIN, SUPER_GATE_LOGIN, MODE_SWITCH_*, APPOINT_ADMIN, DEACTIVATE_ADMIN, etc.

### UI/UX
- Persistent left sidebar slide-over mobile, role-filtered nav
- Empty states with dove 🕊️
- Skeleton loading (pulsing grey, not spinners)
- Optimistic updates for RSVP, task, attendance, chat
- Responsive: sidebar hamburger <768, stat grid 4→2→1, credential modal full-screen mobile, attendance search one-handed
- Chat sticky input bottom

### Security
- `lib/admin-visibility.ts` filters Admin/Super out of user-facing results
- Mode verification: `X-Session-Mode` header + `sessionStorage` per tab, cookie identity only, server verifies against AdminIdentity
- `assertSingleRole()` enforces one public role, Admin must be MEMBER
- Rate-limit gate logins 5/IP/15min
- Env var secret paths never in client code
- Server action pattern: mode via hidden field `__mode` or `fetchWithMode` wrapper

---

## 🗃️ Seed Data

- Settings: fee KES 200, discount 50%, max admins 3
- 12 users + prospect + revoked, realistic
- Events: 1 PENDING_APPROVAL, 1 DEADLOCKED, 3 APPROVED upcoming, 1 COMPLETED, 3 suggestions (IN_DISCUSSION, PENDING_TREASURER, REJECTED)
- Payments mix PAID/UNPAID/WAIVED, Kwame KES 150 outstanding
- Attendance for Peace Walk: 5 present, 1 apology, 1 no apology
- 3 mediations, 3 resources, 8-10 global chat messages, 2 groups, 2 DMs
- Activity points: Brian top 340 of 500 (68%)
- Admin ledger: 5 EARNED 480, 2 SPENT 140, balance 340
- ~20 audit rows, 1 compliance request EXECUTED, 1 impersonation log
- On seed: prints public logins, generates `docs/super-admin.md`

---

## 📁 File Structure

```
app/
  (auth)/login, change-password
  _secret/admin-gate, super-gate (rewritten from env gates)
  secret/admin-gate, super-gate (actual routes)
  (app)/dashboard, events/*, tasks, mediations, resources, members, payments, elections, chat/*, decisions, admin/revocations, settings/*
  super/* (super portal dark layout)
  api/admin/*, api/chat/*
lib/
  db.ts, auth.ts, session.ts, roles.ts, admin-visibility.ts, activity-points.ts, balance.ts, handover.ts, suggestions.ts, generate-password.ts, member-id.ts, mode-client.ts, fetch-with-mode.ts, super-auth.ts, utils.ts
components/
  EmptyState, StatusPill, SkeletonCard, CredentialModal, RoleGate, AttendanceSearch, ApprovalCard, ElectionBallot, SuggestionCard, SuggestionDiscussion, AmendmentDiff, TreasurerAmountReview, ChatRoom, ChatMessage, DMThread, DebtBanner, RevocationForm, ConcerningYouCard, AdminStealthOverlay, SuperStealthOverlay, AdminSlotCard, ui/*
prisma/schema.prisma, seed.ts
scripts/generate-gates.sh
docs/super-admin.md
middleware.ts
```

---

## ✅ What Done Looks Like

- Student can register (if paid), login, see role-tailored dashboard
- Treasurer can register, issue credentials, mark attendance, record payments, set fees
- Member can suggest event and watch it move through leaders → Patron → Treasurer
- Leaders propose events with dual approval + deadlock handling
- Elections end-to-end with ballot voting and activity-based CEO selection
- Chat works globally, groups, DMs with polling
- Secret Admin can sign in at gate, act silently, pay like member with hidden discount ledger
- Super Admin manages whole platform from `/super` with full visibility
- Every privileged action in audit log unblinded
- Polished, alive with seeded data, handles empty/loading states

---

## 🛠️ Build Order Completed

1. ✅ Prisma schema + seed
2. ✅ Auth + forced-password-change middleware + role routing
3. ✅ Sidebar layout + role-filtered nav
4. ✅ Dashboard with Concerning You card
5. ✅ Events CRUD with dual approval + deadlock
6. ✅ Member suggestions pipeline (3 stages)
7. ✅ Payments + attendance + debt clearance
8. ✅ Admin panel: revocations + compliance + handover
9. ✅ Elections + relative CEO scoring
10. ✅ Chat: global + groups + DMs
11. ✅ Secret admin gate + hidden overlay + session modes
12. ✅ Super admin portal + audit log + roster management
13. ✅ Admin discount ledger + clear pending payments
14. ✅ Polish: empty states, skeletons, optimistic updates, responsive

---

## 📜 License

For Kenny High School Peace Club — built with 🕊️
