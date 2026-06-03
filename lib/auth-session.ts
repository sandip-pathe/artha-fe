"use client";

export type MerchantProfile = {
  id: number;
  phone: string;
  store_name: string;
  owner_name?: string | null;
  location?: string | null;
  email?: string | null;
};

export type AuthSession = {
  token: string;
  merchant: MerchantProfile;
};

export const AUTH_STORAGE_KEY = "artha_auth_session";

export function getStoredAuthSession(): AuthSession | null {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as AuthSession;
    if (parsed?.token && parsed?.merchant?.phone) {
      return parsed;
    }
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }
  return null;
}

export function storeAuthSession(session: AuthSession) {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredAuthSession() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

export async function syncBackendSession(accessToken: string): Promise<AuthSession> {
  const res = await fetch("/api/auth/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const payload = (await res.json()) as {
    merchant?: MerchantProfile;
    detail?: string;
  };
  if (!res.ok || !payload.merchant) {
    throw new Error(payload.detail || "backend_auth_sync_failed");
  }
  return {
    token: accessToken,
    merchant: payload.merchant,
  };
}
