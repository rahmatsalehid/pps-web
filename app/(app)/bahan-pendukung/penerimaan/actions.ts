"use server";

import { cookies } from "next/headers";
import { AUTH_TOKEN_COOKIE } from "@/services/auth-service";
import { ApiRequestError } from "@/services/api";
import {
  acquirePbpPrintLock,
  addPbpItems,
  completePbp,
  createPbpHeader,
  deletePbp,
  deletePbpLabel,
  fetchPbpCabinetMaterials,
  fetchPbpDetail,
  fetchPbpLabelPdfBase64,
  fetchPbpList,
  fetchPbpSuppliers,
  fetchPbpTimStatus,
  markPbpLabelPrinted,
  releasePbpPrintLock,
  type FetchPbpListParams,
  type PbpItemInput,
} from "@/services/penerimaan-bahan-pendukung-service";

async function getToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
}

function errMsg(e: unknown): string {
  if (e instanceof ApiRequestError) return e.message;
  if (e instanceof Error) return e.message.replace(/^Exception:\s*/, "");
  return "Terjadi kesalahan tak terduga";
}

export async function getPbpTimStatusAction() {
  try {
    const token = await getToken();
    return { ok: true as const, tims: await fetchPbpTimStatus(token) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getPbpListAction(params: FetchPbpListParams = {}) {
  try {
    const token = await getToken();
    return { ok: true as const, ...(await fetchPbpList(token, params)) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getPbpDetailAction(noPenerimaan: string) {
  try {
    const token = await getToken();
    return { ok: true as const, detail: await fetchPbpDetail(token, noPenerimaan) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function createPbpHeaderAction(payload: {
  tglPenerimaan: string;
  idTim: number;
}) {
  try {
    const token = await getToken();
    const noPenerimaan = await createPbpHeader(token, payload);
    return { ok: true as const, noPenerimaan };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function addPbpItemsAction(
  noPenerimaan: string,
  items: PbpItemInput[],
) {
  try {
    const token = await getToken();
    await addPbpItems(token, noPenerimaan, items);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function deletePbpAction(noPenerimaan: string) {
  try {
    const token = await getToken();
    await deletePbp(token, noPenerimaan);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function completePbpAction(noPenerimaan: string) {
  try {
    const token = await getToken();
    await completePbp(token, noPenerimaan);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getPbpMastersAction() {
  try {
    const token = await getToken();
    const [masters, suppliers] = await Promise.all([
      fetchPbpCabinetMaterials(token),
      fetchPbpSuppliers(token),
    ]);
    return { ok: true as const, masters, suppliers };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function deletePbpLabelAction(noBahanPendukung: string) {
  try {
    const token = await getToken();
    await deletePbpLabel(token, noBahanPendukung);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function printPbpLabelAction(noBahanPendukung: string) {
  let locked = false;
  try {
    const token = await getToken();
    await acquirePbpPrintLock(token, noBahanPendukung);
    locked = true;
    const pdfBase64 = await fetchPbpLabelPdfBase64(token, noBahanPendukung);
    const hasBeenPrinted = await markPbpLabelPrinted(token, noBahanPendukung);
    await releasePbpPrintLock(token, noBahanPendukung);
    locked = false;
    return { ok: true as const, pdfBase64, hasBeenPrinted };
  } catch (e) {
    if (locked) {
      const token = await getToken().catch(() => undefined);
      await releasePbpPrintLock(token, noBahanPendukung).catch(() => undefined);
    }
    return { ok: false as const, error: errMsg(e) };
  }
}
