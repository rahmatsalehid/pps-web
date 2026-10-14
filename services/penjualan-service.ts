import { apiFetchAuth, ApiRequestError } from "@/services/api";

// ── Types ────────────────────────────────────────────────────────────────────

export type PenjualanStatusFilter = "incomplete" | "complete" | "all";

export type PenjualanHeader = {
  noBJJual: string;
  tanggal: string | null;
  idPembeli: number;
  namaPembeli: string;
  remark: string | null;
  /** Jenis invoice (BJJual_h.InvoiceType). */
  invoiceType: string | null;
  totalLines: number;
  completedLines: number;
  isComplete: boolean;
  dateComplete: string | null;
};

export type PenjualanLabelScan = {
  id: number;
  noLabel: string;
  /** Kode partial (BL./BC.) hasil pecah label oleh scan ini. */
  noPartial: string | null;
  pcs: number;
  dateTimeScan: string | null;
};

export type PenjualanKategori =
  | "furniturewip"
  | "barangjadi"
  | "barangdagang";

export type PenjualanLine = {
  kodeKategori: string;
  idJenis: number;
  namaJenis: string | null;
  pcsRequired: number;
  pcsScanned: number;
  isComplete: boolean;
  dateTimeCreate: string | null;
  scans: PenjualanLabelScan[];
};

export type PenjualanDetail = {
  header: PenjualanHeader;
  lines: PenjualanLine[];
};

export type FetchPenjualanListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: PenjualanStatusFilter;
};

export type FetchPenjualanListResult = {
  items: PenjualanHeader[];
  page: number;
  totalPages: number;
  total: number;
};

/** Rekomendasi pecah (partial) saat pcs label melebihi sisa kebutuhan. */
export type PenjualanPartialSuggestion = {
  noLabel: string;
  availablePcs: number;
  pcsNeeded: number;
  message: string;
};

export type PenjualanScanOutcome =
  | { kind: "success" }
  | { kind: "needsConfirmation"; suggestion: PenjualanPartialSuggestion }
  | {
      kind: "partialCreated";
      partialCode: string | null;
      kodeKategori: string | null;
    };

// ── Helpers ──────────────────────────────────────────────────────────────────

function requireToken(token: string | undefined): string {
  if (!token) throw new ApiRequestError("Tidak terautentikasi");
  return token;
}

function asString(v: unknown): string {
  return v == null ? "" : String(v);
}

function asInt(v: unknown, fallback = 0): number {
  if (v == null) return fallback;
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function asBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  const s = asString(v).trim().toLowerCase();
  return s === "true" || s === "1";
}

function strOr(v: unknown): string | null {
  const t = v == null ? "" : String(v).trim();
  return t || null;
}

function pick(j: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) if (j[k] != null) return j[k];
  return undefined;
}

// ── Parsers ──────────────────────────────────────────────────────────────────

export function parsePenjualanHeader(j: Record<string, unknown>): PenjualanHeader {
  return {
    noBJJual: asString(j["NoBJJual"]),
    tanggal: strOr(j["Tanggal"]),
    idPembeli: asInt(j["IdPembeli"]),
    namaPembeli: asString(j["NamaPembeli"]),
    remark: strOr(j["Remark"]),
    invoiceType: strOr(j["InvoiceType"]),
    totalLines: asInt(j["TotalLines"]),
    completedLines: asInt(j["CompletedLines"]),
    isComplete: asBool(j["IsComplete"]),
    dateComplete: strOr(j["DateComplete"]),
  };
}

function parseScan(j: Record<string, unknown>): PenjualanLabelScan {
  return {
    id: asInt(pick(j, "id", "Id")),
    noLabel: asString(pick(j, "noLabel", "NoLabel")),
    noPartial: strOr(pick(j, "noPartial", "NoPartial")),
    pcs: asInt(pick(j, "pcs", "Pcs")),
    dateTimeScan: strOr(pick(j, "dateTimeScan", "DateTimeScan")),
  };
}

function parseLine(j: Record<string, unknown>): PenjualanLine {
  const rawScans = pick(j, "scans", "Scans");
  return {
    kodeKategori: asString(pick(j, "kodeKategori", "KodeKategori")),
    idJenis: asInt(pick(j, "idJenis", "IdJenis")),
    namaJenis: strOr(pick(j, "namaJenis", "NamaJenis")),
    pcsRequired: asInt(pick(j, "pcsRequired", "PcsRequired")),
    pcsScanned: asInt(pick(j, "pcsScanned", "PcsScanned")),
    isComplete: asBool(pick(j, "isComplete", "IsComplete")),
    dateTimeCreate: strOr(pick(j, "dateTimeCreate", "DateTimeCreate")),
    scans: Array.isArray(rawScans)
      ? rawScans.map((s) => parseScan(s as Record<string, unknown>))
      : [],
  };
}

