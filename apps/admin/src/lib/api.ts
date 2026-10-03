const apiBaseUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export type AdminSession = {
  user: {
    id: string;
    email?: string | null;
    phone?: string | null;
  };
  roles: Array<{ id: string; name: string }>;
  admin: boolean;
};

export async function getAdminSession(accessToken: string): Promise<AdminSession> {
  const response = await fetch(`${apiBaseUrl}/api/v1/auth/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  const payload = (await response.json()) as {
    success?: boolean;
    data?: AdminSession;
    error?: { message?: string };
  };

  if (!response.ok || !payload.success || !payload.data?.admin) {
    throw new Error(payload.error?.message ?? "Admin authorization denied.");
  }

  return payload.data;
}
