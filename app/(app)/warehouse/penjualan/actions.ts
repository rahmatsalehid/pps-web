"use server";

import { cookies } from "next/headers";
import { AUTH_TOKEN_COOKIE } from "@/services/auth-service";
import { ApiRequestError } from "@/services/api";
import {
  addPenjualanItem,
  createPenjualan,
  deletePenjualanItem,
  fetchPenjualanDetail,
  fetchPenjualanList,
  fetchPenjualanMasters,
  scanPenjualanLabel,
  updatePenjualanItem,
  type FetchPenjualanListParams,
  type PenjualanCreateInput,
  type PenjualanCreateItem,
} from "@/services/penjualan-service";
import {
  acquireLabelPrintLock,
  fetchOutputLabelPdfBase64,
  markLabelPrinted,
  releaseLabelPrintLock,
} from "@/services/inject-service";
import {
  fetchPbdLabelPdfBase64,
  markPbdLabelPrinted,
} from "@/services/penerimaan-barang-dagang-service";

async function getToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
}

function errMsg(e: unknown): string {
  if (e instanceof ApiRequestError) return e.message;
  if (e instanceof Error) return e.message.replace(/^Exception:\s*/, "");
  return "Terjadi kesalahan tak terduga";
}

export async function getPenjualanListAction(
  params: FetchPenjualanListParams = {},
) {
  try {
    const token = await getToken();
    return { ok: true as const, ...(await fetchPenjualanList(token, params)) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getPenjualanDetailAction(noBJJual: string) {
  try {
    const token = await getToken();
    return {
      ok: true as const,
      detail: await fetchPenjualanDetail(token, noBJJual),
    };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

/** Master pembeli + jenis per kategori (barangjadi/furniturewip/barangdagang). */
export async function getPenjualanMastersAction() {
  try {
    const token = await getToken();
    return { ok: true as const, masters: await fetchPenjualanMasters(token) };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

/** Buat DO baru: BJJual_h + BJJualItem_d sekaligus. */
export async function createPenjualanAction(input: PenjualanCreateInput) {
  try {
    const token = await getToken();
    const noBJJual = await createPenjualan(token, input);
    return { ok: true as const, noBJJual };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function addPenjualanItemAction(
  noBJJual: string,
  item: PenjualanCreateItem,
) {
  try {
    const token = await getToken();
    await addPenjualanItem(token, noBJJual, item);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function updatePenjualanItemAction(
  noBJJual: string,
  item: PenjualanCreateItem,
) {
  try {
    const token = await getToken();
    await updatePenjualanItem(token, noBJJual, item);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function deletePenjualanItemAction(
  noBJJual: string,
  kodeKategori: string,
  idJenis: number,
) {
  try {
    const token = await getToken();
    await deletePenjualanItem(token, noBJJual, kodeKategori, idJenis);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

/** Scan label; `confirmPartial` = setuju memecah label sesuai sisa kebutuhan. */
export async function scanPenjualanAction(
  noBJJual: string,
  noLabel: string,
  confirmPartial = false,
) {
  try {
    const token = await getToken();
    return {
      ok: true as const,
      outcome: await scanPenjualanLabel(token, noBJJual, noLabel, confirmPartial),
    };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

/**
 * Cetak ulang label induk yang dipecah (pcs pada label fisik berkurang):
 * kunci cetak → ambil PDF → tandai tercetak → lepas kunci.
 * Kategori barang dagang (BD.) memakai endpoint label barang-dagang.
 */
export async function printPenjualanParentLabelAction(
  kodeKategori: string,
  noLabel: string,
) {
  let locked = false;
  try {
    const token = await getToken();
    await acquireLabelPrintLock(token, noLabel);
    locked = true;
    const pdfBase64 =
      kodeKategori === "barangdagang"
        ? await fetchPbdLabelPdfBase64(token, noLabel)
        : await fetchOutputLabelPdfBase64(
            token,
            kodeKategori === "furniturewip" ? "fwip" : "bj",
            noLabel,
          );
    if (kodeKategori === "barangdagang") {
      await markPbdLabelPrinted(token, noLabel);
    } else {
      await markLabelPrinted(
        token,
        kodeKategori === "furniturewip" ? "fwip" : "bj",
        noLabel,
      );
    }
    await releaseLabelPrintLock(token, noLabel);
    locked = false;
    return { ok: true as const, pdfBase64 };
  } catch (e) {
    if (locked) {
      try {
        const token = await getToken();
        await releaseLabelPrintLock(token, noLabel);
      } catch {
        /* best-effort */
      }
    }
    return { ok: false as const, error: errMsg(e) };
  }
}
