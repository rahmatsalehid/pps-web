"use server";

import { cookies } from "next/headers";
import { AUTH_TOKEN_COOKIE } from "@/services/auth-service";
import { ApiRequestError } from "@/services/api";
import {
  createFormula,
  deleteFormula,
  fetchFormulaDetail,
  fetchFormulaKategori,
  fetchFormulaList,
  fetchMasterItems,
  updateFormula,
  type FormulaInput,
} from "@/services/master-formula-service";

async function getToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
}

function errMsg(e: unknown): string {
  if (e instanceof ApiRequestError) return e.message;
  if (e instanceof Error) return e.message.replace(/^Exception:\s*/, "");
  return "Terjadi kesalahan tak terduga";
}

export async function getFormulaKategoriAction() {
  try {
    const token = await getToken();
    return { ok: true as const, rows: await fetchFormulaKategori(token) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getFormulaItemsAction(idKategori: number) {
  try {
    const token = await getToken();
    return { ok: true as const, rows: await fetchMasterItems(token, idKategori) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getFormulaListAction() {
  try {
    const token = await getToken();
    return { ok: true as const, rows: await fetchFormulaList(token) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getFormulaDetailAction(idFormula: number) {
  try {
    const token = await getToken();
    return { ok: true as const, detail: await fetchFormulaDetail(token, idFormula) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function saveFormulaAction(input: FormulaInput) {
  try {
    const token = await getToken();
    if (input.idFormula) {
      await updateFormula(token, input);
    } else {
      await createFormula(token, input);
    }
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function deleteFormulaAction(idFormula: number) {
  try {
    const token = await getToken();
    await deleteFormula(token, idFormula);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}
