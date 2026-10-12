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
import { fetchBrokerList } from "@/services/broker-service";
import {
  createLbr,
  deleteLbr,
  fetchLbrLabelPdfBase64,
  fetchLbrQcPdfBase64,
  getLbrDetails,
  getLbrHeaders,
  getLbrJenis,
  getLbrMaxSak,
  getLbrOutputs,
  getLbrPartialInfo,
  markLbrPrinted,
  updateLbr,
  type LbrDetail,
  type LbrHeader,
  type LbrJenis,
  type LbrMaxSak,
  type LbrOutputItem,
  type LbrPartialInfo,
  type LbrProcessOption,
  type LbrSavePayload,
} from "@/services/label-broker-service";

const PAGE_SIZE = 20;

async function getToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
}

function errMsg(e: unknown): string {
  if (e instanceof ApiRequestError || e instanceof Error) return e.message;
  return "Terjadi kesalahan";
}

export async function getLbrHeadersAction(args: {
  page: number;
  search: string;
  includeUsed: boolean;
}): Promise<
  | { ok: true; headers: LbrHeader[]; total: number; totalPages: number }
  | { ok: false; error: string }
> {
  try {
    const token = await getToken();
    const res = await getLbrHeaders(token, {
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

export async function getLbrDetailsAction(
  noBroker: string,
): Promise<{ ok: true; details: LbrDetail[] } | { ok: false; error: string }> {
  try {
    const token = await getToken();
    const details = await getLbrDetails(token, noBroker);
    return { ok: true, details };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function getLbrJenisAction(): Promise<
  { ok: true; jenis: LbrJenis[] } | { ok: false; error: string }
> {
  try {
    const token = await getToken();
    const jenis = await getLbrJenis(token);
    return { ok: true, jenis };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function getLbrMaxSakAction(): Promise<
  { ok: true; maxSak: LbrMaxSak } | { ok: false; error: string }
> {
  try {
    const token = await getToken();
    const maxSak = await getLbrMaxSak(token);
    return { ok: true, maxSak };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function getLbrProduksiOptionsAction(args: {
  tanggal: string;
}): Promise<
  { ok: true; options: LbrProcessOption[] } | { ok: false; error: string }
> {
  try {
    const token = await getToken();
    const res = await fetchBrokerList(token, {
      page: 1,
      pageSize: 100,
      tanggal: args.tanggal,
    });
    return {
      ok: true,
      options: res.items.map((p) => ({
        noProduksi: p.noProduksi,
        namaMesin: p.namaMesin,
      })),
    };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function getLbrOutputsAction(
  noProduksi: string,
): Promise<{ ok: true; outputs: LbrOutputItem[] } | { ok: false; error: string }> {
  try {
    const token = await getToken();
    const outputs = await getLbrOutputs(token, noProduksi);
    return { ok: true, outputs };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function getLbrPartialInfoAction(args: {
  noBroker: string;
  noSak: number;
}): Promise<{ ok: true; info: LbrPartialInfo } | { ok: false; error: string }> {
  try {
    const token = await getToken();
    const info = await getLbrPartialInfo(token, args.noBroker, args.noSak);
    return { ok: true, info };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function createLbrAction(payload: LbrSavePayload): Promise<
  { ok: true; noBroker: string | null } | { ok: false; error: string }
> {
  try {
    const token = await getToken();
    const noBroker = await createLbr(token, payload);
    return { ok: true, noBroker };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function updateLbrAction(args: {
  noBroker: string;
  payload: LbrSavePayload;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const token = await getToken();
    await updateLbr(token, args.noBroker, args.payload);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function deleteLbrAction(
  noBroker: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const token = await getToken();
    await deleteLbr(token, noBroker);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function getLbrPrintLocksAction(): Promise<
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

export async function printLbrLabelAction(
  noBroker: string,
): Promise<
  { ok: true; pdfBase64: string; warning?: string } | { ok: false; error: string }
> {
  const token = await getToken();
  if (!token) return { ok: false, error: "Sesi login berakhir, silakan login ulang" };

  try {
    await acquireLbPrintLock(token, noBroker);
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }

  try {
    const pdfBase64 = await fetchLbrLabelPdfBase64(token, noBroker);
    let warning: string | undefined;
    try {
      await markLbrPrinted(token, noBroker);
    } catch (e) {
      warning = `PDF siap dicetak, tetapi hitungan cetak gagal diperbarui: ${errMsg(e)}`;
    }
    return { ok: true, pdfBase64, warning };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  } finally {
    await releaseLbPrintLock(token, noBroker);
  }
}

export async function printLbrQcAction(
  noBroker: string,
): Promise<
  { ok: true; pdfBase64: string } | { ok: false; error: string }
> {
  try {
    const token = await getToken();
    if (!token) return { ok: false, error: "Sesi login berakhir, silakan login ulang" };
    const pdfBase64 = await fetchLbrQcPdfBase64(token, noBroker);
    return { ok: true, pdfBase64 };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}
