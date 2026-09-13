import { prisma } from './db'

export async function handoverTasks(fromUserId: string, toUserId: string, reason: string) {
  // Transfer pending approvals, open tasks, unmarked attendance rosters, unapproved events, moderated chat groups

  // Tasks assigned to fromUser that are not DONE -> reassign to toUser
  const tasks = await prisma.task.updateMany({
    where: {
      assigneeId: fromUserId,
      status: { not: 'DONE' }
    },
    data: {
      assigneeId: toUserId
    }
  })

  // Events proposed by fromUser that are PENDING_APPROVAL -> keep but note handover? Historical stays, but we could update proposedBy? Spec says historical stays, but open work transfers
  // For pending approvals where fromUser was approver, we don't transfer approver role - new role holder will approve
  // For chat groups where fromUser was moderator, transfer moderation to toUser
  await prisma.chatRoomMember.updateMany({
    where: {
      userId: fromUserId,
      isModerator: true
    },
    data: {
      isModerator: false
    }
  })

  // Find groups where fromUser was member and was moderator, add toUser as moderator if not already
  const moderatedRooms = await prisma.chatRoomMember.findMany({
    where: {
      userId: fromUserId,
      isModerator: true
    },
    include: { room: true }
  })

  // For each moderated room, ensure toUser is moderator
  for (const membership of moderatedRooms) {
    const existing = await prisma.chatRoomMember.findUnique({
      where: {
        roomId_userId: {
          roomId: membership.roomId,
          userId: toUserId
        }
      }
    })
    if (existing) {
      await prisma.chatRoomMember.update({
        where: { id: existing.id },
        data: { isModerator: true }
      })
    } else {
      await prisma.chatRoomMember.create({
        data: {
          roomId: membership.roomId,
          userId: toUserId,
          isModerator: true
        }
      })
    }
  }

  // Create handover audit
  await prisma.roleHandover.create({
    data: {
      fromUserId,
      toUserId,
      reason,
      details: JSON.stringify({
        tasksTransferred: tasks.count,
        moderatedRooms: moderatedRooms.length
      })
    }
  })

  return { tasks: tasks.count, rooms: moderatedRooms.length }
}
