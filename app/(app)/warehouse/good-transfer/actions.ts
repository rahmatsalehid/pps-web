"use server";

import { cookies } from "next/headers";
import { AUTH_TOKEN_COOKIE } from "@/services/auth-service";
import { ApiRequestError } from "@/services/api";
import {
  fetchGoodTransferList,
  fetchGoodTransferOne,
  markGoodTransferKirim,
  scanGoodTransferLabel,
  undoGoodTransferScan,
  type FetchGoodTransferListParams,
} from "@/services/good-transfer-service";

async function getToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
}

function errMsg(e: unknown): string {
  if (e instanceof ApiRequestError) return e.message;
  if (e instanceof Error) return e.message.replace(/^Exception:\s*/, "");
  return "Terjadi kesalahan tak terduga";
}

export async function getGoodTransferListAction(
  params: FetchGoodTransferListParams = {},
) {
  try {
    const token = await getToken();
    return { ok: true as const, ...(await fetchGoodTransferList(token, params)) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getGoodTransferDetailAction(noTransfer: string) {
  try {
    const token = await getToken();
    return {
      ok: true as const,
      detail: await fetchGoodTransferOne(token, noTransfer),
    };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

/** Scan label; `confirmPartial` = setuju mencatat sebagian pcs label. */
export async function scanGoodTransferAction(
  noTransfer: string,
  noLabel: string,
  confirmPartial = false,
) {
  try {
    const token = await getToken();
    return {
      ok: true as const,
      outcome: await scanGoodTransferLabel(
        token,
        noTransfer,
        noLabel,
        confirmPartial,
      ),
    };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function undoGoodTransferScanAction(idScan: number) {
  try {
    const token = await getToken();
    await undoGoodTransferScan(token, idScan);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function kirimGoodTransferAction(noTransfer: string) {
  try {
    const token = await getToken();
    await markGoodTransferKirim(token, noTransfer);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}
