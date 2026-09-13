import { prisma } from './db'

export async function getUserBalance(userId: string): Promise<{ totalOwed: number, totalPaid: number, outstanding: number, unpaidEvents: any[] }> {
  const payments = await prisma.eventPayment.findMany({
    where: { userId },
    include: { event: true }
  })

  let totalOwed = 0
  let totalPaid = 0
  const unpaidEvents: any[] = []

  for (const p of payments) {
    totalOwed += p.amount
    if (p.status === 'PAID' || p.status === 'WAIVED') {
      totalPaid += p.amount
    } else if (p.status === 'UNPAID') {
      unpaidEvents.push(p)
    }
  }

  // Also check registration payment
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (user?.status === 'PENDING_PAYMENT') {
    const settings = await prisma.clubSettings.findUnique({ where: { id: 'default' } })
    totalOwed += settings?.registrationFee || 200
    unpaidEvents.push({ event: { title: 'Registration Fee' }, amount: settings?.registrationFee || 200 })
  }

  return {
    totalOwed,
    totalPaid,
    outstanding: totalOwed - totalPaid,
    unpaidEvents
  }
}

export async function hasOutstandingBalance(userId: string): Promise<boolean> {
  const balance = await getUserBalance(userId)
  return balance.outstanding > 0
}
