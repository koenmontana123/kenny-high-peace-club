'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { CredentialModal } from './CredentialModal'

export function CredentialDisplay({ memberName, memberId, email }: { memberName: string, memberId: string, email: string }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tempPassword = searchParams.get('tempPassword')
  const show = searchParams.get('showCredentials')

  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (tempPassword && show) {
      setVisible(true)
    }
  }, [tempPassword, show])

  if (!visible || !tempPassword) return null

  return (
    <CredentialModal
      memberName={memberName}
      memberId={memberId}
      email={email}
      tempPassword={tempPassword}
      onClose={() => {
        setVisible(false)
        // Remove query params
        const params = new URLSearchParams(searchParams.toString())
        params.delete('tempPassword')
        params.delete('showCredentials')
        router.replace(`?${params.toString()}`)
      }}
    />
  )
}
