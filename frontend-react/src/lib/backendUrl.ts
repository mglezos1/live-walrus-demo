/**
 * Express API base URL. In production set VITE_API_URL at build time (e.g. Vercel Environment Variables).
 * No trailing slash.
 */
export function getBackendUrl(): string {
  const raw = import.meta.env.VITE_API_URL as string | undefined
  if (raw && raw.trim() !== '') {
    return raw.replace(/\/$/, '')
  }
  return 'http://localhost:3000'
}
