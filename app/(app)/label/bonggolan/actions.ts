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
import { fetchInjectList } from "@/services/inject-service";
import {
  createLbg,
  deleteLbg,
  fetchLbgLabelPdfBase64,
  getLbgHeaders,
  getLbgJenis,
  getLbgOutputsByBroker,
  getLbgOutputsByInject,
  markLbgPrinted,
  updateLbg,
  type LbgHeader,
  type LbgJenis,
  type LbgOutputItem,
  type LbgProcessOption,
} from "@/services/label-bonggolan-service";

const PAGE_SIZE = 20;

async function getToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
}

function errMsg(e: unknown): string {
  if (e instanceof ApiRequestError || e instanceof Error) return e.message;
  return "Terjadi kesalahan";
}

export async function getLbgHeadersAction(args: {
  page: number;
  search: string;
  includeUsed: boolean;
}): Promise<
  | { ok: true; headers: LbgHeader[]; total: number; totalPages: number }
  | { ok: false; error: string }
> {
  try {
    const token = await getToken();
    const res = await getLbgHeaders(token, {
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

export async function getLbgJenisAction(): Promise<
  { ok: true; jenis: LbgJenis[] } | { ok: false; error: string }
> {
  try {
    const token = await getToken();
    const jenis = await getLbgJenis(token);
    return { ok: true, jenis };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function getLbgProduksiOptionsAction(args: {
  mode: "broker" | "inject";
  tanggal: string;
}): Promise<
  { ok: true; options: LbgProcessOption[] } | { ok: false; error: string }
> {
  try {
    const token = await getToken();
    if (args.mode === "broker") {
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
    }
    const res = await fetchInjectList(token, {
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

export async function getLbgOutputsAction(args: {
  mode: "broker" | "inject";
  noProduksi: string;
}): Promise<
  { ok: true; outputs: LbgOutputItem[] } | { ok: false; error: string }
> {
  try {
    const token = await getToken();
    const outputs =
      args.mode === "broker"
        ? await getLbgOutputsByBroker(token, args.noProduksi)
        : await getLbgOutputsByInject(token, args.noProduksi);
    return { ok: true, outputs };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function createLbgAction(args: {
  idBonggolan: number;
  dateCreate: string;
  berat: number;
  processedCode: string | null;
}): Promise<{ ok: true; noBonggolan: string | null } | { ok: false; error: string }> {
  try {
    const token = await getToken();
    const noBonggolan = await createLbg(token, {
      header: {
        IdBonggolan: args.idBonggolan,
        IdWarehouse: 5,
        DateCreate: args.dateCreate,
        Berat: args.berat,
      },
      ...(args.processedCode ? { ProcessedCode: args.processedCode } : {}),
    });
    return { ok: true, noBonggolan };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function updateLbgAction(args: {
  noBonggolan: string;
  dateCreate: string;
  idBonggolan: number;
  berat: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const token = await getToken();
    await updateLbg(token, args.noBonggolan, {
      DateCreate: args.dateCreate,
      IdBonggolan: args.idBonggolan,
      Berat: args.berat,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function deleteLbgAction(
  noBonggolan: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const token = await getToken();
    await deleteLbg(token, noBonggolan);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function getLbgPrintLocksAction(): Promise<
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

export async function printLbgLabelAction(
  noBonggolan: string,
): Promise<
  { ok: true; pdfBase64: string; warning?: string } | { ok: false; error: string }
> {
  const token = await getToken();
  if (!token) return { ok: false, error: "Sesi login berakhir, silakan login ulang" };

  try {
    await acquireLbPrintLock(token, noBonggolan);
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }

  try {
    const pdfBase64 = await fetchLbgLabelPdfBase64(token, noBonggolan);
    let warning: string | undefined;
    try {
      await markLbgPrinted(token, noBonggolan);
    } catch (e) {
      warning = `PDF siap dicetak, tetapi hitungan cetak gagal diperbarui: ${errMsg(e)}`;
    }
    return { ok: true, pdfBase64, warning };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  } finally {
    await releaseLbPrintLock(token, noBonggolan);
  }
}
