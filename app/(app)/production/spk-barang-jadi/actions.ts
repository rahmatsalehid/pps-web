"use server";

import { cookies } from "next/headers";
import { AUTH_TOKEN_COOKIE } from "@/services/auth-service";
import { ApiRequestError } from "@/services/api";
import {
  createSpk,
  fetchSpkDetail,
  fetchSpkHistory,
  fetchSpkMonitoring,
  type SpkCreatePayload,
  type SpkMonitoringParams,
} from "@/services/spk-barang-jadi-service";

async function getToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
}

function errMsg(e: unknown): string {
  if (e instanceof ApiRequestError) return e.message;
  if (e instanceof Error) return e.message.replace(/^Exception:\s*/, "");
  return "Terjadi kesalahan tak terduga";
}

export async function getSpkMonitoringAction(params: SpkMonitoringParams = {}) {
  try {
    const token = await getToken();
    const result = await fetchSpkMonitoring(token, params);
    return { ok: true as const, ...result };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function createSpkAction(payload: SpkCreatePayload) {
  try {
    const token = await getToken();
    const detail = await createSpk(token, payload);
    return { ok: true as const, detail };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getSpkDetailAction(noSpk: string) {
  try {
    const token = await getToken();
    const detail = await fetchSpkDetail(token, noSpk);
    return { ok: true as const, detail };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getSpkHistoryAction(idBJ: number) {
  try {
    const token = await getToken();
    const result = await fetchSpkHistory(token, idBJ);
    return { ok: true as const, ...result };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}
