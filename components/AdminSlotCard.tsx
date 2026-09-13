import { Card, CardContent } from './ui/card'
export function AdminSlotCard({ admin }: { admin: any }) {
  return <Card><CardContent className="p-3">{admin.realName}</CardContent></Card>
}
