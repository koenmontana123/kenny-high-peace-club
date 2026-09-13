'use client'

import { getSessionMode } from './mode-client'

export function fetchWithMode(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const mode = getSessionMode()
  const headers = new Headers(init?.headers)
  headers.set('X-Session-Mode', mode)

  return fetch(input, {
    ...init,
    headers
  })
}

export async function fetchWithModeJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetchWithMode(input, init)
  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status}`)
  }
  return res.json()
}
