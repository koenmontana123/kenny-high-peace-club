export function AmendmentDiff({ oldText, newText }: { oldText: string, newText: string }) {
  return (
    <div className="grid grid-cols-2 gap-2 text-sm">
      <div className="bg-red-50 p-2 rounded">- {oldText}</div>
      <div className="bg-green-50 p-2 rounded">+ {newText}</div>
    </div>
  )
}
