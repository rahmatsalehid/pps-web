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
  createLpk,
  deleteLpk,
  fetchLpkLabelPdfBase64,
  getLpkHeaders,
  getLpkInjectOutputs,
  getLpkInjectPackingInfo,
  getLpkInjectProduksiOptions,
  getLpkJenis,
  getLpkPackingOutputs,
  getLpkPackingProduksiOptions,
  getLpkPartialInfo,
  getLpkReturOutputs,
  getLpkReturProduksiOptions,
  markLpkPrinted,
  resetLpkPrinted,
  updateLpk,
  type LpkHeader,
  type LpkInjectPackingInfo,
  type LpkJenis,
  type LpkMode,
  type LpkOutputItem,
  type LpkPartialInfo,
  type LpkProcessOption,
  type LpkSavePayload,
} from "@/services/label-packing-service";

const PAGE_SIZE = 20;

async function getToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
}

function errMsg(e: unknown): string {
  if (e instanceof ApiRequestError || e instanceof Error) return e.message;
  return "Terjadi kesalahan";
}

export async function getLpkHeadersAction(args: {
  page: number;
  search: string;
  includeUsed: boolean;
}): Promise<
  | { ok: true; headers: LpkHeader[]; total: number; totalPages: number }
  | { ok: false; error: string }
> {
  try {
    const token = await getToken();
    const res = await getLpkHeaders(token, {
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

export async function getLpkJenisAction(): Promise<
  { ok: true; jenis: LpkJenis[] } | { ok: false; error: string }
> {
  try {
    const token = await getToken();
    const jenis = await getLpkJenis(token);
    return { ok: true, jenis };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function getLpkProduksiOptionsAction(args: {
  tanggal: string;
  mode: LpkMode;
}): Promise<
  { ok: true; options: LpkProcessOption[] } | { ok: false; error: string }
> {
  try {
    const token = await getToken();
    let options: LpkProcessOption[];
    if (args.mode === "inject") {
      options = await getLpkInjectProduksiOptions(token, args.tanggal);
    } else if (args.mode === "retur") {
      options = await getLpkReturProduksiOptions(token, args.tanggal);
    } else {
      options = await getLpkPackingProduksiOptions(token, args.tanggal);
    }
    return { ok: true, options };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function getLpkOutputsAction(args: {
  noCode: string;
  mode: LpkMode;
}): Promise<{ ok: true; outputs: LpkOutputItem[] } | { ok: false; error: string }> {
  try {
    const token = await getToken();
    let outputs: LpkOutputItem[];
    if (args.mode === "inject") {
      outputs = await getLpkInjectOutputs(token, args.noCode);
    } else if (args.mode === "retur") {
      outputs = await getLpkReturOutputs(token, args.noCode);
    } else {
      outputs = await getLpkPackingOutputs(token, args.noCode);
    }
    return { ok: true, outputs };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function getLpkInjectPackingInfoAction(
  noProduksi: string,
): Promise<{ ok: true; info: LpkInjectPackingInfo } | { ok: false; error: string }> {
  try {
    const token = await getToken();
    const info = await getLpkInjectPackingInfo(token, noProduksi);
    return { ok: true, info };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function getLpkPartialInfoAction(
  noBJ: string,
): Promise<{ ok: true; info: LpkPartialInfo } | { ok: false; error: string }> {
  try {
    const token = await getToken();
    const info = await getLpkPartialInfo(token, noBJ);
    return { ok: true, info };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function createLpkAction(payload: LpkSavePayload): Promise<
  | { ok: true; noBJ: string | null; count: number }
  | { ok: false; error: string }
> {
  try {
    const token = await getToken();
    const res = await createLpk(token, payload);
    return { ok: true, ...res };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function updateLpkAction(args: {
  noBJ: string;
  payload: LpkSavePayload;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const token = await getToken();
    await updateLpk(token, args.noBJ, args.payload);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function deleteLpkAction(
  noBJ: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const token = await getToken();
    await deleteLpk(token, noBJ);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function getLpkPrintLocksAction(): Promise<
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

export async function printLpkLabelAction(
  noBJ: string,
): Promise<
  { ok: true; pdfBase64: string; warning?: string } | { ok: false; error: string }
> {
  const token = await getToken();
  if (!token) return { ok: false, error: "Sesi login berakhir, silakan login ulang" };

  try {
    await acquireLbPrintLock(token, noBJ);
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }

  try {
    const pdfBase64 = await fetchLpkLabelPdfBase64(token, noBJ);
    let warning: string | undefined;
    try {
      await markLpkPrinted(token, noBJ);
    } catch (e) {
      warning = `PDF siap dicetak, tetapi hitungan cetak gagal diperbarui: ${errMsg(e)}`;
    }
    return { ok: true, pdfBase64, warning };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  } finally {
    await releaseLbPrintLock(token, noBJ);
  }
}

export async function resetLpkPrintedAction(
  noBJ: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const token = await getToken();
    await resetLpkPrinted(token, noBJ);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}
