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
import { fetchCrusherList } from "@/services/crusher-service";
import {
  createLcs,
  deleteLcs,
  fetchLcsLabelPdfBase64,
  getLcsHeaders,
  getLcsJenis,
  getLcsOutputs,
  markLcsPrinted,
  updateLcs,
  type LcsHeader,
  type LcsJenis,
  type LcsOutputItem,
  type LcsProcessOption,
} from "@/services/label-crusher-service";

const PAGE_SIZE = 20;

async function getToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
}

function errMsg(e: unknown): string {
  if (e instanceof ApiRequestError || e instanceof Error) return e.message;
  return "Terjadi kesalahan";
}

export async function getLcsHeadersAction(args: {
  page: number;
  search: string;
  includeUsed: boolean;
}): Promise<
  | { ok: true; headers: LcsHeader[]; total: number; totalPages: number }
  | { ok: false; error: string }
> {
  try {
    const token = await getToken();
    const res = await getLcsHeaders(token, {
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

export async function getLcsJenisAction(): Promise<
  { ok: true; jenis: LcsJenis[] } | { ok: false; error: string }
> {
  try {
    const token = await getToken();
    const jenis = await getLcsJenis(token);
    return { ok: true, jenis };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function getLcsProduksiOptionsAction(
  tanggal: string,
): Promise<
  { ok: true; options: LcsProcessOption[] } | { ok: false; error: string }
> {
  try {
    const token = await getToken();
    const res = await fetchCrusherList(token, {
      page: 1,
      pageSize: 100,
      tanggal,
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

export async function getLcsOutputsAction(
  noProduksi: string,
): Promise<
  { ok: true; outputs: LcsOutputItem[] } | { ok: false; error: string }
> {
  try {
    const token = await getToken();
    const outputs = await getLcsOutputs(token, noProduksi);
    return { ok: true, outputs };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function createLcsAction(args: {
  idCrusher: number;
  dateCreate: string;
  berat: number;
  processedCode: string | null;
}): Promise<{ ok: true; noCrusher: string | null } | { ok: false; error: string }> {
  try {
    const token = await getToken();
    const noCrusher = await createLcs(token, {
      header: {
        IdCrusher: args.idCrusher,
        IdWarehouse: 5,
        DateCreate: args.dateCreate,
        Berat: args.berat,
      },
      ...(args.processedCode ? { ProcessedCode: args.processedCode } : {}),
    });
    return { ok: true, noCrusher };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function updateLcsAction(args: {
  noCrusher: string;
  dateCreate: string;
  idCrusher: number;
  berat: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const token = await getToken();
    await updateLcs(token, args.noCrusher, {
      DateCreate: args.dateCreate,
      IdCrusher: args.idCrusher,
      Berat: args.berat,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function deleteLcsAction(
  noCrusher: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const token = await getToken();
    await deleteLcs(token, noCrusher);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function getLcsPrintLocksAction(): Promise<
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

export async function printLcsLabelAction(
  noCrusher: string,
): Promise<
  { ok: true; pdfBase64: string; warning?: string } | { ok: false; error: string }
> {
  const token = await getToken();
  if (!token) return { ok: false, error: "Sesi login berakhir, silakan login ulang" };

  try {
    await acquireLbPrintLock(token, noCrusher);
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }

  try {
    const pdfBase64 = await fetchLcsLabelPdfBase64(token, noCrusher);
    let warning: string | undefined;
    try {
      await markLcsPrinted(token, noCrusher);
    } catch (e) {
      warning = `PDF siap dicetak, tetapi hitungan cetak gagal diperbarui: ${errMsg(e)}`;
    }
    return { ok: true, pdfBase64, warning };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  } finally {
    await releaseLbPrintLock(token, noCrusher);
  }
}
