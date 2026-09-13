import { cn } from '@/lib/utils'

const statusStyles: Record<string, string> = {
  PENDING_APPROVAL: 'bg-amber-100 text-amber-800 border-amber-200',
  DEADLOCKED: 'bg-red-100 text-red-800 border-red-200',
  APPROVED: 'bg-green-100 text-green-800 border-green-200',
  REJECTED: 'bg-red-100 text-red-800 border-red-200',
  COMPLETED: 'bg-slate-100 text-slate-800 border-slate-200',
  CANCELLED: 'bg-slate-100 text-slate-600 border-slate-200',
  SUGGESTED: 'bg-blue-100 text-blue-800 border-blue-200',
  IN_DISCUSSION: 'bg-purple-100 text-purple-800 border-purple-200',
  AMENDMENTS_PENDING: 'bg-orange-100 text-orange-800 border-orange-200',
  PENDING_PATRON_SIGNOFF: 'bg-amber-100 text-amber-800 border-amber-200',
  PENDING_TREASURER: 'bg-teal-100 text-teal-800 border-teal-200',
  WITHDRAWN: 'bg-slate-100 text-slate-500 border-slate-200',
  PAID: 'bg-green-100 text-green-800 border-green-200',
  UNPAID: 'bg-red-100 text-red-800 border-red-200',
  WAIVED: 'bg-slate-100 text-slate-700 border-slate-200',
  PRESENT: 'bg-green-100 text-green-800 border-green-200',
  ABSENT_APOLOGY: 'bg-amber-100 text-amber-800 border-amber-200',
  ABSENT_NO_APOLOGY: 'bg-red-100 text-red-800 border-red-200',
  ACTIVE: 'bg-green-100 text-green-800 border-green-200',
  PENDING_PAYMENT: 'bg-amber-100 text-amber-800 border-amber-200',
}

export function StatusPill({ status, className }: { status: string, className?: string }) {
  const style = statusStyles[status] || 'bg-slate-100 text-slate-700 border-slate-200'
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border', style, className)}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}
