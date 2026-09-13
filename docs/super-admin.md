# Super Admin Access - Kenny High Peace Club

This file is generated on seed and contains sensitive gate URLs. Do not commit to public repo.

## Gates

- **Super Admin Portal:** `"/root-m9x2p4"`
- **Admin Gate:** `"/gate-a7k3f9"`

## Demo Credentials

### Super Admin (Developer)
- Email: super@kennyhigh.test
- Password: superpeace123
- Portal: "/root-m9x2p4"
- Session: 4 hours, sameSite strict, rate-limited 5 attempts per 15min per IP

### Secret Admin (Student - appears as normal member)
- Name: Jordan Kimani
- Email: jordan.kimani@kennyhigh.test
- Password: adminpeace123
- Public Role: MEMBER (in directory, chat, leaderboard)
- Secret overlay: Ctrl+Shift+. or Ctrl+Alt+1 (Mac: Cmd+Shift+. or Cmd+Option+1)
- Login: normal at /login shows MEMBER mode, secret gate "/gate-a7k3f9" shows ADMIN mode overlay
- Must pay fees like normal member, but has hidden discount ledger (50%)
- Clear pending payments button in overlay applies credit balance oldest-first, attributed to "System"

### Patron (Teacher)
- Name: Mrs. Adeyemi
- Email: adeyemi@kennyhigh.test
- Password: peace123
- Role: PATRON - breaks deadlocks, calls snap elections, adult oversight

### Other Demo Users (all password: peace123)

- David Mwangi (CHAIRPERSON, 12th) - david.mwangi@kennyhigh.test
- Brian Kiprop (CEO, 12th, top activity 68%) - brian.kiprop@kennyhigh.test
- Grace Wanjiru (TREASURER, 11th) - grace.wanjiru@kennyhigh.test
- Faith Njeri (CHIEF_ORGANISER, 11th) - faith.njeri@kennyhigh.test
- Sofia Hernandez (MEDIATOR, 11th) - sofia.hernandez@kennyhigh.test
- Kwame Asante (MEMBER, 9th, has KES 150 debt) - kwame.asante@kennyhigh.test
- Lena Petrova (MEMBER, 10th) - lena.petrova@kennyhigh.test
- Amara Okafor (VICE_CHAIRPERSON, 12th) - amara.okafor@kennyhigh.test
- Peter Ochieng (PENDING_PAYMENT prospect, KHP-2026-009) - cannot login yet
- Mark Otieno (TRANSFERRED) - demo revoked account

### Registration Fee
- Default KES 200
- Treasurer can change at /settings/fees - requires dual approval Chair + CEO
- Every change creates FeeChange audit row

### Event Payments
- Members pay in person, Treasurer marks Paid/Unpaid/Waived at /events/[id]/payments
- Debt clearance gate: members with outstanding balance cannot RSVP to new events
- Leaders held to same standard

### Admin Discount Ledger
- Seeded: 5 EARNED totaling KES 480, 2 SPENT totaling KES 140, balance KES 340
- Every payment Admin makes as member silently earns credit (50% default)
- "Clear pending payments" button applies credit, Treasurer sees PAID attributed to "System"

### Security Notes
- Admin visibility filter (lib/admin-visibility.ts) runs on every query listing users
- Mode verification: X-Session-Mode header, sessionStorage per tab, cookie holds identity only
- Single-role enforcement: assertSingleRole() when appointing
- Rate-limit gate logins: 5 per IP per 15min
- Env var secret paths never appear in client code

Generated: 2026-09-13T11:14:20.430Z
