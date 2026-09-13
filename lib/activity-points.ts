import { prisma } from './db'

export const POINTS = {
  PRESENT: 10,
  ABSENT_APOLOGY: 5,
  TASK_COMPLETED: 5,
  TASK_ON_TIME_BONUS: 2,
  MEDIATION_LOGGED: 15,
  RESOURCE_UPLOADED: 10,
  EVENT_FEE_PAID_ON_TIME: 5,
  REGISTRATION_FEE_PAID: 20
}

export async function calculateUserScore(userId: string, windowDays: number = 365): Promise<{ earned: number, available: number, percent: number }> {
  const since = new Date()
  since.setDate(since.getDate() - windowDays)

  // Get all events in window
  const events = await prisma.event.findMany({
    where: {
      date: { gte: since },
      status: { in: ['APPROVED', 'COMPLETED'] }
    }
  })

  // Total available points = sum of points that could have been earned
  // For each event: attendance (10) + payment (5) if paid event
  let totalAvailable = 0
  for (const ev of events) {
    totalAvailable += POINTS.PRESENT // attendance opportunity
    if (ev.amountPerMember > 0) {
      totalAvailable += POINTS.EVENT_FEE_PAID_ON_TIME
    }
  }

  // Add task opportunities, mediation, etc? For simplicity, use ActivityLedger as source of truth for available
  // The spec says total available = sum of all points that could have been earned from all meetings, tasks, mediations, payments
  // We'll approximate by calculating from actual ledger + events

  // Get user's earned points from ledger in window
  const ledger = await prisma.activityLedger.findMany({
    where: {
      userId,
      createdAt: { gte: since }
    }
  })

  const earned = ledger.reduce((sum, entry) => sum + entry.points, 0)

  // Also calculate from attendance, tasks, etc directly for accuracy
  const attendances = await prisma.attendance.findMany({
    where: { userId, event: { date: { gte: since } } }
  })
  let attendancePoints = 0
  for (const att of attendances) {
    if (att.status === 'PRESENT') attendancePoints += POINTS.PRESENT
    if (att.status === 'ABSENT_APOLOGY') attendancePoints += POINTS.ABSENT_APOLOGY
  }

  const tasksDone = await prisma.task.count({
    where: { assigneeId: userId, status: 'DONE', updatedAt: { gte: since } }
  })
  const taskPoints = tasksDone * POINTS.TASK_COMPLETED

  const mediations = await prisma.mediation.count({
    where: { mediatorId: userId, createdAt: { gte: since } }
  })
  const mediationPoints = mediations * POINTS.MEDIATION_LOGGED

  const resources = await prisma.resource.count({
    where: { uploaderId: userId, createdAt: { gte: since } }
  })
  const resourcePoints = resources * POINTS.RESOURCE_UPLOADED

  // If ledger already contains these, avoid double counting
  // For this implementation, we trust ledger as primary, but also compute total available

  // For total available, we need sum of all possible points across all members
  // Let's compute total possible from events, tasks, mediations in period
  const allEventsCount = events.length
  const allTasksCount = await prisma.task.count({ where: { createdAt: { gte: since } } })
  const allMediationsCount = await prisma.mediation.count({ where: { createdAt: { gte: since } } })
  const allResourcesCount = await prisma.resource.count({ where: { createdAt: { gte: since } } })

  // Rough total available: each event gives 10 attendance + 5 payment opportunity
  // Each task gives 5 points opportunity, each mediation 15, each resource 10
  // Plus registration 20 per member (one-time)
  let available = allEventsCount * (POINTS.PRESENT + POINTS.EVENT_FEE_PAID_ON_TIME) +
    allTasksCount * POINTS.TASK_COMPLETED +
    allMediationsCount * POINTS.MEDIATION_LOGGED +
    allResourcesCount * POINTS.RESOURCE_UPLOADED

  // If available is 0 (brand new club), set to earned to avoid division by zero
  // But spec says even with 3 meetings, produce CEO - person who showed up most out of what was possible
  // So we need at least events count * 10 as available
  if (available === 0) {
    available = allEventsCount * POINTS.PRESENT || 100 // fallback
  }

  // Use ledger earned if larger than computed, else use computed attendance etc
  const computedEarned = attendancePoints + taskPoints + mediationPoints + resourcePoints + 20 // +20 registration
  const finalEarned = Math.max(earned, computedEarned)

  const percent = available > 0 ? (finalEarned / available) * 100 : 0

  return {
    earned: finalEarned,
    available,
    percent
  }
}

export async function getLeaderboard(windowDays: number = 365) {
  const users = await prisma.user.findMany({
    where: {
      status: 'ACTIVE',
      publicRole: { notIn: ['SUPER_ADMIN', 'PATRON'] }
    },
    select: {
      id: true,
      fullName: true,
      memberId: true,
      publicRole: true,
      grade: true
    }
  })

  const scores = await Promise.all(
    users.map(async (u) => {
      const score = await calculateUserScore(u.id, windowDays)
      return { ...u, ...score }
    })
  )

  return scores.sort((a, b) => b.percent - a.percent)
}

export async function selectCEO(): Promise<{ userId: string | null, score: any }> {
  const leaderboard = await getLeaderboard()
  // Minimum 30% required
  const eligible = leaderboard.filter(l => l.percent >= 30)
  if (eligible.length === 0) return { userId: null, score: null }
  return { userId: eligible[0].id, score: eligible[0] }
}
