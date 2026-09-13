export function ChatMessage({ message }: { message: any }) {
  return <div className="p-2 border-b"><div className="font-medium">{message.sender?.fullName}</div><div>{message.content}</div></div>
}
