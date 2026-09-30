"use server";

import { cookies } from "next/headers";
import { AUTH_TOKEN_COOKIE } from "@/services/auth-service";
import { ApiRequestError } from "@/services/api";
import {
  acceptGoodTransferScan,
  fetchGoodTransferList,
  fetchGoodTransferOne,
  type AcceptScanPayload,
} from "@/services/good-transfer-service";
import { fetchBlokList, fetchLokasiByBlok } from "@/services/mapping-service";

async function getToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
}

function errMsg(e: unknown): string {
  if (e instanceof ApiRequestError) return e.message;
  if (e instanceof Error) return e.message.replace(/^Exception:\s*/, "");
  return "Terjadi kesalahan tak terduga";
}

export type InTransitLocation = {
  blok: string;
  idLokasi: number;
  label: string;
  description: string;
};

export async function getInTransitListAction(page = 1, limit = 50) {
  try {
    const token = await getToken();
    const result = await fetchGoodTransferList(token, {
      page,
      limit,
      status: "SHIPPED",
    });
    return { ok: true as const, ...result };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getInTransitDetailAction(noTransfer: string) {
  try {
    const token = await getToken();
    const detail = await fetchGoodTransferOne(token, noTransfer);
    return { ok: true as const, detail };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getInTransitLocationsAction(idWarehouseTujuan: number) {
  try {
    const token = await getToken();
    const bloks = await fetchBlokList(token);
    const matched = bloks.filter((b) => b.idWarehouse === idWarehouseTujuan);
    const perBlok = await Promise.all(
      matched.map(async (b) => {
        try {
          return await fetchLokasiByBlok(token, b.blok);
        } catch {
          return [];
        }
      }),
    );
    const locations: InTransitLocation[] = perBlok
      .flat()
      .filter((l) => l.enable)
      .map((l) => ({
        blok: l.blok,
        idLokasi: l.idLokasi,
        label: l.label,
        description: l.description,
      }))
      .sort((a, b) => {
        const byBlok = a.blok.localeCompare(b.blok);
        if (byBlok !== 0) return byBlok;
        return a.idLokasi - b.idLokasi;
      });
    return { ok: true as const, locations };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function acceptInTransitScanAction(payload: AcceptScanPayload) {
  try {
    const token = await getToken();
    const result = await acceptGoodTransferScan(token, payload);
    return { ok: true as const, result };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}
