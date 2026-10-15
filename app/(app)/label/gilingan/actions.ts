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
  createGlg,
  deleteGlg,
  fetchLglLabelPdfBase64,
  getLglHeaders,
  getLglJenis,
  getLglOutputs,
  getLglPartialInfo,
  getLglProduksiOptions,
  markGlgPrinted,
  updateGlg,
  type LglHeader,
  type LglJenis,
  type LglOutputItem,
  type LglPartialInfo,
  type LglProduksiOption,
  type LglSavePayload,
} from "@/services/label-gilingan-service";

const PAGE_SIZE = 20;

async function getToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
}

function errMsg(e: unknown): string {
  if (e instanceof ApiRequestError || e instanceof Error) return e.message;
  return "Terjadi kesalahan";
}

export async function getLglHeadersAction(args: {
  page: number;
  search: string;
  includeUsed: boolean;
}): Promise<
  | { ok: true; headers: LglHeader[]; total: number; totalPages: number }
  | { ok: false; error: string }
> {
  try {
    const token = await getToken();
    const res = await getLglHeaders(token, {
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

export async function getLglJenisAction(): Promise<
  { ok: true; jenis: LglJenis[] } | { ok: false; error: string }
> {
  try {
    const token = await getToken();
    const jenis = await getLglJenis(token);
    return { ok: true, jenis };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function getLglProduksiOptionsAction(
  tanggal: string,
): Promise<
  { ok: true; options: LglProduksiOption[] } | { ok: false; error: string }
> {
  try {
    const token = await getToken();
    const options = await getLglProduksiOptions(token, tanggal);
    return { ok: true, options };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function getLglOutputsAction(
  noCode: string,
): Promise<{ ok: true; outputs: LglOutputItem[] } | { ok: false; error: string }> {
  try {
    const token = await getToken();
    const outputs = await getLglOutputs(token, noCode);
    return { ok: true, outputs };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function getLglPartialInfoAction(
  noGilingan: string,
): Promise<{ ok: true; info: LglPartialInfo } | { ok: false; error: string }> {
  try {
    const token = await getToken();
    const info = await getLglPartialInfo(token, noGilingan);
    return { ok: true, info };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function createGlgAction(payload: LglSavePayload): Promise<
  { ok: true; noGilingan: string | null } | { ok: false; error: string }
> {
  try {
    const token = await getToken();
    const res = await createGlg(token, payload);
    return { ok: true, ...res };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function updateGlgAction(args: {
  noGilingan: string;
  payload: LglSavePayload;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const token = await getToken();
    await updateGlg(token, args.noGilingan, args.payload);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function deleteGlgAction(
  noGilingan: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const token = await getToken();
    await deleteGlg(token, noGilingan);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function getLglPrintLocksAction(): Promise<
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

export async function printGlgLabelAction(
  noGilingan: string,
): Promise<
  { ok: true; pdfBase64: string; warning?: string } | { ok: false; error: string }
> {
  const token = await getToken();
  if (!token) return { ok: false, error: "Sesi login berakhir, silakan login ulang" };

  try {
    await acquireLbPrintLock(token, noGilingan);
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }

  try {
    const pdfBase64 = await fetchLglLabelPdfBase64(token, noGilingan);
    let warning: string | undefined;
    try {
      await markGlgPrinted(token, noGilingan);
    } catch (e) {
      warning = `PDF siap dicetak, tetapi hitungan cetak gagal diperbarui: ${errMsg(e)}`;
    }
    return { ok: true, pdfBase64, warning };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  } finally {
    await releaseLbPrintLock(token, noGilingan);
  }
}
