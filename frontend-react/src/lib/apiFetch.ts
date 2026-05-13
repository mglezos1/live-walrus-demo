/**
 * fetch() that adds x-invite-token when VITE_INVITE_TOKEN is set (must match backend INVITE_TOKEN).
 */
export function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = import.meta.env.VITE_INVITE_TOKEN as string | undefined
  const headers = new Headers(init?.headers ?? undefined)
  if (token && token.trim() !== '') {
    headers.set('x-invite-token', token.trim())
  }
  return fetch(input, { ...init, headers })
}
