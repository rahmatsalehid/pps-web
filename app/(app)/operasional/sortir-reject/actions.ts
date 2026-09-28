"use server";

import { cookies } from "next/headers";
import { AUTH_TOKEN_COOKIE } from "@/services/auth-service";
import { ApiRequestError } from "@/services/api";
import {
  acquireSrPrintLock,
  createSr,
  deleteSr,
  fetchSrDetail,
  fetchSrLabelInfo,
  fetchSrLabelPdfBase64,
  fetchSrList,
  fetchSrMasters,
  markSrLabelPrinted,
  releaseSrPrintLock,
  updateSr,
  type FetchSrListParams,
  type SrCreatePayload,
  type SrPrintTarget,
} from "@/services/sortir-reject-service";

async function getToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
}

function errMsg(e: unknown): string {
  if (e instanceof ApiRequestError) return e.message;
  if (e instanceof Error) return e.message.replace(/^Exception:\s*/, "");
  return "Terjadi kesalahan tak terduga";
}

export async function getSortirRejectListAction(params: FetchSrListParams = {}) {
  try {
    const token = await getToken();
    return { ok: true as const, ...(await fetchSrList(token, params)) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getSrLabelInfoAction(labelCode: string) {
  try {
    const token = await getToken();
    const info = await fetchSrLabelInfo(token, labelCode);
    return { ok: true as const, info };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getSrDetailAction(noSortir: string) {
  try {
    const token = await getToken();
    const detail = await fetchSrDetail(token, noSortir);
    return { ok: true as const, detail };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getSrMastersAction() {
  try {
    const token = await getToken();
    const masters = await fetchSrMasters(token);
    return { ok: true as const, masters };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function createSortirRejectAction(payload: SrCreatePayload) {
  try {
    const token = await getToken();
    const noSortir = await createSr(token, payload);
    return { ok: true as const, noSortir };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function updateSortirRejectAction(payload: {
  noSortir: string;
  idWarehouse: number;
  tglBJSortir: string;
}) {
  try {
    const token = await getToken();
    await updateSr(token, payload);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function deleteSortirRejectAction(noSortir: string) {
  try {
    const token = await getToken();
    await deleteSr(token, noSortir);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function printSrLabelAction(target: SrPrintTarget) {
  let locked = false;
  try {
    const token = await getToken();
    await acquireSrPrintLock(token, target.noLabel);
    locked = true;
    const pdfBase64 = await fetchSrLabelPdfBase64(token, target);
    await markSrLabelPrinted(token, target);
    await releaseSrPrintLock(token, target.noLabel);
    locked = false;
    return { ok: true as const, pdfBase64 };
  } catch (e) {
    if (locked) {
      const token = await getToken().catch(() => undefined);
      await releaseSrPrintLock(token, target.noLabel).catch(() => undefined);
    }
    return { ok: false as const, error: errMsg(e) };
  }
}
