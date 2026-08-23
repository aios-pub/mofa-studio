/**
 * Local-first session handling.
 *
 * Inside the Tauri shell the embedded backend trusts the loopback origin
 * and `POST /api/auth/login` always succeeds with the on-device user, so a
 * session can be established silently. Uses raw fetch (not apiClient) so
 * the 401 interceptor can call back into this module without an import
 * cycle.
 */

import { GLOBAL_CONFIG, isLocalMode } from "@/config";
import useUserStore from "@/stores/useUserStore";
import type { UserInfo, UserToken } from "@/types/user";

/** Raw login payload returned by the embedded backend (snake_case). */
interface LocalLoginResponse {
  access_token: string;
  refresh_token: string;
  user: {
    avatar: string | null;
    email: string;
    email_verified: boolean;
    username: string;
  };
}

/** Guard so concurrent callers share one in-flight login request. */
let pendingLogin: Promise<void> | null = null;

/**
 * Establish a local session if none exists: mint a token pair and persist
 * user + token in the user store, exactly like an interactive login would.
 * No-op outside local mode or when a token is already present.
 */
export async function ensureLocalSession(): Promise<void> {
  if (!isLocalMode()) {
    return;
  }

  const { userToken } = useUserStore.getState();
  if (userToken.accessToken) {
    return;
  }

  pendingLogin ??= silentLogin().finally(() => {
    pendingLogin = null;
  });
  await pendingLogin;
}

/** Re-login after an unexpected 401 (e.g. rotated JWT secret). */
export async function silentRelogin(): Promise<void> {
  if (!isLocalMode()) {
    return;
  }
  await silentLogin();
}

async function silentLogin(): Promise<void> {
  const base = GLOBAL_CONFIG.serverURL;
  if (!base) {
    return;
  }

  try {
    const response = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Credentials are ignored by the local backend; kept for shape parity
      body: JSON.stringify({ username: "local", password: "local" }),
    });
    if (!response.ok) {
      throw new Error(`Local login failed: ${response.status}`);
    }

    const envelope = (await response.json()) as {
      code: number;
      data: LocalLoginResponse;
    };
    if (envelope.code !== 0 && envelope.code !== 200) {
      throw new Error("Local login rejected by embedded server");
    }

    const { setUserToken, setUserInfo } = useUserStore.getState().actions;
    const token: UserToken = {
      accessToken: envelope.data.access_token,
      refreshToken: envelope.data.refresh_token,
    };
    const userInfo: UserInfo = {
      username: envelope.data.user.username,
      email: envelope.data.user.email,
      avatar: envelope.data.user.avatar,
      emailVerified: envelope.data.user.email_verified,
    };
    setUserToken(token);
    setUserInfo(userInfo);
  } catch (error) {
    // Local mode must never dead-end on a login screen; the route guard
    // bypasses auth when the embedded server is active
    console.warn("[localAuth] Silent local login failed:", error);
  }
}
