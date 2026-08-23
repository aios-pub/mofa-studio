/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Application title */
  readonly VITE_APP_TITLE: string;
  /** Application version */
  readonly VITE_APP_VERSION: string;
  /** Default route */
  readonly VITE_APP_DEFAULT_ROUTE?: string;
  /** Static assets public path */
  readonly VITE_APP_PUBLIC_PATH?: string;
  /** API base URL */
  readonly VITE_APP_API_BASE_URL: string;
  /** API request timeout (ms) */
  readonly VITE_APP_API_TIMEOUT?: string;
  /** Routing mode */
  readonly VITE_APP_ROUTER_MODE?: 'frontend' | 'backend';
  /** Floating ball mode: floating | window */
  readonly VITE_APP_FLOATING_MODE?: 'floating' | 'window';
  /** Whether to enable analytics */
  readonly VITE_APP_ENABLE_ANALYTICS?: string;
  /** Whether to enable debug */
  readonly VITE_APP_ENABLE_DEBUG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
