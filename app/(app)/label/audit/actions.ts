"use server";

import { cookies } from "next/headers";
import { ApiRequestError } from "@/services/api";
import { AUTH_TOKEN_COOKIE } from "@/services/auth-service";
import { fetchAuditHistory, type AuditHistory } from "@/services/audit-service";

async function getToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
}

function errMsg(e: unknown): string {
  if (e instanceof ApiRequestError || e instanceof Error) return e.message;
  return "Terjadi kesalahan";
}

export async function getAuditHistoryAction(
  documentNo: string,
): Promise<{ ok: true; history: AuditHistory } | { ok: false; error: string }> {
  try {
    const token = await getToken();
    const history = await fetchAuditHistory(token, documentNo);
    return { ok: true, history };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}
