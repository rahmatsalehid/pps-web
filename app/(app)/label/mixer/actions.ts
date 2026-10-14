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
  createLmx,
  deleteLmx,
  fetchLmxLabelPdfBase64,
  fetchLmxQcPdfBase64,
  getLmxDetails,
  getLmxHeaders,
  getLmxInjectOutputs,
  getLmxInjectProduksiOptions,
  getLmxJenis,
  getLmxMaxSak,
  getLmxMixerOutputs,
  getLmxMixerProduksiOptions,
  getLmxPartialInfo,
  markLmxPrinted,
  updateLmx,
  type LmxDetail,
  type LmxHeader,
  type LmxJenis,
  type LmxMaxSak,
  type LmxOutputItem,
  type LmxPartialInfo,
  type LmxProcessOption,
  type LmxSavePayload,
} from "@/services/label-mixer-service";

const PAGE_SIZE = 20;

async function getToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
}

function errMsg(e: unknown): string {
  if (e instanceof ApiRequestError || e instanceof Error) return e.message;
  return "Terjadi kesalahan";
}

export async function getLmxHeadersAction(args: {
  page: number;
  search: string;
  includeUsed: boolean;
}): Promise<
  | { ok: true; headers: LmxHeader[]; total: number; totalPages: number }
  | { ok: false; error: string }
> {
  try {
    const token = await getToken();
    const res = await getLmxHeaders(token, {
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

export async function getLmxDetailsAction(
  noMixer: string,
): Promise<{ ok: true; details: LmxDetail[] } | { ok: false; error: string }> {
  try {
    const token = await getToken();
    const details = await getLmxDetails(token, noMixer);
    return { ok: true, details };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function getLmxJenisAction(): Promise<
  { ok: true; jenis: LmxJenis[] } | { ok: false; error: string }
> {
  try {
    const token = await getToken();
    const jenis = await getLmxJenis(token);
    return { ok: true, jenis };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function getLmxMaxSakAction(): Promise<
  { ok: true; maxSak: LmxMaxSak } | { ok: false; error: string }
> {
  try {
    const token = await getToken();
    const maxSak = await getLmxMaxSak(token);
    return { ok: true, maxSak };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function getLmxProduksiOptionsAction(args: {
  tanggal: string;
  mode: "production" | "inject";
}): Promise<
  { ok: true; options: LmxProcessOption[] } | { ok: false; error: string }
> {
  try {
    const token = await getToken();
    const options =
      args.mode === "inject"
        ? await getLmxInjectProduksiOptions(token, args.tanggal)
        : await getLmxMixerProduksiOptions(token, args.tanggal);
    return { ok: true, options };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function getLmxOutputsAction(args: {
  noProduksi: string;
  mode: "production" | "inject";
}): Promise<{ ok: true; outputs: LmxOutputItem[] } | { ok: false; error: string }> {
  try {
    const token = await getToken();
    const outputs =
      args.mode === "inject"
        ? await getLmxInjectOutputs(token, args.noProduksi)
        : await getLmxMixerOutputs(token, args.noProduksi);
    return { ok: true, outputs };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function getLmxPartialInfoAction(args: {
  noMixer: string;
  noSak: number;
}): Promise<{ ok: true; info: LmxPartialInfo } | { ok: false; error: string }> {
  try {
    const token = await getToken();
    const info = await getLmxPartialInfo(token, args.noMixer, args.noSak);
    return { ok: true, info };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function createLmxAction(payload: LmxSavePayload): Promise<
  { ok: true; noMixer: string | null } | { ok: false; error: string }
> {
  try {
    const token = await getToken();
    const noMixer = await createLmx(token, payload);
    return { ok: true, noMixer };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function updateLmxAction(args: {
  noMixer: string;
  payload: LmxSavePayload;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const token = await getToken();
    await updateLmx(token, args.noMixer, args.payload);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function deleteLmxAction(
  noMixer: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const token = await getToken();
    await deleteLmx(token, noMixer);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function getLmxPrintLocksAction(): Promise<
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

export async function printLmxLabelAction(
  noMixer: string,
): Promise<
  { ok: true; pdfBase64: string; warning?: string } | { ok: false; error: string }
> {
  const token = await getToken();
  if (!token) return { ok: false, error: "Sesi login berakhir, silakan login ulang" };

  try {
    await acquireLbPrintLock(token, noMixer);
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }

  try {
    const pdfBase64 = await fetchLmxLabelPdfBase64(token, noMixer);
    let warning: string | undefined;
    try {
      await markLmxPrinted(token, noMixer);
    } catch (e) {
      warning = `PDF siap dicetak, tetapi hitungan cetak gagal diperbarui: ${errMsg(e)}`;
    }
    return { ok: true, pdfBase64, warning };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  } finally {
    await releaseLbPrintLock(token, noMixer);
  }
}

export async function printLmxQcAction(
  noMixer: string,
): Promise<
  { ok: true; pdfBase64: string } | { ok: false; error: string }
> {
  try {
    const token = await getToken();
    if (!token) return { ok: false, error: "Sesi login berakhir, silakan login ulang" };
    const pdfBase64 = await fetchLmxQcPdfBase64(token, noMixer);
    return { ok: true, pdfBase64 };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}
