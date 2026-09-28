"use server";

import { cookies } from "next/headers";
import { AUTH_TOKEN_COOKIE } from "@/services/auth-service";
import { ApiRequestError } from "@/services/api";
import {
  acquirePbdPrintLock,
  addPbdItems,
  completePbd,
  createPbdHeader,
  deletePbd,
  deletePbdLabel,
  fetchPbdBarangDagangMasters,
  fetchPbdDetail,
  fetchPbdLabelPdfBase64,
  fetchPbdList,
  fetchPbdSuppliers,
  fetchPbdTimStatus,
  markPbdLabelPrinted,
  releasePbdPrintLock,
  type FetchPbdListParams,
  type PbdItemInput,
} from "@/services/penerimaan-barang-dagang-service";

async function getToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
}

function errMsg(e: unknown): string {
  if (e instanceof ApiRequestError) return e.message;
  if (e instanceof Error) return e.message.replace(/^Exception:\s*/, "");
  return "Terjadi kesalahan tak terduga";
}

export async function getPbdTimStatusAction() {
  try {
    const token = await getToken();
    return { ok: true as const, tims: await fetchPbdTimStatus(token) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getPbdListAction(params: FetchPbdListParams = {}) {
  try {
    const token = await getToken();
    return { ok: true as const, ...(await fetchPbdList(token, params)) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getPbdDetailAction(noPenerimaan: string) {
  try {
    const token = await getToken();
    return { ok: true as const, detail: await fetchPbdDetail(token, noPenerimaan) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function createPbdHeaderAction(payload: {
  tglPenerimaan: string;
  idTim: number;
}) {
  try {
    const token = await getToken();
    const noPenerimaan = await createPbdHeader(token, payload);
    return { ok: true as const, noPenerimaan };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function addPbdItemsAction(
  noPenerimaan: string,
  items: PbdItemInput[],
) {
  try {
    const token = await getToken();
    await addPbdItems(token, noPenerimaan, items);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function deletePbdAction(noPenerimaan: string) {
  try {
    const token = await getToken();
    await deletePbd(token, noPenerimaan);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function completePbdAction(noPenerimaan: string) {
  try {
    const token = await getToken();
    await completePbd(token, noPenerimaan);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getPbdMastersAction() {
  try {
    const token = await getToken();
    const [masters, suppliers] = await Promise.all([
      fetchPbdBarangDagangMasters(token),
      fetchPbdSuppliers(token),
    ]);
    return { ok: true as const, masters, suppliers };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function deletePbdLabelAction(noBarangDagang: string) {
  try {
    const token = await getToken();
    await deletePbdLabel(token, noBarangDagang);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function printPbdLabelAction(noBarangDagang: string) {
  let locked = false;
  try {
    const token = await getToken();
    await acquirePbdPrintLock(token, noBarangDagang);
    locked = true;
    const pdfBase64 = await fetchPbdLabelPdfBase64(token, noBarangDagang);
    const hasBeenPrinted = await markPbdLabelPrinted(token, noBarangDagang);
    await releasePbdPrintLock(token, noBarangDagang);
    locked = false;
    return { ok: true as const, pdfBase64, hasBeenPrinted };
  } catch (e) {
    if (locked) {
      const token = await getToken().catch(() => undefined);
      await releasePbdPrintLock(token, noBarangDagang).catch(() => undefined);
    }
    return { ok: false as const, error: errMsg(e) };
  }
}
