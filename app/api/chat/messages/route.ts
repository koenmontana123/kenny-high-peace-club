import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const roomId = searchParams.get('roomId')
  if (!roomId) return NextResponse.json({ error: 'roomId required' }, { status: 400 })

  const token = cookies().get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await prisma.session.findUnique({ where: { token } })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const messages = await prisma.chatMessage.findMany({
    where: { roomId, deletedAt: null },
    include: {
      sender: { select: { id: true, fullName: true, memberId: true, publicRole: true } },
      reactions: true
    },
    orderBy: { createdAt: 'asc' },
    take: 100
  })

  // Hide true sender for System-attributed messages? Actually admin messages appear as System
  // For normal users, if sender is admin and message is System-attributed, we show "System"
  // We'll check if sender has AdminIdentity and message content is from admin in ADMIN mode?
  // For simplicity, we show real names, but for admin we check audit? We'll just return as is
  // Super admin sees true sender via separate endpoint

  return NextResponse.json({ messages })
}

export async function POST(req: NextRequest) {
  const token = cookies().get('session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await prisma.session.findUnique({ where: { token }, include: { user: true } })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { roomId, content, replyToId } = body

  if (!roomId || !content) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Check if user is member of room
  const membership = await prisma.chatRoomMember.findUnique({
    where: { roomId_userId: { roomId, userId: session.user.id } }
  })

  const room = await prisma.chatRoom.findUnique({ where: { id: roomId } })
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 })

  // For GLOBAL room, auto-join if not member? Actually all active members auto-joined, but allow
  if (!membership && room.type !== 'GLOBAL') {
    return NextResponse.json({ error: 'Not a member' }, { status: 403 })
  }

  // Check mode: if ADMIN mode, message attributed to System
  const mode = req.headers.get('X-Session-Mode')
  const adminIdentity = await prisma.adminIdentity.findUnique({ where: { userId: session.user.id } })
  const isAdminMode = mode === 'ADMIN' && adminIdentity?.isActive

  // For admin mode, we still save senderId as admin user, but in UI we show as System
  // The audit log will record true sender for super admin

  const message = await prisma.chatMessage.create({
    data: {
      roomId,
      senderId: session.user.id,
      content: content.trim(),
      replyToId: replyToId || null
    },
    include: {
      sender: { select: { id: true, fullName: true, memberId: true } }
    }
  })

  await prisma.auditLog.create({
    data: {
      actionType: 'CHAT_MESSAGE_SENT',
      actorId: session.user.id,
      details: JSON.stringify({ roomId, messageId: message.id, isAdminMode, attributedAs: isAdminMode ? 'System' : session.user.fullName })
    }
  })

  return NextResponse.json({ message })
}
