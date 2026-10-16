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
  deleteLbd,
  fetchLbdLabelPdfBase64,
  getLbdHeaders,
  getLbdJenis,
  getLbdSuppliers,
  markLbdPrinted,
  updateLbd,
  type LbdHeader,
  type LbdJenis,
  type LbdSavePayload,
  type LbdSupplier,
} from "@/services/label-barang-dagang-service";

const PAGE_SIZE = 20;

async function getToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
}

function errMsg(e: unknown): string {
  if (e instanceof ApiRequestError || e instanceof Error) return e.message;
  return "Terjadi kesalahan";
}

export async function getLbdHeadersAction(args: {
  page: number;
  search: string;
  includeUsed: boolean;
}): Promise<
  | { ok: true; headers: LbdHeader[]; total: number; totalPages: number }
  | { ok: false; error: string }
> {
  try {
    const token = await getToken();
    const res = await getLbdHeaders(token, {
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

export async function getLbdJenisAction(): Promise<
  { ok: true; jenis: LbdJenis[] } | { ok: false; error: string }
> {
  try {
    const token = await getToken();
    const jenis = await getLbdJenis(token);
    return { ok: true, jenis };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function getLbdSuppliersAction(): Promise<
  { ok: true; suppliers: LbdSupplier[] } | { ok: false; error: string }
> {
  try {
    const token = await getToken();
    const suppliers = await getLbdSuppliers(token);
    return { ok: true, suppliers };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function updateLbdAction(args: {
  noBarangDagang: string;
  payload: LbdSavePayload;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const token = await getToken();
    await updateLbd(token, args.noBarangDagang, args.payload);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function deleteLbdAction(
  noBarangDagang: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const token = await getToken();
    await deleteLbd(token, noBarangDagang);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function getLbdPrintLocksAction(): Promise<
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

export async function printLbdLabelAction(
  noBarangDagang: string,
): Promise<
  { ok: true; pdfBase64: string; warning?: string } | { ok: false; error: string }
> {
  const token = await getToken();
  if (!token) return { ok: false, error: "Sesi login berakhir, silakan login ulang" };

  try {
    await acquireLbPrintLock(token, noBarangDagang);
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }

  try {
    const pdfBase64 = await fetchLbdLabelPdfBase64(token, noBarangDagang);
    let warning: string | undefined;
    try {
      await markLbdPrinted(token, noBarangDagang);
    } catch (e) {
      warning = `PDF siap dicetak, tetapi hitungan cetak gagal diperbarui: ${errMsg(e)}`;
    }
    return { ok: true, pdfBase64, warning };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  } finally {
    await releaseLbPrintLock(token, noBarangDagang);
  }
}
