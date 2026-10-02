import { apiFetchAuth, ApiRequestError } from "@/services/api";

export type SpkMonitoringItem = {
  idBJ: number;
  itemCode: string;
  namaBJ: string;
  uom: string;
  stock: number;
  minStock: number;
  maxStock: number;
  mpq: number;
  qtyRekomendasi: number;
  status: string;
};

export type SpkSummary = {
  total: number;
  perluProduksi: number;
  stockHabis: number;
  mendekatiMinimum: number;
  stockAman: number;
};

export type SpkSortKey =
  | "itemCode"
  | "barang"
  | "stok"
  | "min"
  | "max"
  | "mpq"
  | "qty"
  | "status";

export type SpkMonitoringParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  sort?: SpkSortKey;
  dir?: "asc" | "desc";
};

export type SpkMonitoringMeta = {
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  search: string;
  status: string;
  sort: SpkSortKey;
  dir: "asc" | "desc";
};

export type SpkMonitoringResult = {
  items: SpkMonitoringItem[];
  total: number;
  summary: SpkSummary;
  meta: SpkMonitoringMeta;
};

export type SpkCreateItem = {
  idBJ: number;
  qtySpk: number;
};

export type SpkCreatePayload = {
  tanggal?: string | null;
  keterangan?: string | null;
  items: SpkCreateItem[];
};

export type SpkDetailItem = {
  idSPKDetail: number;
  idBJ: number;
  itemCode: string;
  namaBJ: string;
  uom: string;
  minStock: number;
  maxStock: number;
  stockSaatSPK: number;
  mpq: number;
  qtyRekomendasi: number;
  qtySpk: number;
  qtyProduksi: number;
  qtySelesai: number;
  status: string;
  keterangan: string | null;
};

export type SpkDetail = {
  idSpk: number;
  noSpk: string;
  tanggal: string | null;
  status: string;
  keterangan: string | null;
  items: SpkDetailItem[];
};

export type SpkHistoryItem = {
  noSpk: string;
  tanggal: string | null;
  statusSpk: string;
  statusBaris: string;
  stockSaatSpk: number;
  qtyRekomendasi: number;
  qtySpk: number;
  qtySelesai: number;
};

export type SpkHistoryResult = {
  items: SpkHistoryItem[];
  total: number;
};

function requireToken(token: string | undefined): string {
  if (!token) throw new ApiRequestError("Tidak terautentikasi");
  return token;
}

function asNumber(v: unknown, fallback = 0): number {
  if (v == null) return fallback;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : fallback;
}

