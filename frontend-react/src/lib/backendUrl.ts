/**
 * API base URL (Express). Optional VITE_API_URL at build time for split hosts (e.g. Vercel UI + Render API).
 * Same-origin production (e.g. UI and API on Render): uses window.location.origin when VITE_API_URL is unset.
 */
export function getBackendUrl(): string {
  const raw = import.meta.env.VITE_API_URL as string | undefined
  if (raw && raw.trim() !== '') {
    return raw.replace(/\/$/, '')
  }
  if (import.meta.env.PROD && typeof window !== 'undefined') {
    return window.location.origin
  }
  return 'http://localhost:3000'
}
