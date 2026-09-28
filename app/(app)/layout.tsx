import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  AUTH_TOKEN_COOKIE,
  AUTH_USER_COOKIE,
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

  return <DashboardShell user={user}>{children}</DashboardShell>;
}
