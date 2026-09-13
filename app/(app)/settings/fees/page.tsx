import { prisma } from '@/lib/db'
import { cookies } from 'next/headers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { redirect } from 'next/navigation'

export default async function FeesPage() {
  const token = cookies().get('session')?.value
  const session = await prisma.session.findUnique({ where: { token }, include: { user: true } })
  if (!session) redirect('/login')

  const settings = await prisma.clubSettings.findUnique({ where: { id: 'default' } })
  const feeChanges = await prisma.feeChange.findMany({ orderBy: { createdAt: 'desc' }, include: { requestedBy: { select: { fullName: true } } } })

  async function requestFeeChange(formData: FormData) {
    'use server'
    const token = cookies().get('session')?.value
    const session = await prisma.session.findUnique({ where: { token }, include: { user: true } })
    if (!session) redirect('/login')

    const newFee = parseInt(formData.get('newFee') as string, 10)
    if (!newFee || newFee <= 0) redirect('/settings/fees?error=invalid')

    const settings = await prisma.clubSettings.findUnique({ where: { id: 'default' } })

    await prisma.feeChange.create({
      data: {
        oldFee: settings?.registrationFee || 200,
        newFee,
        requestedById: session.user.id,
        status: 'PENDING_APPROVAL'
      }
    })

    await prisma.auditLog.create({
      data: {
        actionType: 'FEE_CHANGE_REQUESTED',
        actorId: session.user.id,
        details: JSON.stringify({ oldFee: settings?.registrationFee, newFee })
      }
    })

    redirect('/settings/fees')
  }

  async function approveFeeChange(formData: FormData) {
    'use server'
    const token = cookies().get('session')?.value
    const session = await prisma.session.findUnique({ where: { token }, include: { user: true } })
    if (!session) redirect('/login')

    const id = formData.get('id') as string
    const decision = formData.get('decision') as string

    const fc = await prisma.feeChange.findUnique({ where: { id } })
    if (!fc) redirect('/settings/fees')

    if (session.user.publicRole === 'CHAIRPERSON') {
      await prisma.feeChange.update({ where: { id }, data: { chairApproved: decision === 'APPROVED', chairApproverId: session.user.id } })
    } else if (session.user.publicRole === 'CEO') {
      await prisma.feeChange.update({ where: { id }, data: { ceoApproved: decision === 'APPROVED', ceoApproverId: session.user.id } })
    }

    const updated = await prisma.feeChange.findUnique({ where: { id } })
    if (updated?.chairApproved && updated?.ceoApproved) {
      await prisma.clubSettings.update({ where: { id: 'default' }, data: { registrationFee: updated.newFee } })
      await prisma.feeChange.update({ where: { id }, data: { status: 'APPROVED', approvedAt: new Date() } })
      await prisma.auditLog.create({
        data: {
          actionType: 'FEE_CHANGE_APPROVED',
          actorId: session.user.id,
          details: JSON.stringify({ oldFee: updated.oldFee, newFee: updated.newFee })
        }
      })
    } else if (decision === 'REJECTED') {
      await prisma.feeChange.update({ where: { id }, data: { status: 'REJECTED', rejectionReason: 'Rejected by ' + session.user.publicRole } })
    }

    redirect('/settings/fees')
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">Fee Management</h1>
      <p className="text-slate-500">Current registration fee: KES {settings?.registrationFee}. Treasurer can change, requires dual approval Chair + CEO. Every change creates audit row.</p>

      <Card>
        <CardHeader><CardTitle>Request Fee Change (Treasurer)</CardTitle></CardHeader>
        <CardContent>
          <form action={requestFeeChange} className="flex gap-2">
            <Input name="newFee" type="number" placeholder="New fee (KES)" required />
            <Button type="submit" className="bg-teal-600">Request Change</Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {feeChanges.map(fc => (
          <Card key={fc.id}>
            <CardContent className="p-4 flex justify-between">
              <div>
                <div className="font-medium">KES {fc.oldFee} → KES {fc.newFee} • {fc.status}</div>
                <div className="text-xs text-slate-500">Requested by {fc.requestedBy.fullName} • Chair: {fc.chairApproved ? '✅' : '⏳'} CEO: {fc.ceoApproved ? '✅' : '⏳'}</div>
              </div>
              <div className="flex gap-1">
                <form action={approveFeeChange}>
                  <input type="hidden" name="id" value={fc.id} />
                  <Button type="submit" name="decision" value="APPROVED" size="sm" className="bg-green-600">Approve</Button>
                </form>
                <form action={approveFeeChange}>
                  <input type="hidden" name="id" value={fc.id} />
                  <Button type="submit" name="decision" value="REJECTED" size="sm" variant="destructive">Reject</Button>
                </form>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