export function kategoriLabel(kode: string): string {
  if (kode === "furniturewip") return "Furniture WIP";
  if (kode === "barangdagang") return "Barang Dagang";
  return "Barang Jadi";
}

// ── API calls ────────────────────────────────────────────────────────────────

/** GET /penjualan — butuh permission penjualan:read. */
export async function fetchPenjualanList(
  token: string | undefined,
  params: FetchPenjualanListParams = {},
): Promise<FetchPenjualanListResult> {
  const t = requireToken(token);
  const qp = new URLSearchParams();
  qp.set("page", String(params.page ?? 1));
  qp.set("pageSize", String(params.pageSize ?? 20));
  if (params.search?.trim()) qp.set("search", params.search.trim());
  if (params.dateFrom) qp.set("dateFrom", params.dateFrom);
  if (params.dateTo) qp.set("dateTo", params.dateTo);
  if (params.status) qp.set("status", params.status);

  const res = await apiFetchAuth<{
    data?: Record<string, unknown>[];
    meta?: { page?: number; totalPages?: number };
    totalData?: number;
    message?: string;
  }>(`/penjualan?${qp.toString()}`, t);
  if (res.status === 403) {
    throw new ApiRequestError("Anda tidak punya akses melihat Penjualan.");
  }
  if (res.status !== 200) {
    throw new ApiRequestError(
      res.data.message ?? `Gagal memuat penjualan (${res.status})`,
    );
  }
  return {
    items: (res.data.data ?? []).map(parsePenjualanHeader),
    page: asInt(res.data.meta?.page, params.page ?? 1),
    totalPages: asInt(res.data.meta?.totalPages, 1),
    total: asInt(res.data.totalData, 0),
  };
}

/** GET /penjualan/:noBJJual — header + baris turnover + scan. */
export async function fetchPenjualanDetail(
  token: string | undefined,
  noBJJual: string,
): Promise<PenjualanDetail> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    data?: { header?: Record<string, unknown>; lines?: unknown };
    message?: string;
  }>(`/penjualan/${encodeURIComponent(noBJJual)}`, t);
  if (res.status !== 200 || !res.data.data) {
    throw new ApiRequestError(
      res.data.message ?? "Data Penjualan tidak ditemukan",
    );
  }
  const d = res.data.data;
  return {
    header: parsePenjualanHeader(d.header ?? {}),
    lines: Array.isArray(d.lines)
      ? d.lines.map((l) => parseLine(l as Record<string, unknown>))
      : [],
  };
}

/**
 * POST /penjualan/:noBJJual/scan — butuh permission penjualan:create.
 * Bila pcs label melebihi sisa kebutuhan, backend membalas
 * `needsConfirmation` (tanpa mengubah data); ulangi dengan confirmPartial
 * untuk benar-benar memecah label.
 */
export async function scanPenjualanLabel(
  token: string | undefined,
  noBJJual: string,
  noLabel: string,
  confirmPartial = false,
): Promise<PenjualanScanOutcome> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    needsConfirmation?: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>(`/penjualan/${encodeURIComponent(noBJJual)}/scan`, t, {
    method: "POST",
    body: JSON.stringify({ noLabel, confirmPartial }),
  });
  if (res.status === 403) {
    throw new ApiRequestError("Anda tidak punya akses melakukan scan Penjualan.");
  }
  if (res.status < 200 || res.status >= 300) {
    throw new ApiRequestError(
      res.data.message ?? `Gagal scan label (${res.status})`,
    );
  }
  const data = res.data.data ?? {};
  if (res.data.needsConfirmation === true) {
    return {
      kind: "needsConfirmation",
      suggestion: {
        noLabel: asString(data["noLabel"]),
        availablePcs: asInt(data["availablePcs"]),
        pcsNeeded: asInt(data["pcsNeeded"]),
        message: asString(data["message"]),
      },
    };
  }
  if (confirmPartial) {
    return {
      kind: "partialCreated",
      partialCode: strOr(data["partialCode"]),
      kodeKategori: strOr(data["kodeKategori"]),
    };
  }
  return { kind: "success" };
}
