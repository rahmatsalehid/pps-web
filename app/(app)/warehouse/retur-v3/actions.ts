"use server";

import { cookies } from "next/headers";
import { AUTH_TOKEN_COOKIE } from "@/services/auth-service";
import { ApiRequestError } from "@/services/api";
import {
  addReturItems,
  completeRetur,
  createRetur,
  decideRetur,
  fetchReturDetail,
  fetchReturList,
  fetchReturMasters,
  fetchReturOutputs,
  fetchReturTurnover,
  generateReturLabel,
  labelCategoryOf,
  scanReturLabel,
  undoReturScan,
  type FetchReturListParams,
  type ReturCreateInput,
  type ReturItemInput,
} from "@/services/retur-v3-service";
import {
  acquireLabelPrintLock,
  fetchOutputLabelPdfBase64,
  markLabelPrinted,
  releaseLabelPrintLock,
  type InjectOutputCategory,
} from "@/services/inject-service";

async function getToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
}

function errMsg(e: unknown): string {
  if (e instanceof ApiRequestError) return e.message;
  if (e instanceof Error) return e.message.replace(/^Exception:\s*/, "");
  return "Terjadi kesalahan tak terduga";
}

export async function getReturListAction(params: FetchReturListParams = {}) {
  try {
    const token = await getToken();
    return { ok: true as const, ...(await fetchReturList(token, params)) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

/** Detail lengkap: header + items + turnover (bila DIGANTI) + outputs (bila sudah diputuskan). */
export async function getReturDetailAction(noRetur: string) {
  try {
    const token = await getToken();
    const main = await fetchReturDetail(token, noRetur);
    const [turnover, outputs] = await Promise.all([
      main.header.isDiganti
        ? fetchReturTurnover(token, noRetur).catch(() => [])
        : Promise.resolve([]),
      main.header.isPending
        ? Promise.resolve([])
        : fetchReturOutputs(token, noRetur).catch(() => []),
    ]);
    return {
      ok: true as const,
      detail: { ...main, turnover, outputs },
    };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getReturMastersAction() {
  try {
    const token = await getToken();
    return { ok: true as const, masters: await fetchReturMasters(token) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function createReturAction(input: {
  header: ReturCreateInput;
  items: ReturItemInput[];
}) {
  try {
    const token = await getToken();
    const noRetur = await createRetur(token, input.header);
    if (input.items.length > 0) {
      await addReturItems(token, noRetur, input.items);
    }
    return { ok: true as const, noRetur };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function decideReturAction(
  noRetur: string,
  decision: "DIGANTI" | "TIDAK_DIGANTI",
) {
  try {
    const token = await getToken();
    await decideRetur(token, noRetur, decision);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function generateReturLabelAction(
  noRetur: string,
  idItem: number,
  body: { berat?: number; idReject?: number } = {},
) {
  try {
    const token = await getToken();
    const result = await generateReturLabel(token, noRetur, idItem, body);
    return { ok: true as const, ...result };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

/** Scan turnover; `confirmPartial` = setuju memecah label sesuai sisa kebutuhan. */
export async function scanReturAction(
  noRetur: string,
  labelCode: string,
  confirmPartial = false,
) {
  try {
    const token = await getToken();
    return {
      ok: true as const,
      outcome: await scanReturLabel(token, noRetur, labelCode, confirmPartial),
    };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function undoReturScanAction(
  noRetur: string,
  idTurnover: number,
) {
  try {
    const token = await getToken();
    await undoReturScan(token, noRetur, idTurnover);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function completeReturAction(noRetur: string) {
  try {
    const token = await getToken();
    await completeRetur(token, noRetur);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

/**
 * Cetak label hasil generate: kunci cetak → ambil PDF → tandai tercetak → lepas kunci.
 */
export async function printReturLabelAction(
  kodeKategori: string,
  labelCode: string,
) {
  const category: InjectOutputCategory = labelCategoryOf(kodeKategori);
  let locked = false;
  try {
    const token = await getToken();
    await acquireLabelPrintLock(token, labelCode);
    locked = true;
    const pdfBase64 = await fetchOutputLabelPdfBase64(token, category, labelCode);
    await markLabelPrinted(token, category, labelCode);
    await releaseLabelPrintLock(token, labelCode);
    locked = false;
    return { ok: true as const, pdfBase64 };
  } catch (e) {
    if (locked) {
      try {
        const token = await getToken();
        await releaseLabelPrintLock(token, labelCode);
      } catch {
        /* best-effort */
      }
    }
    return { ok: false as const, error: errMsg(e) };
  }
}
