'use client'

import { useState } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Copy, Printer, Eye, EyeOff } from 'lucide-react'

export function CredentialModal({ 
  memberName, 
  memberId, 
  email, 
  tempPassword, 
  onClose 
}: { 
  memberName: string, 
  memberId: string, 
  email: string, 
  tempPassword: string, 
  onClose: () => void 
}) {
  const [showPassword, setShowPassword] = useState(true)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const text = `Kenny High Peace Club - Login Credentials\nName: ${memberName}\nMember ID: ${memberId}\nEmail: ${email}\nTemp Password: ${tempPassword}\nLogin: /login\nYou must change password on first login.`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`
      <html>
        <head><title>Credentials - ${memberName}</title>
        <style>body{font-family:system-ui;padding:40px;max-width:600px;margin:0 auto} .card{border:2px solid #0d9488;padding:24px;border-radius:12px} h1{color:#0d9488} .field{margin:12px 0} .label{font-weight:600;color:#64748b;font-size:12px;text-transform:uppercase} .value{font-size:18px;font-weight:600} .warning{background:#fef3c7;padding:12px;border-radius:8px;margin-top:16px;font-size:14px}</style>
        </head>
        <body>
          <div class="card">
            <h1>☮ Kenny High Peace Club</h1>
            <p><em>Talk it out. Walk it out. Live it out.</em></p>
            <div class="field"><div class="label">Name</div><div class="value">${memberName}</div></div>
            <div class="field"><div class="label">Member ID</div><div class="value">${memberId}</div></div>
            <div class="field"><div class="label">Email</div><div class="value">${email}</div></div>
            <div class="field"><div class="label">Temporary Password</div><div class="value" style="font-family:monospace;background:#f1f5f9;padding:8px;border-radius:4px">${tempPassword}</div></div>
            <div class="field"><div class="label">Login URL</div><div class="value">/login</div></div>
            <div class="warning">⚠️ This password is shown once. You must change it on first login (min 8 chars, 1 number). Keep this slip safe.</div>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-teal-700">
            ☮ Credentials Generated
          </CardTitle>
          <p className="text-sm text-slate-500">One-time display. Copy or print now.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-slate-50 rounded-lg p-4 space-y-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">Member</div>
              <div className="font-semibold">{memberName} ({memberId})</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">Email</div>
              <div className="font-mono text-sm">{email}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500 flex items-center justify-between">
                Temp Password
                <button onClick={() => setShowPassword(!showPassword)} className="text-teal-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="font-mono text-lg font-bold bg-white p-2 rounded border mt-1">
                {showPassword ? tempPassword : '••••••••••••'}
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            ⚠️ This password is shown <strong>once</strong> and never stored in plain text. Member must change it on first login.
          </div>

          <div className="flex gap-2">
            <Button onClick={handleCopy} variant="outline" className="flex-1">
              <Copy className="w-4 h-4 mr-2" />
              {copied ? 'Copied!' : 'Copy'}
            </Button>
            <Button onClick={handlePrint} variant="outline" className="flex-1">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button onClick={onClose} className="flex-1">
              Done
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
