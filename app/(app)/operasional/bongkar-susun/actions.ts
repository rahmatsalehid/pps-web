"use server";

import { cookies } from "next/headers";
import { AUTH_TOKEN_COOKIE } from "@/services/auth-service";
import { ApiRequestError } from "@/services/api";
import {
  acquireBsPrintLock,
  createBs,
  deleteBs,
  fetchBsDetail,
  fetchBsLabelInfo,
  fetchBsLabelPdfBase64,
  fetchBsList,
  markBsLabelPrinted,
  releaseBsPrintLock,
  type BsOutputPayload,
  type BsPrintTarget,
  type FetchBsListParams,
} from "@/services/bongkar-susun-service";

async function getToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
}

function errMsg(e: unknown): string {
  if (e instanceof ApiRequestError) return e.message;
  if (e instanceof Error) return e.message.replace(/^Exception:\s*/, "");
  return "Terjadi kesalahan tak terduga";
}

export async function getBongkarSusunListAction(params: FetchBsListParams = {}) {
  try {
    const token = await getToken();
    return { ok: true as const, ...(await fetchBsList(token, params)) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getBsLabelInfoAction(labelCode: string) {
  try {
    const token = await getToken();
    const info = await fetchBsLabelInfo(token, labelCode);
    return { ok: true as const, info };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getBsDetailAction(noBongkarSusun: string) {
  try {
    const token = await getToken();
    const detail = await fetchBsDetail(token, noBongkarSusun);
    return { ok: true as const, detail };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function createBongkarSusunAction(payload: {
  note: string;
  inputs: string[];
  outputs: BsOutputPayload[];
}) {
  try {
    const token = await getToken();
    const noBongkarSusun = await createBs(token, payload);
    return { ok: true as const, noBongkarSusun };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function deleteBongkarSusunAction(noBongkarSusun: string) {
  try {
    const token = await getToken();
    await deleteBs(token, noBongkarSusun);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

/**
 * Cetak satu label output: kunci cetak → ambil PDF → tandai tercetak → lepas
 * kunci. Target sudah disusun client lewat bsPrintTargetOf.
 */
export async function printBsLabelAction(target: BsPrintTarget) {
  let locked = false;
  try {
    const token = await getToken();
    await acquireBsPrintLock(token, target.lockCode);
    locked = true;
    const pdfBase64 = await fetchBsLabelPdfBase64(token, target);
    await markBsLabelPrinted(token, target);
    await releaseBsPrintLock(token, target.lockCode);
    locked = false;
    return { ok: true as const, pdfBase64 };
  } catch (e) {
    if (locked) {
      try {
        const token = await getToken();
        await releaseBsPrintLock(token, target.lockCode);
      } catch {
        /* best-effort */
      }
    }
    return { ok: false as const, error: errMsg(e) };
  }
}
