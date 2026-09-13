import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

async function hash(p: string) {
  return bcrypt.hash(p, 10)
}

function memberIdFor(year: number, num: number) {
  return `KHP-${year}-${String(num).padStart(3, '0')}`
}

async function main() {
  console.log('🌱 Seeding Kenny High Peace Club...')

  // Clear existing
  await prisma.vote.deleteMany()
  await prisma.nomination.deleteMany()
  await prisma.election.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.impersonationLog.deleteMany()
  await prisma.adminDiscountLedger.deleteMany()
  await prisma.roleHandover.deleteMany()
  await prisma.revocationRequest.deleteMany()
  await prisma.messageReaction.deleteMany()
  await prisma.chatMessage.deleteMany()
  await prisma.chatRoomMember.deleteMany()
  await prisma.chatRoom.deleteMany()
  await prisma.activityLedger.deleteMany()
  await prisma.resource.deleteMany()
  await prisma.mediation.deleteMany()
  await prisma.task.deleteMany()
  await prisma.attendance.deleteMany()
  await prisma.eventPayment.deleteMany()
  await prisma.eventComment.deleteMany()
  await prisma.eventSuggestionVote.deleteMany()
  await prisma.eventApproval.deleteMany()
  await prisma.event.deleteMany()
  await prisma.registrationPayment.deleteMany()
  await prisma.feeChange.deleteMany()
  await prisma.session.deleteMany()
  await prisma.adminIdentity.deleteMany()
  await prisma.user.deleteMany()
  await prisma.clubSettings.deleteMany()

  // Settings
  const settings = await prisma.clubSettings.create({
    data: {
      id: 'default',
      registrationFee: 200,
      currency: 'KES',
      adminDiscountRate: 50,
      maxActiveAdmins: 3,
      clubName: 'Kenny High Peace Club',
      tagline: 'Talk it out. Walk it out. Live it out.'
    }
  })

  const peace123 = await hash('peace123')
  const superPass = await hash('superpeace123')
  const adminPass = await hash('adminpeace123')

  // Users
  // Super Admin - hidden
  const superAdmin = await prisma.user.create({
    data: {
      memberId: memberIdFor(2026, 1),
      fullName: 'Alex Developer',
      email: 'super@kennyhigh.test',
      passwordHash: superPass,
      publicRole: 'SUPER_ADMIN',
      status: 'ACTIVE',
      grade: null,
      mustChangePassword: false,
      note: 'Platform owner'
    }
  })

  // Admin - secret student, appears as normal member
  const adminStudent = await prisma.user.create({
    data: {
      memberId: memberIdFor(2026, 2),
      fullName: 'Jordan Kimani',
      email: 'jordan.kimani@kennyhigh.test',
      passwordHash: adminPass,
      publicRole: 'MEMBER', // Must be MEMBER per spec
      status: 'ACTIVE',
      grade: '11th',
      mustChangePassword: false,
      note: 'Secret admin - appears as normal member'
    }
  })

  const adminIdentity = await prisma.adminIdentity.create({
    data: {
      userId: adminStudent.id,
      realName: 'Jordan Kimani',
      grade: '11th',
      isActive: true,
      discountRate: 50
    }
  })

  // Patron
  const patron = await prisma.user.create({
    data: {
      memberId: memberIdFor(2026, 3),
      fullName: 'Mrs. Adeyemi',
      email: 'adeyemi@kennyhigh.test',
      passwordHash: peace123,
      publicRole: 'PATRON',
      status: 'ACTIVE',
      grade: null,
      mustChangePassword: false,
      note: 'Teacher - Patron'
    }
  })

  const chair = await prisma.user.create({
    data: {
      memberId: memberIdFor(2026, 4),
      fullName: 'David Mwangi',
      email: 'david.mwangi@kennyhigh.test',
      passwordHash: peace123,
      publicRole: 'CHAIRPERSON',
      status: 'ACTIVE',
      grade: '12th',
      mustChangePassword: false
    }
  })

  const ceo = await prisma.user.create({
    data: {
      memberId: memberIdFor(2026, 5),
      fullName: 'Brian Kiprop',
      email: 'brian.kiprop@kennyhigh.test',
      passwordHash: peace123,
      publicRole: 'CEO',
      status: 'ACTIVE',
      grade: '12th',
      mustChangePassword: false
    }
  })

  const treasurer = await prisma.user.create({
    data: {
      memberId: memberIdFor(2026, 6),
      fullName: 'Grace Wanjiru',
      email: 'grace.wanjiru@kennyhigh.test',
      passwordHash: peace123,
      publicRole: 'TREASURER',
      status: 'ACTIVE',
      grade: '11th',
      mustChangePassword: false
    }
  })

  const organiser = await prisma.user.create({
    data: {
      memberId: memberIdFor(2026, 7),
      fullName: 'Faith Njeri',
      email: 'faith.njeri@kennyhigh.test',
      passwordHash: peace123,
      publicRole: 'CHIEF_ORGANISER',
      status: 'ACTIVE',
      grade: '11th',
      mustChangePassword: false
    }
  })

  const mediator = await prisma.user.create({
    data: {
      memberId: memberIdFor(2026, 8),
      fullName: 'Sofia Hernandez',
      email: 'sofia.hernandez@kennyhigh.test',
      passwordHash: peace123,
      publicRole: 'MEDIATOR',
      status: 'ACTIVE',
      grade: '11th',
      mustChangePassword: false
    }
  })

  const kwame = await prisma.user.create({
    data: {
      memberId: memberIdFor(2026, 9),
      fullName: 'Kwame Asante',
      email: 'kwame.asante@kennyhigh.test',
      passwordHash: peace123,
      publicRole: 'MEMBER',
      status: 'ACTIVE',
      grade: '9th',
      mustChangePassword: false
    }
  })

  const lena = await prisma.user.create({
    data: {
      memberId: memberIdFor(2026, 10),
      fullName: 'Lena Petrova',
      email: 'lena.petrova@kennyhigh.test',
      passwordHash: peace123,
      publicRole: 'MEMBER',
      status: 'ACTIVE',
      grade: '10th',
      mustChangePassword: false
    }
  })

  // Prospect mid-registration
  const peter = await prisma.user.create({
    data: {
      memberId: memberIdFor(2026, 11),
      fullName: 'Peter Ochieng',
      email: 'peter.ochieng@kennyhigh.test',
      passwordHash: await hash('temp-pending'),
      publicRole: 'MEMBER',
      status: 'PENDING_PAYMENT',
      grade: '9th',
      mustChangePassword: false,
      note: 'Prospect - pending payment'
    }
  })

  // Revoked account
  const mark = await prisma.user.create({
    data: {
      memberId: memberIdFor(2025, 15),
      fullName: 'Mark Otieno',
      email: 'mark.otieno@kennyhigh.test',
      passwordHash: peace123,
      publicRole: 'MEMBER',
      status: 'TRANSFERRED',
      grade: '12th',
      mustChangePassword: false,
      note: 'Transferred school'
    }
  })

  // Vice chair
  const viceChair = await prisma.user.create({
    data: {
      memberId: memberIdFor(2026, 12),
      fullName: 'Amara Okafor',
      email: 'amara.okafor@kennyhigh.test',
      passwordHash: peace123,
      publicRole: 'VICE_CHAIRPERSON',
      status: 'ACTIVE',
      grade: '12th',
      mustChangePassword: false
    }
  })

  const activeMembers = [chair, ceo, treasurer, organiser, mediator, kwame, lena, viceChair, adminStudent]

  // Registration payments for active members
  for (const m of activeMembers) {
    await prisma.registrationPayment.create({
      data: {
        userId: m.id,
        amount: 200,
        treasurerId: treasurer.id
      }
    })
  }

  // Events
  const now = new Date()
  const nextWeek = new Date(now); nextWeek.setDate(now.getDate() + 7)
  const in6Days = new Date(now); in6Days.setDate(now.getDate() + 6)
  const in9Days = new Date(now); in9Days.setDate(now.getDate() + 9)
  const twoWeeksAgo = new Date(now); twoWeeksAgo.setDate(now.getDate() - 14)

  // PENDING_APPROVAL
  const debateEvent = await prisma.event.create({
    data: {
      title: 'Inter-school Peace Debate',
      description: 'Annual debate with neighboring schools on conflict resolution and youth leadership. Teams of 3, judged by teachers.',
      date: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      location: 'Main Hall',
      type: 'COMMUNITY',
      amountPerMember: 150,
      status: 'PENDING_APPROVAL',
      origin: 'PROPOSED',
      proposedById: organiser.id
    }
  })
  await prisma.eventApproval.create({
    data: {
      eventId: debateEvent.id,
      approverId: chair.id,
      role: 'CHAIRPERSON',
      decision: 'APPROVED',
      reason: 'Great initiative for inter-school collaboration'
    }
  })
  // CEO pending - no approval yet

  // DEADLOCKED
  const culturalDay = await prisma.event.create({
    data: {
      title: 'Term 3 Cultural Day',
      description: 'Showcase of diverse cultures, food, music and peace traditions. Budget includes decorations and sound system.',
      date: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000),
      location: 'School Grounds',
      type: 'SOCIAL',
      amountPerMember: 300,
      status: 'DEADLOCKED',
      origin: 'PROPOSED',
      proposedById: ceo.id
    }
  })
  await prisma.eventApproval.createMany({
    data: [
      {
        eventId: culturalDay.id,
        approverId: ceo.id,
        role: 'CEO',
        decision: 'APPROVED',
        reason: 'Important for unity'
      },
      {
        eventId: culturalDay.id,
        approverId: chair.id,
        role: 'CHAIRPERSON',
        decision: 'REJECTED',
        reason: 'Budget too high for term 3, need to reduce to 200'
      }
    ]
  })

  // APPROVED upcoming
  const peaceCircle = await prisma.event.create({
    data: {
      title: 'Weekly Peace Circle',
      description: 'Our regular Friday peace circle - sharing, listening, and grounding exercises.',
      date: nextWeek,
      location: 'Peace Garden',
      type: 'MEETING',
      amountPerMember: 0,
      status: 'APPROVED',
      origin: 'PROPOSED',
      proposedById: chair.id
    }
  })
  await prisma.eventApproval.createMany({
    data: [
      { eventId: peaceCircle.id, approverId: chair.id, role: 'CHAIRPERSON', decision: 'APPROVED' },
      { eventId: peaceCircle.id, approverId: ceo.id, role: 'CEO', decision: 'APPROVED' }
    ]
  })

  const mediationTraining = await prisma.event.create({
    data: {
      title: 'Peer Mediation Training',
      description: 'Intensive training on active listening, non-violent communication, and mediation steps. Certificate provided.',
      date: in6Days,
      location: 'Room 12',
      type: 'TRAINING',
      amountPerMember: 100,
      status: 'APPROVED',
      origin: 'PROPOSED',
      proposedById: patron.id
    }
  })
  await prisma.eventApproval.createMany({
    data: [
      { eventId: mediationTraining.id, approverId: chair.id, role: 'CHAIRPERSON', decision: 'APPROVED' },
      { eventId: mediationTraining.id, approverId: ceo.id, role: 'CEO', decision: 'APPROVED' },
      { eventId: mediationTraining.id, approverId: treasurer.id, role: 'TREASURER', decision: 'APPROVED' }
    ]
  })

  const peaceAssembly = await prisma.event.create({
    data: {
      title: 'International Day of Peace Assembly',
      description: 'School-wide assembly with speeches, poems, and dove release ceremony.',
      date: in9Days,
      location: 'Assembly Ground',
      type: 'COMMUNITY',
      amountPerMember: 50,
      status: 'APPROVED',
      origin: 'PROPOSED',
      proposedById: treasurer.id
    }
  })
  await prisma.eventApproval.createMany({
    data: [
      { eventId: peaceAssembly.id, approverId: chair.id, role: 'CHAIRPERSON', decision: 'APPROVED' },
      { eventId: peaceAssembly.id, approverId: ceo.id, role: 'CEO', decision: 'APPROVED' },
      { eventId: peaceAssembly.id, approverId: treasurer.id, role: 'TREASURER', decision: 'APPROVED' }
    ]
  })

  const peaceWalk = await prisma.event.create({
    data: {
      title: 'Community Peace Walk',
      description: 'Walk through Mombasa old town spreading peace messages. Completed successfully with 200 participants.',
      date: twoWeeksAgo,
      location: 'Old Town Mombasa',
      type: 'COMMUNITY',
      amountPerMember: 0,
      status: 'COMPLETED',
      origin: 'PROPOSED',
      proposedById: organiser.id
    }
  })

  // Event suggestions
  const poetryNight = await prisma.event.create({
    data: {
      title: 'Inter-house Peace Poetry Night',
      description: 'Poetry competition between houses on theme of unity. Prizes for best poems. Evening event with snacks.',
      date: new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000),
      location: 'Library Hall',
      type: 'SOCIAL',
      amountPerMember: 80,
      status: 'IN_DISCUSSION',
      origin: 'SUGGESTED',
      suggestedById: lena.id,
      proposedById: lena.id
    }
  })

  // Discussion votes
  await prisma.eventSuggestionVote.createMany({
    data: [
      { eventId: poetryNight.id, voterId: chair.id, vote: 'APPROVE_AS_IS', comment: 'Love this idea, poetry heals' },
      { eventId: poetryNight.id, voterId: organiser.id, vote: 'APPROVE_WITH_AMENDMENTS', comment: 'Suggest adding open mic segment' },
      { eventId: patron.id ? poetryNight.id : poetryNight.id, voterId: patron.id, vote: 'APPROVE_AS_IS', comment: 'Approved, but ensure supervision' } // patron vote
    ]
  })

  await prisma.eventComment.createMany({
    data: [
      { eventId: poetryNight.id, authorId: chair.id, content: 'This is a fantastic suggestion, Lena! Poetry night could become a term tradition.' },
      { eventId: poetryNight.id, authorId: organiser.id, content: 'I agree! We should propose amendment: add 30 min open mic after competition.', parentId: undefined },
      { eventId: poetryNight.id, authorId: patron.id, content: 'Good discussion. I support with the open mic amendment. Please ensure we have teacher present.' }
    ]
  })

  const filmScreening = await prisma.event.create({
    data: {
      title: 'Peace Film Screening',
      description: 'Screening of "The Peacemakers" documentary followed by discussion. Popcorn provided.',
      date: new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000),
      location: 'AV Room',
      type: 'SOCIAL',
      amountPerMember: 120,
      status: 'PENDING_TREASURER',
      origin: 'SUGGESTED',
      suggestedById: kwame.id,
      proposedById: kwame.id
    }
  })

  await prisma.eventSuggestionVote.createMany({
    data: [
      { eventId: filmScreening.id, voterId: chair.id, vote: 'APPROVE_AS_IS' },
      { eventId: filmScreening.id, voterId: ceo.id, vote: 'APPROVE_AS_IS' },
      { eventId: filmScreening.id, voterId: organiser.id, vote: 'APPROVE_AS_IS' },
      { eventId: filmScreening.id, voterId: treasurer.id, vote: 'APPROVE_AS_IS' },
      { eventId: filmScreening.id, voterId: patron.id, vote: 'APPROVE_AS_IS', comment: 'Signed off - educational value high' }
    ]
  })

  const campingTrip = await prisma.event.create({
    data: {
      title: 'Outdoor Camping Trip',
      description: 'Weekend camping at Shimba Hills with team building activities.',
      date: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      location: 'Shimba Hills',
      type: 'SOCIAL',
      amountPerMember: 1500,
      status: 'REJECTED',
      origin: 'SUGGESTED',
      suggestedById: kwame.id,
      proposedById: kwame.id,
      rejectionReason: 'Cost too high (KES 1500) and safety concerns for overnight trip without sufficient supervision. Suggest day trip alternative.'
    }
  })

  // Event Payments for approved events
  const approvedEvents = [mediationTraining, peaceAssembly, peaceCircle]
  for (const ev of approvedEvents) {
    for (const m of activeMembers) {
      let status: 'PAID' | 'UNPAID' | 'WAIVED' = 'PAID'
      // Make Kwame have unpaid for demo
      if (m.id === kwame.id && ev.id === mediationTraining.id) status = 'UNPAID'
      if (m.id === kwame.id && ev.id === peaceAssembly.id) status = 'UNPAID'
      // Some random waivers
      if (m.id === lena.id && ev.id === peaceAssembly.id && Math.random() > 0.5) status = 'WAIVED'

      // Patron exempt unless voted otherwise - mark as WAIVED
      if (m.id === patron.id) status = 'WAIVED'

      // Super admin never pays - skip creating payment? Actually spec says never pays, so we don't create.
      // For demo, create but mark waived for patron only.

      // Skip super admin
      if (m.id === superAdmin.id) continue

      // For peaceCircle amount 0, all paid
      if (ev.amountPerMember === 0) status = 'PAID'

      await prisma.eventPayment.create({
        data: {
          eventId: ev.id,
          userId: m.id,
          amount: ev.amountPerMember,
          status,
          markedById: status !== 'UNPAID' ? treasurer.id : null,
          markedAt: status !== 'UNPAID' ? new Date() : null,
          waiverReason: status === 'WAIVED' ? (m.id === patron.id ? 'Patron exempt - teacher' : 'Financial hardship') : null
        }
      })
    }
  }

  // Specifically set Kwame balance 150 outstanding (100 + 50)
  // Already did: mediationTraining 100 + peaceAssembly 50 = 150

  // Attendance for completed Peace Walk
  const attendanceData = [
    { userId: chair.id, status: 'PRESENT' as const },
    { userId: ceo.id, status: 'PRESENT' as const },
    { userId: treasurer.id, status: 'PRESENT' as const },
    { userId: organiser.id, status: 'PRESENT' as const },
    { userId: mediator.id, status: 'PRESENT' as const },
    { userId: kwame.id, status: 'ABSENT_APOLOGY' as const, note: 'family emergency' },
    { userId: lena.id, status: 'ABSENT_NO_APOLOGY' as const },
    { userId: adminStudent.id, status: 'PRESENT' as const }
  ]
  for (const a of attendanceData) {
    await prisma.attendance.create({
      data: {
        eventId: peaceWalk.id,
        userId: a.userId,
        status: a.status,
        note: (a as any).note || null,
        markedById: treasurer.id,
        markedAt: twoWeeksAgo
      }
    })
  }

  // Mediations
  await prisma.mediation.createMany({
    data: [
      {
        issue: 'Disagreement over group project responsibilities leading to heated argument',
        resolution: 'Mediated discussion, clarified roles, agreed on task split and check-ins',
        status: 'RESOLVED',
        partyA: 'Student A',
        partyB: 'Student B',
        confidential: false,
        mediatorId: mediator.id,
        date: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)
      },
      {
        issue: 'Rumors spreading in class causing social exclusion',
        resolution: 'Restorative circle held, apology given, peer support plan created',
        status: 'RESOLVED',
        partyA: 'Student C',
        partyB: 'Student D',
        confidential: true,
        mediatorId: mediator.id,
        date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)
      },
      {
        issue: 'Conflict between two friends over borrowed item not returned',
        resolution: null,
        status: 'IN_PROGRESS',
        partyA: 'Student E',
        partyB: 'Student F',
        confidential: false,
        mediatorId: mediator.id,
        date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)
      }
    ]
  })

  // Resources
  await prisma.resource.createMany({
    data: [
      {
        title: 'Peer Mediation Handbook',
        description: 'Complete guide to peer mediation steps, scripts, and best practices. Updated 2026 edition.',
        category: 'GUIDE',
        url: 'https://example.com/mediation-handbook.pdf',
        uploaderId: patron.id
      },
      {
        title: 'Active Listening 101',
        description: 'Video tutorial on active listening techniques for mediators. 15 minutes.',
        category: 'VIDEO',
        url: 'https://example.com/active-listening.mp4',
        uploaderId: mediator.id
      },
      {
        title: 'Peace Club Charter Template',
        description: 'Template for drafting club constitutions and peace pledges.',
        category: 'TEMPLATE',
        url: 'https://example.com/charter-template.docx',
        uploaderId: chair.id
      }
    ]
  })

  // Tasks
  await prisma.task.createMany({
    data: [
      {
        title: 'Prepare debate briefing notes',
        description: 'Research inter-school debate topics and prepare briefing for team',
        dueDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
        status: 'TODO',
        assigneeId: organiser.id,
        creatorId: chair.id
      },
      {
        title: 'Collect assembly contributions',
        description: 'Follow up with members on KES 50 for Peace Assembly',
        dueDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
        status: 'IN_PROGRESS',
        assigneeId: treasurer.id,
        creatorId: chair.id
      },
      {
        title: 'Book AV room for film screening',
        description: 'Reserve AV room and test projector',
        dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        status: 'TODO',
        assigneeId: organiser.id,
        creatorId: kwame.id
      },
      {
        title: 'Write mediation case notes',
        description: 'Complete confidential notes for recent case',
        dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        status: 'DONE',
        assigneeId: mediator.id,
        creatorId: patron.id
      }
    ]
  })

  // Activity Ledger - points
  // Points: 10 per Present, 5 absent-with-apology, 5 per task completed (+2 on time), 15 per mediation, 10 per resource, 5 per event fee paid on time, 20 one-time registration
  // We want Brian top with 340 of 500 available (68%)
  // Let's create total available points = 500
  // We'll create ledger entries to achieve desired scores

  const usersForPoints = [
    { user: ceo, points: 340 },
    { user: chair, points: 310 },
    { user: treasurer, points: 290 },
    { user: organiser, points: 280 },
    { user: mediator, points: 260 },
    { user: viceChair, points: 220 },
    { user: lena, points: 180 },
    { user: kwame, points: 120 },
    { user: adminStudent, points: 200 }
  ]

  for (const up of usersForPoints) {
    // Create several entries to sum to points
    const entries = [
      { reason: 'Registration fee paid', points: 20 },
      { reason: 'Attendance Present x10', points: Math.min(up.points - 20, 100) },
    ]
    let remaining = up.points - 20 - entries[1].points
    if (remaining > 0) {
      entries.push({ reason: 'Tasks completed', points: Math.min(remaining, 60) })
      remaining -= Math.min(remaining, 60)
    }
    if (remaining > 0) {
      entries.push({ reason: 'Mediation logged', points: Math.min(remaining, 45) })
      remaining -= Math.min(remaining, 45)
    }
    if (remaining > 0) {
      entries.push({ reason: 'Event fees paid on time', points: Math.min(remaining, 50) })
      remaining -= Math.min(remaining, 50)
    }
    if (remaining > 0) {
      entries.push({ reason: 'Resource uploaded', points: remaining })
    }

    for (const e of entries) {
      if (e.points <= 0) continue
      await prisma.activityLedger.create({
        data: {
          userId: up.user.id,
          points: e.points,
          reason: e.reason,
          createdAt: new Date(now.getTime() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000)
        }
      })
    }
  }

  // Chat Rooms
  const globalRoom = await prisma.chatRoom.create({
    data: {
      name: 'Peace Club',
      type: 'GLOBAL',
      createdById: patron.id
    }
  })

  // Add all active members to global room
  for (const m of [...activeMembers, patron]) {
    await prisma.chatRoomMember.create({
      data: {
        roomId: globalRoom.id,
        userId: m.id,
        isModerator: [patron.id, chair.id, ceo.id].includes(m.id)
      }
    })
  }

  // Global messages 8-10
  const globalMessages = [
    { senderId: patron.id, content: 'Good morning everyone! 🕊️ Reminder: Peace Circle this Friday at 4pm in the Peace Garden.' },
    { senderId: chair.id, content: 'Morning Mrs. Adeyemi! I have prepared the agenda for Friday. Will share soon.' },
    { senderId: ceo.id, content: 'Great! I have also been tracking attendance for last month. We are at 85% - well done team!' },
    { senderId: treasurer.id, content: 'Quick reminder: those who haven\'t cleared KES 50 for Peace Assembly, please see me by Wednesday.' },
    { senderId: organiser.id, content: 'For the Cultural Day, I have contacted the music club. They are willing to perform!' },
    { senderId: mediator.id, content: 'Peer mediation training next week - please RSVP if you want to attend. Open to all members.' },
    { senderId: lena.id, content: 'I suggested a poetry night! Would love your thoughts in the suggestions board 📝' },
    { senderId: kwame.id, content: 'Thanks Lena! That sounds amazing. I also suggested a film screening 🎬' },
    { senderId: adminStudent.id, content: 'Looking forward to the Peace Assembly! I have a poem to share.' },
    { senderId: viceChair.id, content: 'Don\'t forget to log your activity points - CEO selection is based on relative score!' }
  ]

  for (let i = 0; i < globalMessages.length; i++) {
    await prisma.chatMessage.create({
      data: {
        roomId: globalRoom.id,
        senderId: globalMessages[i].senderId,
        content: globalMessages[i].content,
        createdAt: new Date(now.getTime() - (globalMessages.length - i) * 60 * 60 * 1000)
      }
    })
  }

  // Group: Event Planning — Peace Walk
  const eventPlanningGroup = await prisma.chatRoom.create({
    data: {
      name: 'Event Planning — Peace Walk',
      type: 'GROUP',
      createdById: chair.id
    }
  })
  for (const uid of [chair.id, organiser.id, treasurer.id]) {
    await prisma.chatRoomMember.create({
      data: {
        roomId: eventPlanningGroup.id,
        userId: uid,
        isModerator: uid === chair.id
      }
    })
  }
  await prisma.chatMessage.createMany({
    data: [
      { roomId: eventPlanningGroup.id, senderId: chair.id, content: 'Team, debrief for Peace Walk went well! 200 participants - record turnout.' },
      { roomId: eventPlanningGroup.id, senderId: organiser.id, content: 'Logistics were smooth. The county gave us permission for old town route quickly.' },
      { roomId: eventPlanningGroup.id, senderId: treasurer.id, content: 'Budget balanced - we spent KES 1200 on banners and water, collected 0 as it was free event.' }
    ]
  })

  // Group: Mediation Team
  const mediationGroup = await prisma.chatRoom.create({
    data: {
      name: 'Mediation Team',
      type: 'GROUP',
      createdById: patron.id
    }
  })
  for (const uid of [mediator.id, patron.id]) {
    await prisma.chatRoomMember.create({
      data: {
        roomId: mediationGroup.id,
        userId: uid,
        isModerator: uid === patron.id
      }
    })
  }
  await prisma.chatMessage.createMany({
    data: [
      { roomId: mediationGroup.id, senderId: patron.id, content: 'Sofia, great work on the recent case. The restorative circle approach was perfect.' },
      { roomId: mediationGroup.id, senderId: mediator.id, content: 'Thank you Mrs. Adeyemi! I am documenting the case now. One more case still in progress.' }
    ]
  })

  // DMs
  const dm1 = await prisma.chatRoom.create({
    data: { name: 'DM: David ↔ Grace', type: 'DM', createdById: chair.id }
  })
  await prisma.chatRoomMember.createMany({
    data: [
      { roomId: dm1.id, userId: chair.id },
      { roomId: dm1.id, userId: treasurer.id }
    ]
  })
  await prisma.chatMessage.createMany({
    data: [
      { roomId: dm1.id, senderId: chair.id, content: 'Grace, can you share the budget for Cultural Day? Chair rejected 300, need revised.' },
      { roomId: dm1.id, senderId: treasurer.id, content: 'Yes, I can do 200 if we cut sound system and use school speakers. Will propose amendment.' }
    ]
  })

  const dm2 = await prisma.chatRoom.create({
    data: { name: 'DM: Sofia ↔ Kwame', type: 'DM', createdById: mediator.id }
  })
  await prisma.chatRoomMember.createMany({
    data: [
      { roomId: dm2.id, userId: mediator.id },
      { roomId: dm2.id, userId: kwame.id }
    ]
  })
  await prisma.chatMessage.createMany({
    data: [
      { roomId: dm2.id, senderId: kwame.id, content: 'Hi Sofia, I want to join mediation training. Is there pre-reading?' },
      { roomId: dm2.id, senderId: mediator.id, content: 'Hi Kwame! Yes, check Resources -> Peer Mediation Handbook. See you next week!' }
    ]
  })

  // Suggestion discussion auto group for poetryNight
  const suggestionGroup = await prisma.chatRoom.create({
    data: { name: `Suggestion: ${poetryNight.title}`, type: 'GROUP', createdById: lena.id }
  })
  for (const uid of [chair.id, ceo.id, treasurer.id, organiser.id, patron.id]) {
    await prisma.chatRoomMember.create({
      data: { roomId: suggestionGroup.id, userId: uid, isModerator: uid === patron.id }
    })
  }
  await prisma.chatMessage.create({
    data: { roomId: suggestionGroup.id, senderId: patron.id, content: `Discussing suggestion: ${poetryNight.title}. Please vote and comment.` }
  })
  await prisma.event.update({ where: { id: poetryNight.id }, data: { chatRoomId: suggestionGroup.id } })

  // Admin discount ledger: 5 EARNED total 480, 2 SPENT total 140, balance 340
  const earnedAmounts = [120, 100, 80, 100, 80] // total 480
  const spentAmounts = [80, 60] // total 140
  for (const amt of earnedAmounts) {
    await prisma.adminDiscountLedger.create({
      data: {
        adminIdentityId: adminIdentity.id,
        type: 'EARNED',
        amount: amt,
        description: 'Payment discount credit earned'
      }
    })
  }
  for (const amt of spentAmounts) {
    await prisma.adminDiscountLedger.create({
      data: {
        adminIdentityId: adminIdentity.id,
        type: 'SPENT',
        amount: amt,
        description: 'Applied to event payment'
      }
    })
  }

  // RoleHandover for Mark Otieno -> Faith Njeri two weeks ago
  await prisma.roleHandover.create({
    data: {
      fromUserId: mark.id,
      toUserId: organiser.id,
      reason: 'STUDENT_TRANSFER',
      details: JSON.stringify({ tasks: ['Prepare debate briefing notes'], events: [], note: 'Transferred to Nairobi Academy' }),
      createdAt: twoWeeksAgo
    }
  })

  // Revocation request from Patron to revoke Mark Otieno, EXECUTED
  await prisma.revocationRequest.create({
    data: {
      targetUserId: mark.id,
      requestedById: patron.id,
      reason: 'STUDENT_TRANSFER',
      details: 'Mark transferred to Nairobi Academy - family relocation',
      status: 'EXECUTED',
      responseNote: 'Completed. All open tasks reassigned to Faith Njeri.',
      resolvedAt: new Date(twoWeeksAgo.getTime() + 2 * 60 * 60 * 1000)
    }
  })

  // Audit logs ~20 rows
  const auditEntries = [
    { actionType: 'SUPER_GATE_LOGIN', actorId: superAdmin.id, details: { ip: '192.168.1.1', gate: '/root-m9x2p4' } },
    { actionType: 'APPOINT_ADMIN', actorId: superAdmin.id, targetId: adminStudent.id, details: { grade: '11th', secret: true } },
    { actionType: 'ADMIN_GATE_LOGIN', actorId: adminStudent.id, details: { ip: '10.0.0.5', mode: 'ADMIN' } },
    { actionType: 'REGISTER_MEMBER', actorId: treasurer.id, targetId: kwame.id, details: { fee: 200 } },
    { actionType: 'MARK_REGISTRATION_PAID', actorId: treasurer.id, targetId: lena.id, details: { amount: 200 } },
    { actionType: 'ISSUE_CREDENTIALS', actorId: treasurer.id, targetId: lena.id, details: { memberId: lena.memberId } },
    { actionType: 'EVENT_PROPOSED', actorId: organiser.id, details: { eventId: debateEvent.id, title: debateEvent.title } },
    { actionType: 'EVENT_APPROVED', actorId: chair.id, details: { eventId: peaceCircle.id } },
    { actionType: 'EVENT_APPROVED', actorId: ceo.id, details: { eventId: peaceCircle.id } },
    { actionType: 'DEADLOCK_RESOLVED', actorId: patron.id, details: { eventId: culturalDay.id, decision: 'Pending patron decision' } },
    { actionType: 'CLEAR_PAYMENT', actorId: null, details: { note: 'System cleared payment via discount ledger', amount: 80 } },
    { actionType: 'RESOLVE_COMPLIANCE', actorId: null, details: { requestId: 'revoke-mark', result: 'EXECUTED' } },
    { actionType: 'HANDOVER_TASKS', actorId: null, details: { from: mark.id, to: organiser.id } },
    { actionType: 'MESSAGE_DELETED', actorId: patron.id, details: { messageId: 'msg-123', reason: 'Inappropriate language' } },
    { actionType: 'FEE_CHANGE_REQUESTED', actorId: treasurer.id, details: { oldFee: 200, newFee: 250 } },
    { actionType: 'FEE_CHANGE_APPROVED', actorId: chair.id, details: { oldFee: 200, newFee: 250, approved: true } },
    { actionType: 'MODE_SWITCH_ADMIN', actorId: adminStudent.id, details: { from: 'MEMBER', to: 'ADMIN' } },
    { actionType: 'MODE_SWITCH_MEMBER', actorId: adminStudent.id, details: { from: 'ADMIN', to: 'MEMBER' } },
    { actionType: 'LOGIN', actorId: ceo.id, details: { ip: '10.0.0.12' } },
    { actionType: 'PASSWORD_CHANGED', actorId: lena.id, details: {} },
  ]

  for (const entry of auditEntries) {
    await prisma.auditLog.create({
      data: {
        actionType: entry.actionType as any,
        actorId: entry.actorId || undefined,
        targetId: (entry as any).targetId || undefined,
        details: JSON.stringify(entry.details),
        ipAddress: (entry.details as any)?.ip || null
      }
    })
  }

  // Impersonation log
  await prisma.impersonationLog.create({
    data: {
      superAdminId: superAdmin.id,
      impersonatedUserId: treasurer.id,
      createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
    }
  })

  // Election
  const election = await prisma.election.create({
    data: {
      title: 'Chairperson Election 2026',
      type: 'CHAIRPERSON',
      status: 'COMPLETED'
    }
  })

  await prisma.nomination.create({
    data: {
      electionId: election.id,
      nomineeId: chair.id,
      nominatorId: ceo.id,
      seconderId: treasurer.id,
      accepted: true,
      statement: 'I will lead with empathy, transparency, and commitment to peace. Talk it out, walk it out, live it out!'
    }
  })

  // Create gate paths file for docs
  const docsDir = path.join(process.cwd(), 'docs')
  if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true })

  // Read .env for gate paths
  const envPath = path.join(process.cwd(), '.env')
  let envContent = ''
  try { envContent = fs.readFileSync(envPath, 'utf-8') } catch {}
  let adminGate = '/gate-a7k3f9'
  let superGate = '/root-m9x2p4'
  const adminMatch = envContent.match(/ADMIN_GATE_PATH=(.+)/)
  const superMatch = envContent.match(/SUPER_GATE_PATH=(.+)/)
  if (adminMatch) adminGate = adminMatch[1].trim()
  if (superMatch) superGate = superMatch[1].trim()

  const superAdminDoc = `# Super Admin Access - Kenny High Peace Club

This file is generated on seed and contains sensitive gate URLs. Do not commit to public repo.

## Gates

- **Super Admin Portal:** \`${superGate}\`
- **Admin Gate:** \`${adminGate}\`

## Demo Credentials

### Super Admin (Developer)
- Email: super@kennyhigh.test
- Password: superpeace123
- Portal: ${superGate}
- Session: 4 hours, sameSite strict, rate-limited 5 attempts per 15min per IP

### Secret Admin (Student - appears as normal member)
- Name: Jordan Kimani
- Email: jordan.kimani@kennyhigh.test
- Password: adminpeace123
- Public Role: MEMBER (in directory, chat, leaderboard)
- Secret overlay: Ctrl+Shift+. or Ctrl+Alt+1 (Mac: Cmd+Shift+. or Cmd+Option+1)
- Login: normal at /login shows MEMBER mode, secret gate ${adminGate} shows ADMIN mode overlay
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

Generated: ${new Date().toISOString()}
`

  fs.writeFileSync(path.join(docsDir, 'super-admin.md'), superAdminDoc)

  console.log('✅ Seed completed!')
  console.log('')
  console.log('=== DEMO LOGINS (public) ===')
  console.log('Patron: adeyemi@kennyhigh.test / peace123')
  console.log('Chair: david.mwangi@kennyhigh.test / peace123')
  console.log('CEO: brian.kiprop@kennyhigh.test / peace123')
  console.log('Treasurer: grace.wanjiru@kennyhigh.test / peace123')
  console.log('Chief Organiser: faith.njeri@kennyhigh.test / peace123')
  console.log('Mediator: sofia.hernandez@kennyhigh.test / peace123')
  console.log('Member (debt demo): kwame.asante@kennyhigh.test / peace123')
  console.log('Member: lena.petrova@kennyhigh.test / peace123')
  console.log('Vice Chair: amara.okafor@kennyhigh.test / peace123')
  console.log('')
  console.log('Prospect PENDING_PAYMENT: peter.ochieng@kennyhigh.test (cannot login)')
  console.log('Revoked demo: mark.otieno@kennyhigh.test (TRANSFERRED)')
  console.log('')
  console.log('Super Admin portal at /super. Admin gate: see docs/super-admin.md')
  console.log(`Admin gate: ${adminGate}, Super gate: ${superGate}`)
  console.log('')
  console.log('Settings: fee KES 200, admin discount 50%, max admins 3')
  console.log('Events: 1 PENDING_APPROVAL, 1 DEADLOCKED, 3 APPROVED upcoming, 1 COMPLETED')
  console.log('Suggestions: 1 IN_DISCUSSION, 1 PENDING_TREASURER, 1 REJECTED')
  console.log('Kwame outstanding: KES 150')
  console.log('Brian top activity: 340 of 500 (68%)')
  console.log('Admin ledger balance: KES 340')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
