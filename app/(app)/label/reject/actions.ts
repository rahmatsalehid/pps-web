"use server";

import { cookies } from "next/headers";
import { ApiRequestError } from "@/services/api";
import { AUTH_TOKEN_COOKIE } from "@/services/auth-service";
import {
  acquireLbPrintLock,
  getLbPrintLocks,
  releaseLbPrintLock,
  type LbPrintLock,
} from "@/services/label-bahan-baku-service";
import {
  createLrj,
  deleteLrj,
  fetchLrjLabelPdfBase64,
  getLrjHeaders,
  getLrjJenis,
  getLrjOutputs,
  getLrjPartialInfo,
  getLrjProduksiOptions,
  markLrjPrinted,
  resetLrjPrinted,
  updateLrj,
  type LrjHeader,
  type LrjJenis,
  type LrjMode,
  type LrjOutputItem,
  type LrjPartialInfo,
  type LrjProcessOption,
  type LrjSavePayload,
} from "@/services/label-reject-service";

const PAGE_SIZE = 20;

async function getToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
}

function errMsg(e: unknown): string {
  if (e instanceof ApiRequestError || e instanceof Error) return e.message;
  return "Terjadi kesalahan";
}

export async function getLrjHeadersAction(args: {
  page: number;
  search: string;
  includeUsed: boolean;
}): Promise<
  | { ok: true; headers: LrjHeader[]; total: number; totalPages: number }
  | { ok: false; error: string }
> {
  try {
    const token = await getToken();
    const res = await getLrjHeaders(token, {
      page: args.page,
      limit: PAGE_SIZE,
      search: args.search,
      includeUsed: args.includeUsed,
    });
    return { ok: true, ...res };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function getLrjJenisAction(): Promise<
  { ok: true; jenis: LrjJenis[] } | { ok: false; error: string }
> {
  try {
    const token = await getToken();
    const jenis = await getLrjJenis(token);
    return { ok: true, jenis };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function getLrjProduksiOptionsAction(args: {
  tanggal: string;
  mode: LrjMode;
}): Promise<
  { ok: true; options: LrjProcessOption[] } | { ok: false; error: string }
> {
  try {
    const token = await getToken();
    const options = await getLrjProduksiOptions(token, args);
    return { ok: true, options };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function getLrjOutputsAction(args: {
  noCode: string;
  mode: LrjMode;
}): Promise<{ ok: true; outputs: LrjOutputItem[] } | { ok: false; error: string }> {
  try {
    const token = await getToken();
    const outputs = await getLrjOutputs(token, args);
    return { ok: true, outputs };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function getLrjPartialInfoAction(
  noReject: string,
): Promise<{ ok: true; info: LrjPartialInfo } | { ok: false; error: string }> {
  try {
    const token = await getToken();
    const info = await getLrjPartialInfo(token, noReject);
    return { ok: true, info };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function createLrjAction(payload: LrjSavePayload): Promise<
  | { ok: true; noReject: string | null; count: number }
  | { ok: false; error: string }
> {
  try {
    const token = await getToken();
    const res = await createLrj(token, payload);
    return { ok: true, ...res };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function updateLrjAction(args: {
  noReject: string;
  payload: LrjSavePayload;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const token = await getToken();
    await updateLrj(token, args.noReject, args.payload);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function deleteLrjAction(
  noReject: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const token = await getToken();
    await deleteLrj(token, noReject);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function getLrjPrintLocksAction(): Promise<
  { ok: true; locks: LbPrintLock[] } | { ok: false; error: string }
> {
  try {
    const token = await getToken();
    const locks = await getLbPrintLocks(token);
    return { ok: true, locks };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function printLrjLabelAction(
  noReject: string,
): Promise<
  { ok: true; pdfBase64: string; warning?: string } | { ok: false; error: string }
> {
  const token = await getToken();
  if (!token) return { ok: false, error: "Sesi login berakhir, silakan login ulang" };

  try {
    await acquireLbPrintLock(token, noReject);
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }

  try {
    const pdfBase64 = await fetchLrjLabelPdfBase64(token, noReject);
    let warning: string | undefined;
    try {
      await markLrjPrinted(token, noReject);
    } catch (e) {
      warning = `PDF siap dicetak, tetapi hitungan cetak gagal diperbarui: ${errMsg(e)}`;
    }
    return { ok: true, pdfBase64, warning };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  } finally {
    await releaseLbPrintLock(token, noReject);
  }
}

export async function resetLrjPrintedAction(
  noReject: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const token = await getToken();
    await resetLrjPrinted(token, noReject);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}