function asInt(v: unknown, fallback = 0): number {
  if (v == null) return fallback;
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function asString(v: unknown): string {
  return v == null ? "" : String(v);
}

function strOr(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function failMessage(
  res: { status: number; data: { message?: string } },
  fallback: string,
): string {
  if (res.status === 403) return "Anda tidak punya akses ke menu ini.";
  return res.data.message ?? `${fallback} (${res.status})`;
}

function parseMonitoringItem(j: Record<string, unknown>): SpkMonitoringItem {
  return {
    idBJ: asInt(j["IdBJ"]),
    itemCode: asString(j["ItemCode"]),
    namaBJ: asString(j["NamaBJ"]),
    uom: asString(j["UOM"]),
    stock: asNumber(j["Stock"]),
    minStock: asNumber(j["MinStock"]),
    maxStock: asNumber(j["MaxStock"]),
    mpq: asNumber(j["MPQ"]),
    qtyRekomendasi: asNumber(j["QtyRekomendasi"]),
    status: asString(j["Status"]),
  };
}

function parseSummary(j: unknown): SpkSummary {
  const s = (j ?? {}) as Record<string, unknown>;
  return {
    total: asInt(s["total"]),
    perluProduksi: asInt(s["perluProduksi"]),
    stockHabis: asInt(s["stockHabis"]),
    mendekatiMinimum: asInt(s["mendekatiMinimum"]),
    stockAman: asInt(s["stockAman"]),
  };
}

function parseDetailItem(j: Record<string, unknown>): SpkDetailItem {
  return {
    idSPKDetail: asInt(j["IdSPKDetail"]),
    idBJ: asInt(j["IdBJ"]),
    itemCode: asString(j["ItemCode"]),
    namaBJ: asString(j["NamaBJ"]),
    uom: asString(j["UOM"]),
    minStock: asNumber(j["MinStock"]),
    maxStock: asNumber(j["MaxStock"]),
    stockSaatSPK: asNumber(j["StockSaatSPK"]),
    mpq: asNumber(j["MPQ"]),
    qtyRekomendasi: asNumber(j["QtyRekomendasi"]),
    qtySpk: asNumber(j["QtySPK"]),
    qtyProduksi: asNumber(j["QtyProduksi"]),
    qtySelesai: asNumber(j["QtySelesai"]),
    status: asString(j["Status"]),
    keterangan: strOr(j["Keterangan"]),
  };
}

function parseDetail(j: Record<string, unknown>): SpkDetail {
  const rows = Array.isArray(j["items"]) ? j["items"] : [];
  return {
    idSpk: asInt(j["IdSPK"]),
    noSpk: asString(j["NoSPK"]),
    tanggal: strOr(j["Tanggal"]),
    status: asString(j["Status"]),
    keterangan: strOr(j["Keterangan"]),
    items: rows.map((r) => parseDetailItem(r as Record<string, unknown>)),
  };
}

export async function fetchSpkMonitoring(
  token: string | undefined,
  params: SpkMonitoringParams = {},
): Promise<SpkMonitoringResult> {
  const t = requireToken(token);
  const qp = new URLSearchParams();
  qp.set("page", String(params.page ?? 1));
  qp.set("pageSize", String(params.pageSize ?? 20));
  if (params.search) qp.set("search", params.search);
  if (params.status) qp.set("status", params.status);
  if (params.sort) qp.set("sort", params.sort);
  if (params.dir) qp.set("dir", params.dir);

  const res = await apiFetchAuth<{
    success?: boolean;
    data?: unknown;
    totalData?: number;
    meta?: Record<string, unknown>;
    message?: string;
  }>(`/spk-barang-jadi?${qp.toString()}`, t);

  if (res.status !== 200) {
    throw new ApiRequestError(failMessage(res, "Gagal memuat data SPK"));
  }

  const rows = Array.isArray(res.data.data) ? res.data.data : [];
  const meta = (res.data.meta ?? {}) as Record<string, unknown>;

  return {
    items: rows.map((r) => parseMonitoringItem(r as Record<string, unknown>)),
    total: asInt(res.data.totalData),
    summary: parseSummary(meta["summary"]),
    meta: {
      page: asInt(meta["page"], 1),
      pageSize: asInt(meta["pageSize"], 20),
      totalPages: asInt(meta["totalPages"], 1),
      hasNextPage: meta["hasNextPage"] === true,
      hasPrevPage: meta["hasPrevPage"] === true,
      search: asString(meta["search"]),
      status: asString(meta["status"]),
      sort: (asString(meta["sort"]) || "barang") as SpkSortKey,
      dir: asString(meta["dir"]) === "desc" ? "desc" : "asc",
    },
  };
}

export async function createSpk(
  token: string | undefined,
  payload: SpkCreatePayload,
): Promise<SpkDetail> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    data?: unknown;
    message?: string;
  }>(`/spk-barang-jadi`, t, {
    method: "POST",
    body: JSON.stringify({
      tanggal: payload.tanggal ?? null,
      keterangan: payload.keterangan ?? null,
      items: payload.items.map((i) => ({ IdBJ: i.idBJ, QtySPK: i.qtySpk })),
    }),
  });

  if (res.status !== 201) {
    throw new ApiRequestError(failMessage(res, "Gagal membuat SPK"));
  }

  const data = (res.data.data ?? {}) as Record<string, unknown>;
  return parseDetail(data);
}

export async function fetchSpkDetail(
  token: string | undefined,
  noSpk: string,
): Promise<SpkDetail> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    data?: unknown;
    message?: string;
  }>(`/spk-barang-jadi/${encodeURIComponent(noSpk)}`, t);

  if (res.status !== 200) {
    throw new ApiRequestError(failMessage(res, "Gagal memuat detail SPK"));
  }

  const data = (res.data.data ?? {}) as Record<string, unknown>;
  return parseDetail(data);
}

export async function fetchSpkHistory(
  token: string | undefined,
  idBJ: number,
  page = 1,
  pageSize = 20,
): Promise<SpkHistoryResult> {
  const t = requireToken(token);
  const qp = new URLSearchParams();
  qp.set("idBJ", String(idBJ));
  qp.set("page", String(page));
  qp.set("pageSize", String(pageSize));

  const res = await apiFetchAuth<{
    success?: boolean;
    data?: unknown;
    totalData?: number;
    message?: string;
  }>(`/spk-barang-jadi/history?${qp.toString()}`, t);

  if (res.status !== 200) {
    throw new ApiRequestError(failMessage(res, "Gagal memuat riwayat SPK"));
  }

  const rows = Array.isArray(res.data.data) ? res.data.data : [];
  return {
    items: rows.map((r) => {
      const j = r as Record<string, unknown>;
      return {
        noSpk: asString(j["NoSPK"]),
        tanggal: strOr(j["Tanggal"]),
        statusSpk: asString(j["StatusSPK"]),
        statusBaris: asString(j["StatusBaris"]),
        stockSaatSpk: asNumber(j["StockSaatSPK"]),
        qtyRekomendasi: asNumber(j["QtyRekomendasi"]),
        qtySpk: asNumber(j["QtySPK"]),
        qtySelesai: asNumber(j["QtySelesai"]),
      };
    }),
    total: asInt(res.data.totalData),
  };
}
