export function SuggestionDiscussion({ comments }: { comments: any[] }) {
  return (
    <div className="space-y-2">
      {comments.map(c => (
        <div key={c.id} className="p-2 border rounded text-sm">
          <div className="font-medium">{c.author?.fullName}</div>
          <div>{c.content}</div>
        </div>
      ))}
    </div>
  )
}
