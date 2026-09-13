import { prisma } from '@/lib/db'
import { cookies } from 'next/headers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusPill } from '@/components/StatusPill'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { redirect } from 'next/navigation'

async function getUser() {
  const token = cookies().get('session')?.value
  if (!token) return null
  const session = await prisma.session.findUnique({ where: { token }, include: { user: true } })
  return session?.user || null
}

export default async function TasksPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const tasks = await prisma.task.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      assignee: { select: { fullName: true } },
      creator: { select: { fullName: true } }
    }
  })

  async function createTask(formData: FormData) {
    'use server'
    const token = cookies().get('session')?.value
    const session = await prisma.session.findUnique({ where: { token }, include: { user: true } })
    if (!session) redirect('/login')

    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const assigneeId = formData.get('assigneeId') as string
    const dueDate = formData.get('dueDate') as string

    if (!title) redirect('/tasks?error=missing')

    await prisma.task.create({
      data: {
        title,
        description: description || '',
        assigneeId: assigneeId || null,
        creatorId: session.user.id,
        dueDate: dueDate ? new Date(dueDate) : null,
        status: 'TODO'
      }
    })

    redirect('/tasks')
  }

  async function updateTaskStatus(formData: FormData) {
    'use server'
    const taskId = formData.get('taskId') as string
    const status = formData.get('status') as string

    await prisma.task.update({
      where: { id: taskId },
      data: { status: status as any }
    })

    if (status === 'DONE') {
      const task = await prisma.task.findUnique({ where: { id: taskId } })
      if (task?.assigneeId) {
        await prisma.activityLedger.create({
          data: {
            userId: task.assigneeId,
            points: 5,
            reason: `Task completed: ${task.title}`
          }
        })
      }
    }

    redirect('/tasks')
  }

  const members = await prisma.user.findMany({ where: { status: 'ACTIVE' }, select: { id: true, fullName: true } })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tasks</h1>

      <Card>
        <CardHeader><CardTitle>Create Task</CardTitle></CardHeader>
        <CardContent>
          <form action={createTask} className="space-y-3">
            <Input name="title" placeholder="Title" required />
            <textarea name="description" placeholder="Description" className="w-full border rounded p-2 text-sm"></textarea>
            <div className="grid grid-cols-2 gap-2">
              <select name="assigneeId" className="border rounded h-10 px-3 text-sm">
                <option value="">Unassigned</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.fullName}</option>)}
              </select>
              <Input name="dueDate" type="date" />
            </div>
            <Button type="submit" className="bg-teal-600">Create Task</Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {tasks.map(t => (
          <Card key={t.id}>
            <CardContent className="p-4 flex justify-between">
              <div>
                <div className="font-medium">{t.title}</div>
                <div className="text-xs text-slate-500">{t.description} • Assignee: {t.assignee?.fullName || 'None'} • Creator: {t.creator.fullName}</div>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill status={t.status} />
                <form action={updateTaskStatus} className="flex gap-1">
                  <input type="hidden" name="taskId" value={t.id} />
                  <select name="status" defaultValue={t.status} className="border rounded px-2 py-1 text-xs">
                    <option value="TODO">TODO</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="DONE">DONE</option>
                  </select>
                  <Button type="submit" size="sm" variant="outline">Update</Button>
                </form>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
