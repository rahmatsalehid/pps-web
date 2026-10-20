"use server";

import { cookies } from "next/headers";
import { AUTH_TOKEN_COOKIE } from "@/services/auth-service";
import { ApiRequestError } from "@/services/api";
import {
  createCetakanBaru,
  createCetakanWarna,
  createWarnaBaru,
  deleteCetakanWarna,
  fetchCetakanWarnaDetail,
  fetchCetakanWarnaList,
  fetchCetakanWarnaOptions,
  updateCetakanWarna,
  type CetakanWarnaInput,
  type CetakanWarnaKey,
  type CetakanWarnaListQuery,
} from "@/services/master-cetakan-service";

async function getToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
}

function errMsg(e: unknown): string {
  if (e instanceof ApiRequestError) return e.message;
  if (e instanceof Error) return e.message.replace(/^Exception:\s*/, "");
  return "Terjadi kesalahan tak terduga";
}

export async function getCetakanOptionsAction() {
  try {
    const token = await getToken();
    return { ok: true as const, options: await fetchCetakanWarnaOptions(token) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getCetakanListAction(query: CetakanWarnaListQuery) {
  try {
    const token = await getToken();
    return { ok: true as const, rows: await fetchCetakanWarnaList(token, query) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getCetakanDetailAction(key: CetakanWarnaKey) {
  try {
    const token = await getToken();
    return {
      ok: true as const,
      detail: await fetchCetakanWarnaDetail(token, key),
    };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function saveCetakanAction(
  input: CetakanWarnaInput,
  oldKey?: CetakanWarnaKey,
) {
  try {
    const token = await getToken();
    if (oldKey) {
      await updateCetakanWarna(token, oldKey, input);
    } else {
      await createCetakanWarna(token, input);
    }
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function deleteCetakanAction(key: CetakanWarnaKey) {
  try {
    const token = await getToken();
    await deleteCetakanWarna(token, key);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function createCetakanBaruAction(namaCetakan: string) {
  try {
    const token = await getToken();
    return {
      ok: true as const,
      cetakan: await createCetakanBaru(token, namaCetakan),
    };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function createWarnaBaruAction(warna: string) {
  try {
    const token = await getToken();
    return { ok: true as const, warna: await createWarnaBaru(token, warna) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}
