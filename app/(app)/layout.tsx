import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  AUTH_TOKEN_COOKIE,
  AUTH_USER_COOKIE,
  fetchMyPermissions,
  type SessionUser,
} from "@/services/auth-service";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

function readSessionUser(raw: string | undefined): SessionUser {
  const fallback: SessionUser = { username: "", fullName: "Pengguna", uGroupName: null };
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw);
    return {
      username: typeof parsed.username === "string" ? parsed.username : "",
      fullName:
        typeof parsed.fullName === "string" && parsed.fullName
          ? parsed.fullName
          : fallback.fullName,
      uGroupName: typeof parsed.uGroupName === "string" ? parsed.uGroupName : null,
    };
  } catch {
    return fallback;
  }
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();

  if (!cookieStore.get(AUTH_TOKEN_COOKIE)) {
    redirect("/login");
  }

  const user = readSessionUser(cookieStore.get(AUTH_USER_COOKIE)?.value);

  // Permission untuk menyaring menu sidebar. null = gagal diambil → jangan
  // sembunyikan apa pun (fail-open agar menu tidak hilang saat backend error).
  let permissions: string[] | null = null;
  try {
    const me = await fetchMyPermissions(cookieStore.get(AUTH_TOKEN_COOKIE)?.value);
    permissions = me.data.permissions ?? [];
  } catch {
    permissions = null;
  }

  return (
    <DashboardShell user={user} permissions={permissions}>
      {children}
    </DashboardShell>
  );
}
