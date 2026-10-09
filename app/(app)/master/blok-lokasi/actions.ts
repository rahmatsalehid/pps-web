"use server";

import { cookies } from "next/headers";
import { AUTH_TOKEN_COOKIE } from "@/services/auth-service";
import { ApiRequestError } from "@/services/api";
import {
  addLokasiJenis,
  createBlok,
  createLokasi,
  deleteBlok,
  deleteLokasi,
  fetchBlokList,
  fetchBlokLokasiMaster,
  fetchJenisList,
  fetchLokasiJenisList,
  fetchLokasiList,
  fetchNextLokasiId,
  removeLokasiJenis,
  updateBlok,
  updateLokasi,
  type BlokInput,
  type LokasiInput,
  type LokasiJenisInput,
} from "@/services/master-blok-lokasi-service";

async function getToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
}

function errMsg(e: unknown): string {
  if (e instanceof ApiRequestError) return e.message;
  if (e instanceof Error) return e.message.replace(/^Exception:\s*/, "");
  return "Terjadi kesalahan tak terduga";
}

export async function getBlokLokasiMasterAction() {
  try {
    const token = await getToken();
    const master = await fetchBlokLokasiMaster(token);
    return { ok: true as const, master };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getBlokListAction() {
  try {
    const token = await getToken();
    const bloks = await fetchBlokList(token);
    return { ok: true as const, bloks };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getLokasiListAction(blok: string) {
  try {
    const token = await getToken();
    const lokasis = await fetchLokasiList(token, blok);
    return { ok: true as const, lokasis };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getNextLokasiIdAction(blok: string) {
  try {
    const token = await getToken();
    const nextId = await fetchNextLokasiId(token, blok);
    return { ok: true as const, nextId };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getJenisListAction(idKategori: number) {
  try {
    const token = await getToken();
    const jenis = await fetchJenisList(token, idKategori);
    return { ok: true as const, jenis };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getLokasiJenisListAction(blok: string, idLokasi: number) {
  try {
    const token = await getToken();
    const rows = await fetchLokasiJenisList(token, blok, idLokasi);
    return { ok: true as const, rows };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function saveBlokAction(input: BlokInput, blok?: string) {
  try {
    const token = await getToken();
    if (blok) {
      await updateBlok(token, blok, input);
    } else {
      await createBlok(token, input);
    }
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function deleteBlokAction(blok: string) {
  try {
    const token = await getToken();
    await deleteBlok(token, blok);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function saveLokasiAction(
  input: LokasiInput,
  target?: { blok: string; idLokasi: number },
) {
  try {
    const token = await getToken();
    if (target) {
      await updateLokasi(token, target.blok, target.idLokasi, input);
    } else {
      await createLokasi(token, input);
    }
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function deleteLokasiAction(blok: string, idLokasi: number) {
  try {
    const token = await getToken();
    await deleteLokasi(token, blok, idLokasi);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function addLokasiJenisAction(input: LokasiJenisInput) {
  try {
    const token = await getToken();
    await addLokasiJenis(token, input);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function removeLokasiJenisAction(input: LokasiJenisInput) {
  try {
    const token = await getToken();
    await removeLokasiJenis(token, input);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}
