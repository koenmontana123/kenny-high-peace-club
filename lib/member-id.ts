import { prisma } from './db'

export async function getNextMemberId(): Promise<string> {
  const year = new Date().getFullYear()
  // Find highest sequence for this year
  const users = await prisma.user.findMany({
    where: {
      memberId: {
        startsWith: `KHP-${year}-`
      }
    },
    select: { memberId: true },
    orderBy: { memberId: 'desc' },
    take: 1
  })

  let nextNum = 1
  if (users.length > 0) {
    const lastId = users[0].memberId
    const parts = lastId.split('-')
    const num = parseInt(parts[2], 10)
    if (!isNaN(num)) nextNum = num + 1
  } else {
    // Check any year to avoid collision? Just start at 1
    // But spec has KHP-2026-009 etc, so for demo we continue
    const allUsers = await prisma.user.findMany({
      select: { memberId: true },
      orderBy: { memberId: 'desc' },
      take: 1
    })
    if (allUsers.length > 0) {
      const match = allUsers[0].memberId.match(/KHP-(\d+)-(\d+)/)
      if (match) {
        const lastYear = parseInt(match[1])
        const lastNum = parseInt(match[2])
        if (lastYear === year) {
          nextNum = lastNum + 1
        } else if (lastYear < year) {
          nextNum = 1
        } else {
          nextNum = lastNum + 1
        }
      }
    }
  }

  return `KHP-${year}-${String(nextNum).padStart(3, '0')}`
}
