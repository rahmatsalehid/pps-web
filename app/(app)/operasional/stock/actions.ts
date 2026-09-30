"use server";

import { cookies } from "next/headers";
import { AUTH_TOKEN_COOKIE } from "@/services/auth-service";
import { ApiRequestError } from "@/services/api";
import {
  fetchStockItems,
  fetchStockLabels,
  STOCK_PROSES_LIST,
  type StockProsesKey,
  type StockSourceKey,
  type StockTotals,
} from "@/services/stock-proses-service";

async function getToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
}

function errMsg(e: unknown): string {
  if (e instanceof ApiRequestError) return e.message;
  if (e instanceof Error) return e.message.replace(/^Exception:\s*/, "");
  return "Terjadi kesalahan tak terduga";
}

function requireToken(token: string | undefined): string {
  if (!token) throw new ApiRequestError("Tidak terautentikasi");
  return token;
}

export async function getStockTotalsAction() {
  try {
    const token = requireToken(await getToken());
    const entries = await Promise.all(
      STOCK_PROSES_LIST.map(async (meta) => {
        try {
          const lists =
            meta.key === "bahanBaku"
              ? await Promise.all([
                  fetchStockItems(token, "bahanBaku", "proses"),
                  fetchStockItems(token, "bahanBaku", "pakai"),
                ])
              : [await fetchStockItems(token, meta.key)];
          const rows = lists.flat();
          const labelSisa = rows.reduce((sum, r) => sum + r.labelSisa, 0);
          const amount =
            meta.unit === "kg"
              ? rows.reduce((sum, r) => sum + r.beratSisa, 0)
              : rows.reduce((sum, r) => sum + r.sakSisa, 0);
          return [meta.key, { labelSisa, amount, failed: false }] as const;
        } catch {
          return [
            meta.key,
            { labelSisa: 0, amount: 0, failed: true },
          ] as const;
        }
      }),
    );
    return {
      ok: true as const,
      totals: Object.fromEntries(entries) as StockTotals,
    };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getStockItemsAction(
  key: StockProsesKey,
  source: StockSourceKey = "proses",
) {
  try {
    const token = requireToken(await getToken());
    const items = await fetchStockItems(token, key, source);
    return { ok: true as const, items };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}

export async function getStockLabelsAction(
  key: StockProsesKey,
  id: number,
  source: StockSourceKey = "proses",
) {
  try {
    const token = requireToken(await getToken());
    const labels = await fetchStockLabels(token, key, id, source);
    return { ok: true as const, labels };
  } catch (e) {
    return { ok: false as const, error: errMsg(e) };
  }
}
