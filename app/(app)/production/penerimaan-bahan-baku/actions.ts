"use server";

import { cookies } from "next/headers";
import { AUTH_TOKEN_COOKIE } from "@/services/auth-service";
import { ApiRequestError } from "@/services/api";
import {
  completePbb,
  createPbbHeader,
  deletePbb,
  fetchPbbDetail,
  fetchPbbList,
  fetchPbbTimStatus,
  type FetchPbbListParams,
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
