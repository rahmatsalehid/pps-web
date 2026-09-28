"use server";

import { cookies } from "next/headers";
import { AUTH_TOKEN_COOKIE } from "@/services/auth-service";
import { ApiRequestError } from "@/services/api";
import {
  createLokasi,
  fetchBlokList,
  fetchJenis,
  fetchKategori,
  fetchLabelByLokasi,
  fetchLabelHistory,
  fetchLayout,
  fetchLokasiByBlok,
  saveLayout,
  updateLokasi,
  type JenisPairInput,
  type LayoutCellPayload,
} from "@/services/mapping-service";

async function getToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
}

function errMsg(e: unknown): string {
  if (e instanceof ApiRequestError) return e.message;
  if (e instanceof Error) return e.message.replace(/^Exception:\s*/, "");
  return "Terjadi kesalahan tak terduga";
}

export async function getMappingBlokAction() {
  try {
    const token = await getToken();
    return { ok: true as const, bloks: await fetchBlokList(token) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getMappingLokasiAction(blok: string) {
  try {
    const token = await getToken();
    return { ok: true as const, lokasis: await fetchLokasiByBlok(token, blok) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getMappingLayoutAction(blok: string) {
  try {
    const token = await getToken();
    return { ok: true as const, layout: await fetchLayout(token, blok) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function saveMappingLayoutAction(
  blok: string,
  payload: { rows: number; cols: number; cells: LayoutCellPayload[] },
) {
  try {
    const token = await getToken();
    await saveLayout(token, blok, payload);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function createMappingLokasiAction(
  blok: string,
  payload: { idLokasi: number; jenisList: JenisPairInput[] },
) {
  try {
    const token = await getToken();
    await createLokasi(token, blok, payload);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function updateMappingLokasiAction(
  blok: string,
  idLokasi: number,
  payload: { jenisList: JenisPairInput[] },
) {
  try {
    const token = await getToken();
    await updateLokasi(token, blok, idLokasi, payload);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getMappingKategoriAction() {
  try {
    const token = await getToken();
    return { ok: true as const, kategoris: await fetchKategori(token) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getMappingJenisAction(idKategori: number) {
  try {
    const token = await getToken();
    return { ok: true as const, jenises: await fetchJenis(token, idKategori) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getMappingLabelsAction(blok: string, idLokasi: number) {
  try {
    const token = await getToken();
    return {
      ok: true as const,
      result: await fetchLabelByLokasi(token, blok, idLokasi),
    };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getMappingLabelHistoryAction(labelCode: string) {
  try {
    const token = await getToken();
    return {
      ok: true as const,
      result: await fetchLabelHistory(token, labelCode),
    };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}
