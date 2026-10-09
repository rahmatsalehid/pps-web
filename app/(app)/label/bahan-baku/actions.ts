"use server";

import { cookies } from "next/headers";
import { ApiRequestError } from "@/services/api";
import { AUTH_TOKEN_COOKIE } from "@/services/auth-service";
import {
  acquireLbPrintLock,
  fetchLbLabelPdfBase64,
  getLbDetails,
  getLbHeaders,
  getLbPallets,
  getLbPrintLocks,
  markLbPrinted,
  releaseLbPrintLock,
  updateLbPalletQc,
  type LbDetail,
  type LbHeader,
  type LbPallet,
  type LbPrintLock,
  type LbQcHeader,
} from "@/services/label-bahan-baku-service";

const PAGE_SIZE = 20;

async function getToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
}

function errMsg(e: unknown): string {
  if (e instanceof ApiRequestError || e instanceof Error) return e.message;
  return "Terjadi kesalahan";
}

export async function getLbHeadersAction(args: {
  page: number;
  search: string;
  includeUsed: boolean;
}): Promise<
  | { ok: true; headers: LbHeader[]; total: number; totalPages: number }
  | { ok: false; error: string }
> {
  try {
    const token = await getToken();
    const res = await getLbHeaders(token, {
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

export async function getLbPalletsAction(
  noBahanBaku: string,
): Promise<{ ok: true; pallets: LbPallet[] } | { ok: false; error: string }> {
  try {
    const token = await getToken();
    const pallets = await getLbPallets(token, noBahanBaku);
    return { ok: true, pallets };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function getLbDetailsAction(
  noBahanBaku: string,
  noPallet: string,
): Promise<{ ok: true; details: LbDetail[] } | { ok: false; error: string }> {
  try {
    const token = await getToken();
    const details = await getLbDetails(token, noBahanBaku, noPallet);
    return { ok: true, details };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function getLbPrintLocksAction(): Promise<
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

export async function updateLbPalletQcAction(
  noBahanBaku: string,
  noPallet: string,
  header: LbQcHeader,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const token = await getToken();
    await updateLbPalletQc(token, noBahanBaku, noPallet, header);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function printLbLabelAction(
  noBahanBaku: string,
  noPallet: string,
): Promise<
  { ok: true; pdfBase64: string; warning?: string } | { ok: false; error: string }
> {
  const token = await getToken();
  if (!token) return { ok: false, error: "Sesi login berakhir, silakan login ulang" };

  try {
    await acquireLbPrintLock(token, noPallet);
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }

  try {
    const pdfBase64 = await fetchLbLabelPdfBase64(token, noBahanBaku, noPallet);
    let warning: string | undefined;
    try {
      await markLbPrinted(token, noBahanBaku, noPallet);
    } catch (e) {
      warning = `PDF siap dicetak, tetapi hitungan cetak gagal diperbarui: ${errMsg(e)}`;
    }
    return { ok: true, pdfBase64, warning };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  } finally {
    await releaseLbPrintLock(token, noPallet);
  }
}
