"use server";

import { cookies } from "next/headers";
import { AUTH_TOKEN_COOKIE } from "@/services/auth-service";
import { ApiRequestError } from "@/services/api";
import {
  assignSoAccess,
  completeSo,
  deleteSo,
  deleteSoHasil,
  fetchSoAllUsers,
  fetchSoBlok,
  fetchSoCompleteSummary,
  fetchSoKategori,
  fetchSoLabelPage,
  fetchSoLaporanPdfBase64,
  fetchSoLokasi,
  fetchSoScanSummary,
  generateSo,
  previewSoGenerate,
  revokeSoAccess,
  type SoAccessPayload,
  type SoKategoriParams,
  type SoLabelPageParams,
} from "@/services/stock-opname-v2-service";

async function getToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
}

function errMsg(e: unknown): string {
  if (e instanceof ApiRequestError) return e.message;
  if (e instanceof Error) return e.message.replace(/^Exception:\s*/, "");
  return "Terjadi kesalahan tak terduga";
}

export async function getSoKategoriAction(params: SoKategoriParams = {}) {
  try {
    const token = await getToken();
    const items = await fetchSoKategori(token, params);
    return { ok: true as const, items };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function previewSoGenerateAction(categoryId: number) {
  try {
    const token = await getToken();
    const result = await previewSoGenerate(token, categoryId);
    return { ok: true as const, ...result };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function generateSoAction(categoryId: number) {
  try {
    const token = await getToken();
    const result = await generateSo(token, categoryId);
    return { ok: true as const, result };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function deleteSoAction(stockOpnameNo: string) {
  try {
    const token = await getToken();
    await deleteSo(token, stockOpnameNo);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getSoBlokAction(stockOpnameNo: string) {
  try {
    const token = await getToken();
    const page = await fetchSoBlok(token, stockOpnameNo);
    return { ok: true as const, page };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getSoLokasiAction(stockOpnameNo: string, blok: string) {
  try {
    const token = await getToken();
    const page = await fetchSoLokasi(token, stockOpnameNo, blok);
    return { ok: true as const, page };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getSoLabelPageAction(params: SoLabelPageParams) {
  try {
    const token = await getToken();
    const page = await fetchSoLabelPage(token, params);
    return { ok: true as const, page };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getSoCompleteSummaryAction(stockOpnameNo: string) {
  try {
    const token = await getToken();
    const summary = await fetchSoCompleteSummary(token, stockOpnameNo);
    return { ok: true as const, summary };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function completeSoAction(stockOpnameNo: string) {
  try {
    const token = await getToken();
    await completeSo(token, stockOpnameNo);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function deleteSoHasilAction(stockOpnameNo: string, labelNo: string) {
  try {
    const token = await getToken();
    await deleteSoHasil(token, stockOpnameNo, labelNo);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getSoScanSummaryAction(stockOpnameNo: string) {
  try {
    const token = await getToken();
    const summary = await fetchSoScanSummary(token, stockOpnameNo);
    return { ok: true as const, summary };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getSoLaporanPdfAction(stockOpnameNo: string) {
  try {
    const token = await getToken();
    const base64 = await fetchSoLaporanPdfBase64(token, stockOpnameNo);
    return { ok: true as const, base64 };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getSoUsersAction() {
  try {
    const token = await getToken();
    const users = await fetchSoAllUsers(token);
    return { ok: true as const, users };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function assignSoAccessAction(payload: SoAccessPayload) {
  try {
    const token = await getToken();
    await assignSoAccess(token, payload);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function revokeSoAccessAction(payload: SoAccessPayload) {
  try {
    const token = await getToken();
    await revokeSoAccess(token, payload);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}
