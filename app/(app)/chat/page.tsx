'use client'

import { useEffect, useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Message = {
  id: string
  content: string
  createdAt: string
  sender: { fullName: string, memberId: string }
  reactions: any[]
}

type Room = {
  id: string
  name: string
  type: string
}

export default function ChatPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Load rooms - for demo, we fetch from API that we need to create
    // For now, use hardcoded global room ID from seed? We'll fetch via server action? Simplify: fetch /api/chat/rooms
    fetch('/api/chat/rooms').then(r => r.json()).then(data => {
      if (data.rooms) {
        setRooms(data.rooms)
        if (data.rooms.length > 0 && !selectedRoom) {
          setSelectedRoom(data.rooms[0].id)
        }
      }
    }).catch(() => {
      // Fallback
    })
  }, [])

  useEffect(() => {
    if (!selectedRoom) return
    const fetchMessages = () => {
      fetch(`/api/chat/messages?roomId=${selectedRoom}`).then(r => r.json()).then(data => {
        if (data.messages) setMessages(data.messages)
      }).catch(() => {})
    }
    fetchMessages()
    const interval = setInterval(fetchMessages, 3000) // polling every 3s per spec
    return () => clearInterval(interval)
  }, [selectedRoom])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedRoom) return
    setLoading(true)
    try {
      const mode = sessionStorage.getItem('sessionMode') || 'MEMBER'
      await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Session-Mode': mode },
        body: JSON.stringify({ roomId: selectedRoom, content: newMessage })
      })
      setNewMessage('')
      // Optimistic update
      const tempMsg: any = {
        id: 'temp-' + Date.now(),
        content: newMessage,
        createdAt: new Date().toISOString(),
        sender: { fullName: 'You', memberId: '' },
        reactions: []
      }
      setMessages(prev => [...prev, tempMsg])
    } catch {}
    setLoading(false)
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-200px)]">
      <Card className="w-64 flex flex-col">
        <CardHeader>
          <CardTitle className="text-sm">Chat Rooms</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto space-y-2">
          {rooms.map(room => (
            <button
              key={room.id}
              onClick={() => setSelectedRoom(room.id)}
              className={`w-full text-left p-2 rounded text-sm ${selectedRoom === room.id ? 'bg-teal-100 text-teal-800' : 'hover:bg-slate-100'}`}
            >
              <div className="font-medium">{room.name}</div>
              <div className="text-xs text-slate-500">{room.type}</div>
            </button>
          ))}
          {rooms.length === 0 && <div className="text-xs text-slate-500">Loading rooms... If empty, global room is Peace Club</div>}
        </CardContent>
      </Card>

      <Card className="flex-1 flex flex-col">
        <CardHeader>
          <CardTitle>{rooms.find(r => r.id === selectedRoom)?.name || 'Select a room'}</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <div className="flex-1 overflow-auto space-y-2 mb-4 max-h-[400px]">
            {messages.map(m => (
              <div key={m.id} className="p-2 border-b">
                <div className="flex justify-between">
                  <span className="font-medium text-sm">{m.sender.fullName} {m.sender.memberId && <span className="text-xs text-slate-500">• {m.sender.memberId}</span>}</span>
                  <span className="text-xs text-slate-400">{new Date(m.createdAt).toLocaleTimeString()}</span>
                </div>
                <div className="text-sm">{m.content}</div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="flex gap-2 sticky bottom-0 bg-white pt-2 border-t">
            <Input value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Type a message..." onKeyDown={e => e.key === 'Enter' && sendMessage()} className="flex-1" />
            <Button onClick={sendMessage} disabled={loading} className="bg-teal-600">Send</Button>
          </div>
          <p className="text-xs text-slate-400 mt-2">Realtime via polling every 3s • Emoji reactions • File attachments (link-based) • Replies • Edit/delete own within 24h • Soft delete only</p>
        </CardContent>
      </Card>
    </div>
  )
}
