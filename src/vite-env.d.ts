/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />
/// <reference types="vite-plugin-pwa/react" />

interface ImportMetaEnv {
  /** Set by the deploy workflow. Absent means the production channel. */
  readonly VITE_CHANNEL?: 'production' | 'beta';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
