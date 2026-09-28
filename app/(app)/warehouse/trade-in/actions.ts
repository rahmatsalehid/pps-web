"use server";

import { cookies } from "next/headers";
import { AUTH_TOKEN_COOKIE, AUTH_USER_COOKIE } from "@/services/auth-service";
import { ApiRequestError } from "@/services/api";
import {
  createTradeIn,
  deleteTradeIn,
  fetchTradeInList,
  fetchTradeInNextNo,
  fetchTradeInRejectTypes,
  fetchTradeInSalesPersons,
  type FetchTradeInListParams,
  type TradeInCreateInput,
} from "@/services/trade-in-service";
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

function readUsername(raw: string | undefined): string {
  if (!raw) return "system";
  try {
    const parsed = JSON.parse(raw) as { username?: unknown };
    const username =
      typeof parsed.username === "string" ? parsed.username.trim() : "";
    return username ? username.slice(0, 10) : "system";
  } catch {
    return "system";
  }
}

export async function getTradeInListAction(params: FetchTradeInListParams = {}) {
  try {
    const token = await getToken();
    return { ok: true as const, ...(await fetchTradeInList(token, params)) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getTradeInFormMetaAction() {
  try {
    const token = await getToken();
    const [salesPersons, rejectTypes, nextNo] = await Promise.all([
      fetchTradeInSalesPersons(token),
      fetchTradeInRejectTypes(token),
      fetchTradeInNextNo(token),
    ]);
    return { ok: true as const, salesPersons, rejectTypes, nextNo };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function createTradeInAction(
  input: Omit<TradeInCreateInput, "createBy">,
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
    const createBy = readUsername(cookieStore.get(AUTH_USER_COOKIE)?.value);
    const noPenerimaan = await createTradeIn(token, { ...input, createBy });
    return { ok: true as const, noPenerimaan };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function deleteTradeInAction(noPenerimaan: string) {
  try {
    const token = await getToken();
    await deleteTradeIn(token, noPenerimaan);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

/**
 * Cetak label reject: kunci cetak → ambil PDF → tandai tercetak → lepas kunci.
 */
export async function printTradeInRejectLabelAction(noReject: string) {
  let locked = false;
  try {
    const token = await getToken();
    await acquireLabelPrintLock(token, noReject);
    locked = true;
    const pdfBase64 = await fetchOutputLabelPdfBase64(token, "reject", noReject);
    await markLabelPrinted(token, "reject", noReject);
    await releaseLabelPrintLock(token, noReject);
    locked = false;
    return { ok: true as const, pdfBase64 };
  } catch (e) {
    if (locked) {
      try {
        const token = await getToken();
        await releaseLabelPrintLock(token, noReject);
      } catch {
        /* best-effort */
      }
    }
    return { ok: false as const, error: errMsg(e) };
  }
}
