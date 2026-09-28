"use server";

import { cookies } from "next/headers";
import { AUTH_TOKEN_COOKIE } from "@/services/auth-service";
import { ApiRequestError } from "@/services/api";
import {
  fetchPenjualanDetail,
  fetchPenjualanList,
  scanPenjualanLabel,
  type FetchPenjualanListParams,
} from "@/services/penjualan-service";
import {
  acquireLabelPrintLock,
  fetchOutputLabelPdfBase64,
  markLabelPrinted,
  releaseLabelPrintLock,
} from "@/services/inject-service";

async function getToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
}

function errMsg(e: unknown): string {
  if (e instanceof ApiRequestError) return e.message;
  if (e instanceof Error) return e.message.replace(/^Exception:\s*/, "");
  return "Terjadi kesalahan tak terduga";
}

export async function getPenjualanListAction(
  params: FetchPenjualanListParams = {},
) {
  try {
    const token = await getToken();
    return { ok: true as const, ...(await fetchPenjualanList(token, params)) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getPenjualanDetailAction(noBJJual: string) {
  try {
    const token = await getToken();
    return {
      ok: true as const,
      detail: await fetchPenjualanDetail(token, noBJJual),
    };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

/** Scan label; `confirmPartial` = setuju memecah label sesuai sisa kebutuhan. */
export async function scanPenjualanAction(
  noBJJual: string,
  noLabel: string,
  confirmPartial = false,
) {
  try {
    const token = await getToken();
    return {
      ok: true as const,
      outcome: await scanPenjualanLabel(token, noBJJual, noLabel, confirmPartial),
    };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

/**
 * Cetak ulang label induk yang dipecah (pcs pada label fisik berkurang):
 * kunci cetak → ambil PDF → tandai tercetak → lepas kunci.
 */
export async function printPenjualanParentLabelAction(
  kodeKategori: string,
  noLabel: string,
) {
  const category = kodeKategori === "furniturewip" ? "fwip" : "bj";
  let locked = false;
  try {
    const token = await getToken();
    await acquireLabelPrintLock(token, noLabel);
    locked = true;
    const pdfBase64 = await fetchOutputLabelPdfBase64(token, category, noLabel);
    await markLabelPrinted(token, category, noLabel);
    await releaseLabelPrintLock(token, noLabel);
    locked = false;
    return { ok: true as const, pdfBase64 };
  } catch (e) {
    if (locked) {
      try {
        const token = await getToken();
        await releaseLabelPrintLock(token, noLabel);
      } catch {
        /* best-effort */
      }
    }
    return { ok: false as const, error: errMsg(e) };
  }
}
