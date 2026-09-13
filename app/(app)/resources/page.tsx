import { prisma } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function ResourcesPage() {
  const resources = await prisma.resource.findMany({
    orderBy: { createdAt: 'desc' },
    include: { uploader: { select: { fullName: true } } }
  })

  async function createResource(formData: FormData) {
    'use server'
    const token = cookies().get('session')?.value
    const session = await prisma.session.findUnique({ where: { token }, include: { user: true } })
    if (!session) redirect('/login')

    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const category = formData.get('category') as string
    const url = formData.get('url') as string

    if (!title || !url) redirect('/resources?error=missing')

    await prisma.resource.create({
      data: { title, description: description || '', category: category as any, url, uploaderId: session.user.id }
    })

    await prisma.activityLedger.create({
      data: { userId: session.user.id, points: 10, reason: `Resource uploaded: ${title}` }
    })

    redirect('/resources')
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Resources</h1>

      <Card>
        <CardHeader><CardTitle>Upload Resource</CardTitle></CardHeader>
        <CardContent>
          <form action={createResource} className="space-y-3">
            <Input name="title" placeholder="Title" required />
            <Input name="description" placeholder="Description" />
            <div className="grid grid-cols-2 gap-2">
              <select name="category" className="border rounded h-10 px-3 text-sm">
                <option value="GUIDE">GUIDE</option>
                <option value="VIDEO">VIDEO</option>
                <option value="TEMPLATE">TEMPLATE</option>
                <option value="DOCUMENT">DOCUMENT</option>
              </select>
              <Input name="url" placeholder="URL" required />
            </div>
            <Button type="submit" className="bg-teal-600">Upload (10 points)</Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {resources.map(r => (
          <Card key={r.id}>
            <CardContent className="p-4">
              <div className="font-medium">{r.title} • {r.category}</div>
              <div className="text-sm text-slate-500">{r.description} • By {r.uploader.fullName}</div>
              <a href={r.url} target="_blank" className="text-teal-600 text-sm hover:underline">{r.url}</a>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
