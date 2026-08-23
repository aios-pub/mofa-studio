/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Application title */
  readonly VITE_APP_TITLE: string;
  /** Application version */
  readonly VITE_APP_VERSION: string;
  /** Server URL (also serves as API base URL) */
  readonly VITE_APP_SERVER_URL: string;
  /** API timeout */
  readonly VITE_APP_API_TIMEOUT: string;
  /** Whether to enable Mock data */
  readonly VITE_APP_ENABLE_MOCK: string;
  /** Floating ball mode */
  readonly VITE_APP_FLOATING_MODE: "floating" | "window";
  /** Whether to enable analytics */
  readonly VITE_APP_ENABLE_ANALYTICS: string;
  /** Whether to enable debug */
  readonly VITE_APP_ENABLE_DEBUG: string;
  /** Default route */
  readonly VITE_APP_DEFAULT_ROUTE: string;
  /** Static assets public path */
  readonly VITE_APP_PUBLIC_PATH: string;
  /** Routing mode */
  readonly VITE_APP_ROUTER_MODE: "frontend" | "backend";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
