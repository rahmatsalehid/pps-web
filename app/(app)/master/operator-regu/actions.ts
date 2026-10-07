"use server";

import { cookies } from "next/headers";
import { AUTH_TOKEN_COOKIE } from "@/services/auth-service";
import { ApiRequestError } from "@/services/api";
import {
  createOperator,
  createRegu,
  deleteOperator,
  deleteRegu,
  fetchBagianList,
  fetchOperatorMasterList,
  fetchReguDetail,
  fetchReguMasterList,
  updateOperator,
  updateRegu,
  type OperatorInput,
  type ReguInput,
} from "@/services/master-operator-regu-service";

async function getToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
}

function errMsg(e: unknown): string {
  if (e instanceof ApiRequestError) return e.message;
  if (e instanceof Error) return e.message.replace(/^Exception:\s*/, "");
  return "Terjadi kesalahan tak terduga";
}

/** Muat semua data halaman: bagian, operator, regu (parallel). */
export async function getMasterDataAction() {
  try {
    const token = await getToken();
    const [bagian, operators, regus] = await Promise.all([
      fetchBagianList(token),
      fetchOperatorMasterList(token),
      fetchReguMasterList(token),
    ]);
    return { ok: true as const, bagian, operators, regus };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getReguDetailAction(idRegu: number) {
  try {
    const token = await getToken();
    return { ok: true as const, detail: await fetchReguDetail(token, idRegu) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function saveOperatorAction(
  input: OperatorInput,
  idOperator?: number,
) {
  try {
    const token = await getToken();
    if (idOperator != null) {
      await updateOperator(token, idOperator, input);
    } else {
      await createOperator(token, input);
    }
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function deleteOperatorAction(idOperator: number) {
  try {
    const token = await getToken();
    await deleteOperator(token, idOperator);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function saveReguAction(input: ReguInput, idRegu?: number) {
  try {
    const token = await getToken();
    if (idRegu != null) {
      await updateRegu(token, idRegu, input);
    } else {
      await createRegu(token, input);
    }
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function deleteReguAction(idRegu: number) {
  try {
    const token = await getToken();
    await deleteRegu(token, idRegu);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}
