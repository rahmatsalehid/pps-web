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
  createLws,
  deleteLws,
  fetchLwsLabelPdfBase64,
  getLwsDetails,
  getLwsHeaders,
  getLwsJenis,
  getLwsMaxSak,
  getLwsOutputs,
  getLwsProduksiOptions,
  markLwsPrinted,
  updateLws,
  type LwsDetail,
  type LwsHeader,
  type LwsJenis,
  type LwsMaxSak,
  type LwsOutputItem,
  type LwsProcessOption,
  type LwsSavePayload,
} from "@/services/label-washing-service";

const PAGE_SIZE = 20;

async function getToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
}

function errMsg(e: unknown): string {
  if (e instanceof ApiRequestError || e instanceof Error) return e.message;
  return "Terjadi kesalahan";
}

export async function getLwsHeadersAction(args: {
  page: number;
  search: string;
  includeUsed: boolean;
}): Promise<
  | { ok: true; headers: LwsHeader[]; total: number; totalPages: number }
  | { ok: false; error: string }
> {
  try {
    const token = await getToken();
    const res = await getLwsHeaders(token, {
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

export async function getLwsDetailsAction(
  noWashing: string,
): Promise<{ ok: true; details: LwsDetail[] } | { ok: false; error: string }> {
  try {
    const token = await getToken();
    const details = await getLwsDetails(token, noWashing);
    return { ok: true, details };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function getLwsJenisAction(): Promise<
  { ok: true; jenis: LwsJenis[] } | { ok: false; error: string }
> {
  try {
    const token = await getToken();
    const jenis = await getLwsJenis(token);
    return { ok: true, jenis };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function getLwsMaxSakAction(): Promise<
  { ok: true; maxSak: LwsMaxSak } | { ok: false; error: string }
> {
  try {
    const token = await getToken();
    const maxSak = await getLwsMaxSak(token);
    return { ok: true, maxSak };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function getLwsProduksiOptionsAction(args: {
  tanggal: string;
}): Promise<
  { ok: true; options: LwsProcessOption[] } | { ok: false; error: string }
> {
  try {
    const token = await getToken();
    const options = await getLwsProduksiOptions(token, args.tanggal);
    return { ok: true, options };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function getLwsOutputsAction(
  noProduksi: string,
): Promise<{ ok: true; outputs: LwsOutputItem[] } | { ok: false; error: string }> {
  try {
    const token = await getToken();
    const outputs = await getLwsOutputs(token, noProduksi);
    return { ok: true, outputs };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function createLwsAction(payload: LwsSavePayload): Promise<
  { ok: true; noWashing: string | null } | { ok: false; error: string }
> {
  try {
    const token = await getToken();
    const noWashing = await createLws(token, payload);
    return { ok: true, noWashing };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function updateLwsAction(args: {
  noWashing: string;
  payload: LwsSavePayload;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const token = await getToken();
    await updateLws(token, args.noWashing, args.payload);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function deleteLwsAction(
  noWashing: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const token = await getToken();
    await deleteLws(token, noWashing);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function getLwsPrintLocksAction(): Promise<
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

export async function printLwsLabelAction(
  noWashing: string,
): Promise<
  { ok: true; pdfBase64: string; warning?: string } | { ok: false; error: string }
> {
  const token = await getToken();
  if (!token) return { ok: false, error: "Sesi login berakhir, silakan login ulang" };

  try {
    await acquireLbPrintLock(token, noWashing);
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }

  try {
    const pdfBase64 = await fetchLwsLabelPdfBase64(token, noWashing);
    let warning: string | undefined;
    try {
      await markLwsPrinted(token, noWashing);
    } catch (e) {
      warning = `PDF siap dicetak, tetapi hitungan cetak gagal diperbarui: ${errMsg(e)}`;
    }
    return { ok: true, pdfBase64, warning };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  } finally {
    await releaseLbPrintLock(token, noWashing);
  }
}
