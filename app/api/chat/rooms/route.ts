import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { cookies } from 'next/headers'

export async function GET() {
  const token = cookies().get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await prisma.session.findUnique({ where: { token } })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get rooms where user is member or GLOBAL
  const memberships = await prisma.chatRoomMember.findMany({
    where: { userId: session.userId },
    include: { room: true }
  })

  const globalRooms = await prisma.chatRoom.findMany({
    where: { type: 'GLOBAL' }
  })

  const allRooms = [
    ...globalRooms,
    ...memberships.map(m => m.room)
  ]

  // Deduplicate
  const unique = Array.from(new Map(allRooms.map(r => [r.id, r])).values())

  return NextResponse.json({ rooms: unique })
}
