'use client'

export function DebtBanner({ amount, outstandingCount }: { amount: number, outstandingCount: number }) {
  if (amount <= 0) return null
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
      <div className="text-red-600 text-xl">⚠️</div>
      <div className="flex-1">
        <h4 className="font-semibold text-red-800">Outstanding Balance: KES {amount}</h4>
        <p className="text-sm text-red-700 mt-1">
          You have {outstandingCount} unpaid event{outstandingCount > 1 ? 's' : ''}. Clear your balance to RSVP to new events, vote, or propose suggestions.
        </p>
        <p className="text-xs text-red-600 mt-2">Contact Treasurer to clear. Leaders are held to the same standard.</p>
      </div>
    </div>
  )
}
