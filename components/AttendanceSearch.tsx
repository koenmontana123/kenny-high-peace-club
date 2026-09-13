'use client'
import { useState } from 'react'
import { Input } from './ui/input'

export function AttendanceSearch({ members, onSelect }: { members: any[], onSelect: (id: string) => void }) {
  const [q, setQ] = useState('')
  const filtered = members.filter(m => m.fullName.toLowerCase().includes(q.toLowerCase()) || m.memberId.toLowerCase().includes(q.toLowerCase()))
  return (
    <div>
      <Input placeholder="Search member ID or name" value={q} onChange={e => setQ(e.target.value)} />
      <div className="mt-2 space-y-1 max-h-40 overflow-auto">
        {filtered.slice(0, 5).map(m => (
          <button key={m.id} onClick={() => onSelect(m.id)} className="w-full text-left p-2 hover:bg-slate-100 rounded text-sm">
            {m.memberId} - {m.fullName}
          </button>
        ))}
      </div>
    </div>
  )
}
