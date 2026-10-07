"use server";

import { cookies } from "next/headers";
import { AUTH_TOKEN_COOKIE } from "@/services/auth-service";
import { ApiRequestError } from "@/services/api";
import { fetchLaporan, fetchWarehouseOptions } from "@/services/laporan-service";
import { LAPORAN_REGISTRY } from "@/components/laporan/laporan-catalog";

async function getToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
}

function errMsg(e: unknown): string {
  if (e instanceof ApiRequestError) return e.message;
  if (e instanceof Error) return e.message.replace(/^Exception:\s*/, "");
  return "Terjadi kesalahan tak terduga";
}

export async function getWarehouseOptionsAction() {
  try {
    const token = await getToken();
    return { ok: true as const, options: await fetchWarehouseOptions(token) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function runLaporanAction(
  kode: string,
  params: Record<string, string>,
) {
  try {
    const spec = LAPORAN_REGISTRY[kode];
    if (!spec) {
      return { ok: false as const, error: "Laporan tidak dikenal" };
    }
    const token = await getToken();
    const data = await fetchLaporan(token, spec.endpoint, params);
    return { ok: true as const, data };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}
