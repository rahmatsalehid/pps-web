"use server";

import { cookies } from "next/headers";
import { AUTH_TOKEN_COOKIE } from "@/services/auth-service";
import { ApiRequestError } from "@/services/api";
import {
  deleteSoOldAscendItem,
  deleteSoOldHasil,
  fetchSoOldAcuan,
  fetchSoOldAscendItems,
  fetchSoOldByNo,
  fetchSoOldFamilies,
  fetchSoOldHasil,
  fetchSoOldLabelDetail,
  fetchSoOldList,
  fetchSoOldLokasi,
  fetchSoOldUsage,
  saveSoOldAscend,
  type SoOldAscendSaveEntry,
  type SoOldLabelPageParams,
  type SoOldListParams,
} from "@/services/stock-opname-service";

async function getToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
}

function errMsg(e: unknown): string {
  if (e instanceof ApiRequestError) return e.message;
  if (e instanceof Error) return e.message.replace(/^Exception:\s*/, "");
  return "Terjadi kesalahan tak terduga";
}

export async function getSoOldListAction(params: SoOldListParams) {
  try {
    const token = await getToken();
    const page = await fetchSoOldList(token, params);
    return { ok: true as const, page };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getSoOldByNoAction(noSO: string) {
  try {
    const token = await getToken();
    const row = await fetchSoOldByNo(token, noSO);
    return { ok: true as const, row };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getSoOldAcuanAction(
  noSO: string,
  params: SoOldLabelPageParams,
) {
  try {
    const token = await getToken();
    const page = await fetchSoOldAcuan(token, noSO, params);
    return { ok: true as const, page };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getSoOldHasilAction(
  noSO: string,
  params: SoOldLabelPageParams,
) {
  try {
    const token = await getToken();
    const page = await fetchSoOldHasil(token, noSO, params);
    return { ok: true as const, page };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function deleteSoOldHasilAction(noSO: string, nomorLabel: string) {
  try {
    const token = await getToken();
    await deleteSoOldHasil(token, noSO, nomorLabel);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getSoOldFamiliesAction(noSO: string) {
  try {
    const token = await getToken();
    const items = await fetchSoOldFamilies(token, noSO);
    return { ok: true as const, items };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getSoOldAscendItemsAction(
  noSO: string,
  familyID: number,
  keyword = "",
) {
  try {
    const token = await getToken();
    const items = await fetchSoOldAscendItems(token, noSO, familyID, keyword);
    return { ok: true as const, items };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function saveSoOldAscendAction(
  noSO: string,
  dataList: SoOldAscendSaveEntry[],
) {
  try {
    const token = await getToken();
    await saveSoOldAscend(token, noSO, dataList);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function deleteSoOldAscendItemAction(noSO: string, itemID: number) {
  try {
    const token = await getToken();
    await deleteSoOldAscendItem(token, noSO, itemID);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getSoOldUsageAction(
  itemID: number,
  tglSO: string,
  idWarehouses: number[],
) {
  try {
    const token = await getToken();
    const qtyUsage = await fetchSoOldUsage(token, itemID, tglSO, idWarehouses);
    return { ok: true as const, qtyUsage };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getSoOldLokasiAction() {
  try {
    const token = await getToken();
    const items = await fetchSoOldLokasi(token);
    return { ok: true as const, items };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getSoOldLabelDetailAction(nomorLabel: string) {
  try {
    const token = await getToken();
    const detail = await fetchSoOldLabelDetail(token, nomorLabel);
    return { ok: true as const, detail };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}
