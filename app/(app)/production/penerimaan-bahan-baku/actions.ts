"use server";

import { cookies } from "next/headers";
import { AUTH_TOKEN_COOKIE } from "@/services/auth-service";
import { ApiRequestError } from "@/services/api";
import {
  addPbbPallets,
  addPbbSaks,
  deletePbbPallet,
  deletePbbSak,
  fetchPbbLaporan,
  updatePbbPallet,
  updatePbbQc,
  type PbbQcPayload,
  completePbb,
  createPbbHeader,
  deletePbb,
  fetchPbbDetail,
  fetchPbbFormOptions,
  fetchPbbList,
  fetchPbbPotongan,
  fetchPbbTimStatus,
  type FetchPbbListParams,
  type PbbAddPalletsPayload,
  type PbbKodeKategori,
} from "@/services/penerimaan-bahan-baku-service";
import {
  fetchStokBahanBakuPakai,
  fetchStokBahanBakuPakaiLabel,
  fetchStokBahanBakuProses,
  fetchStokBahanBakuProsesLabel,
} from "@/services/stok-service";

async function getToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
}

function errMsg(e: unknown): string {
  if (e instanceof ApiRequestError) return e.message;
  if (e instanceof Error) return e.message.replace(/^Exception:\s*/, "");
  return "Terjadi kesalahan tak terduga";
}

export async function getPbbTimStatusAction() {
  try {
    const token = await getToken();
    return { ok: true as const, tims: await fetchPbbTimStatus(token) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getPbbListAction(params: FetchPbbListParams = {}) {
  try {
    const token = await getToken();
    return { ok: true as const, ...(await fetchPbbList(token, params)) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getPbbDetailAction(noPenerimaan: string) {
  try {
    const token = await getToken();
    return { ok: true as const, detail: await fetchPbbDetail(token, noPenerimaan) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function createPbbHeaderAction(payload: {
  tglPenerimaan: string;
  idTim: number;
}) {
  try {
    const token = await getToken();
    const noPenerimaan = await createPbbHeader(token, payload);
    return { ok: true as const, noPenerimaan };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function deletePbbAction(noPenerimaan: string) {
  try {
    const token = await getToken();
    await deletePbb(token, noPenerimaan);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function completePbbAction(noPenerimaan: string) {
  try {
    const token = await getToken();
    await completePbb(token, noPenerimaan);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getStokBahanBakuPakaiAction() {
  try {
    const token = await getToken();
    return { ok: true as const, items: await fetchStokBahanBakuPakai(token) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getStokBahanBakuPakaiLabelsAction(idBB: number) {
  try {
    const token = await getToken();
    return {
      ok: true as const,
      items: await fetchStokBahanBakuPakaiLabel(token, idBB),
    };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getStokBahanBakuProsesAction() {
  try {
    const token = await getToken();
    return { ok: true as const, items: await fetchStokBahanBakuProses(token) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getStokBahanBakuProsesLabelsAction(idBB: number) {
  try {
    const token = await getToken();
    return {
      ok: true as const,
      items: await fetchStokBahanBakuProsesLabel(token, idBB),
    };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getPbbFormOptionsAction(kodeKategori: PbbKodeKategori) {
  try {
    const token = await getToken();
    return { ok: true as const, options: await fetchPbbFormOptions(token, kodeKategori) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getPbbPotonganAction(idSupplier: number) {
  try {
    const token = await getToken();
    return { ok: true as const, potongan: await fetchPbbPotongan(token, idSupplier) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function addPbbPalletsAction(
  noPenerimaan: string,
  payload: PbbAddPalletsPayload,
) {
  try {
    const token = await getToken();
    const res = await addPbbPallets(token, noPenerimaan, payload);
    return { ok: true as const, noBahanBaku: res.noBahanBaku };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function updatePbbPalletAction(
  noPenerimaan: string,
  noBahanBaku: string,
  noPallet: number,
  payload: { idJenisPlastik: number; keterangan: string | null },
) {
  try {
    const token = await getToken();
    await updatePbbPallet(token, noPenerimaan, noBahanBaku, noPallet, payload);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function deletePbbPalletAction(
  noPenerimaan: string,
  noBahanBaku: string,
  noPallet: number,
) {
  try {
    const token = await getToken();
    await deletePbbPallet(token, noPenerimaan, noBahanBaku, noPallet);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function addPbbSaksAction(
  noPenerimaan: string,
  noBahanBaku: string,
  noPallet: number,
  saks: { berat: number; beratAct: number; isLembab: boolean }[],
) {
  try {
    const token = await getToken();
    await addPbbSaks(token, noPenerimaan, noBahanBaku, noPallet, saks);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function deletePbbSakAction(
  noPenerimaan: string,
  noBahanBaku: string,
  noPallet: number,
  noSak: number,
) {
  try {
    const token = await getToken();
    await deletePbbSak(token, noPenerimaan, noBahanBaku, noPallet, noSak);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function updatePbbQcAction(
  noBahanBaku: string,
  noPallet: number,
  qc: PbbQcPayload,
) {
  try {
    const token = await getToken();
    await updatePbbQc(token, noBahanBaku, noPallet, qc);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getPbbLaporanAction(noPenerimaan: string) {
  try {
    const token = await getToken();
    return { ok: true as const, rows: await fetchPbbLaporan(token, noPenerimaan) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}
