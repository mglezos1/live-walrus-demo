/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_INVITE_TOKEN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
