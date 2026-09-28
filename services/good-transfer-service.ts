import { apiFetchAuth, ApiRequestError } from "@/services/api";

// ── Types ────────────────────────────────────────────────────────────────────

/** Status dokumen GoodsTransfer_h. */
export type GoodTransferDocStatus =
  | "IN_TRANSIT"
  | "SHIPPED"
  | "RECEIVED"
  | "REJECTED"
  | "CANCELLED";

/** Status pemenuhan turunan (dihitung backend). */
export type GoodTransferFulfillStatus =
  | "OPEN"
  | "PARTIAL"
  | "READY"
  | "SHIPPED"
  | "RECEIVED"
  | "CANCELLED"
  | "REJECTED";

export type GoodTransferHeader = {
  noTransfer: string;
  tanggalKirim: string | null;
  idWarehouseAsal: number;
  idWarehouseTujuan: number;
  namaWarehouseAsal: string;
  namaWarehouseTujuan: string;
  warehouseAsalLabel: string;
  warehouseTujuanLabel: string;
  usernameKirim: string | null;
  usernameTerima: string | null;
  status: GoodTransferDocStatus | string;
  fulfillStatus: GoodTransferFulfillStatus | string;
  catatan: string | null;
  alasanTolak: string | null;
  dateTimeKirim: string | null;
  dateTimeTerima: string | null;
  totalLines: number;
  completedLines: number;
  scanCount: number;
  inTransitCount: number;
  isFilled: boolean;
};

export type GoodTransferScan = {
  id: number;
  kodeKategori: string;
  idJenis: number;
  labelCode: string;
  pcs: number;
  isReceived: boolean;
  blokTujuan: string | null;
  idLokasiTujuan: number | null;
  dateTimeScan: string | null;
  dateTimeTerima: string | null;
};

export type GoodTransferLine = {
  kodeKategori: string;
  idJenis: number;
  namaJenis: string | null;
  pcsRequired: number;
  pcsScanned: number;
  isComplete: boolean;
  dateTimeCreate: string | null;
  scans: GoodTransferScan[];
};

export type GoodTransferDetail = {
  header: GoodTransferHeader;
  lines: GoodTransferLine[];
  scans: GoodTransferScan[];
};

export type FetchGoodTransferListParams = {
  page?: number;
  limit?: number;
  /** Kolom Status DB (opsional); UI web memfilter FulfillStatus secara lokal. */
  status?: string;
};

export type FetchGoodTransferListResult = {
  items: GoodTransferHeader[];
  page: number;
  hasMore: boolean;
};

/** Rekomendasi catat sebagian saat pcs label melebihi sisa kebutuhan. */
export type GoodTransferScanSuggestion = {
  noLabel: string;
  availablePcs: number;
  pcsNeeded: number;
  message: string;
};

export type GoodTransferScanOutcome =
  | { kind: "success" }
  | { kind: "needsConfirmation"; suggestion: GoodTransferScanSuggestion };

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

function asIntOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  return Number.isFinite(n) ? Math.trunc(n) : null;
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

function failMessage(res: {
  status: number;
  data: { message?: string };
}, fallback: string): string {
  if (res.status === 403) return "Anda tidak punya akses ke menu ini.";
  return res.data.message ?? `${fallback} (${res.status})`;
}

// ── Parsers ──────────────────────────────────────────────────────────────────

export function parseGoodTransferHeader(
  j: Record<string, unknown>,
): GoodTransferHeader {
  const idAsal = asInt(j["IdWarehouseAsal"]);
  const idTujuan = asInt(j["IdWarehouseTujuan"]);
  const namaAsal = asString(j["NamaWarehouseAsal"]).trim();
  const namaTujuan = asString(j["NamaWarehouseTujuan"]).trim();
  const totalLines = asInt(j["TotalLines"]);
  const completedLines = asInt(j["CompletedLines"]);

  return {
    noTransfer: asString(j["NoTransfer"]),
    tanggalKirim: strOr(j["TanggalKirim"]),
    idWarehouseAsal: idAsal,
    idWarehouseTujuan: idTujuan,
    namaWarehouseAsal: namaAsal,
    namaWarehouseTujuan: namaTujuan,
    warehouseAsalLabel: namaAsal || `WH #${idAsal}`,
    warehouseTujuanLabel: namaTujuan || `WH #${idTujuan}`,
    usernameKirim: strOr(j["UsernameKirim"]),
    usernameTerima: strOr(j["UsernameTerima"]),
    status: asString(pick(j, "Status", "status")),
    fulfillStatus: asString(pick(j, "FulfillStatus", "fulfillStatus")),
    catatan: strOr(j["Catatan"]),
    alasanTolak: strOr(j["AlasanTolak"]),
    dateTimeKirim: strOr(j["DateTimeKirim"]),
    dateTimeTerima: strOr(j["DateTimeTerima"]),
    totalLines,
    completedLines,
    scanCount: asInt(j["ScanCount"]),
    inTransitCount: asInt(j["InTransitCount"]),
    isFilled: totalLines > 0 && completedLines >= totalLines,
  };
}

function parseScan(j: Record<string, unknown>): GoodTransferScan {
  return {
    id: asInt(pick(j, "id", "IdScan", "Id")),
    kodeKategori: asString(pick(j, "kodeKategori", "KodeKategori")),
    idJenis: asInt(pick(j, "idJenis", "IdJenis")),
    labelCode: asString(pick(j, "labelCode", "LabelCode")),
    pcs: asInt(pick(j, "pcs", "Pcs")),
    isReceived: asBool(pick(j, "isReceived", "IsReceived")),
    blokTujuan: strOr(pick(j, "blokTujuan", "BlokTujuan")),
    idLokasiTujuan: asIntOrNull(pick(j, "idLokasiTujuan", "IdLokasiTujuan")),
    dateTimeScan: strOr(pick(j, "dateTimeScan", "DateTimeScan")),
    dateTimeTerima: strOr(pick(j, "dateTimeTerima", "DateTimeTerima")),
  };
}

function parseLine(j: Record<string, unknown>): GoodTransferLine {
  const rawScans = pick(j, "scans", "Scans");
  const pcsRequired = asInt(pick(j, "pcsRequired", "PcsRequired"));
  const pcsScanned = asInt(pick(j, "pcsScanned", "PcsScanned"));
  return {
    kodeKategori: asString(pick(j, "kodeKategori", "KodeKategori")),
    idJenis: asInt(pick(j, "idJenis", "IdJenis")),
    namaJenis: strOr(pick(j, "namaJenis", "NamaJenis")),
    pcsRequired,
    pcsScanned,
    isComplete: asBool(pick(j, "isComplete", "IsComplete")) || pcsScanned >= pcsRequired,
    dateTimeCreate: strOr(pick(j, "dateTimeCreate", "DateTimeCreate")),
    scans: Array.isArray(rawScans)
      ? rawScans.map((s) => parseScan(s as Record<string, unknown>))
      : [],
  };
}

export function kategoriLabel(kode: string): string {
  return kode === "furniturewip" ? "Furniture WIP" : "Barang Jadi";
}

// ── API calls ────────────────────────────────────────────────────────────────

/** GET /goods-transfer — butuh permission goods_transfer:read. */
export async function fetchGoodTransferList(
  token: string | undefined,
  params: FetchGoodTransferListParams = {},
): Promise<FetchGoodTransferListResult> {
  const t = requireToken(token);
  const page = Math.max(params.page ?? 1, 1);
  const limit = Math.max(params.limit ?? 50, 1);
  const qp = new URLSearchParams();
  qp.set("page", String(page));
  qp.set("limit", String(limit));
  if (params.status) qp.set("status", params.status);

  const res = await apiFetchAuth<{
    success?: boolean;
    data?: unknown;
    message?: string;
  }>(`/goods-transfer?${qp.toString()}`, t);
  if (res.status !== 200) {
    throw new ApiRequestError(failMessage(res, "Gagal memuat Goods Transfer"));
  }
  const rows = Array.isArray(res.data.data) ? res.data.data : [];
  return {
    items: rows.map((r) => parseGoodTransferHeader(r as Record<string, unknown>)),
    page,
    hasMore: rows.length >= limit,
  };
}

/** GET /goods-transfer/:noTransfer — header + baris permintaan + scan. */
export async function fetchGoodTransferOne(
  token: string | undefined,
  noTransfer: string,
): Promise<GoodTransferDetail> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    data?: { header?: unknown; lines?: unknown; scans?: unknown };
    message?: string;
  }>(`/goods-transfer/${encodeURIComponent(noTransfer)}`, t);
  if (res.status !== 200 || !res.data.data) {
    throw new ApiRequestError(
      res.status === 403
        ? "Anda tidak punya akses melihat Goods Transfer."
        : (res.data.message ?? "Goods Transfer tidak ditemukan"),
    );
  }
  const d = res.data.data;
  const rawScans = Array.isArray(d.scans) ? d.scans : [];
  const lines = Array.isArray(d.lines)
    ? d.lines.map((l) => parseLine(l as Record<string, unknown>))
    : [];
  return {
    header: parseGoodTransferHeader(
      (d.header ?? {}) as Record<string, unknown>,
    ),
    lines,
    scans: rawScans.map((s) => parseScan(s as Record<string, unknown>)),
  };
}

/**
 * POST /goods-transfer/:noTransfer/scan — butuh goods_transfer:update.
 * Bila pcs label melebihi sisa kebutuhan, backend membalas
 * `needsConfirmation` (tanpa mengubah data); ulangi dengan confirmPartial.
 */
export async function scanGoodTransferLabel(
  token: string | undefined,
  noTransfer: string,
  noLabel: string,
  confirmPartial = false,
): Promise<GoodTransferScanOutcome> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    needsConfirmation?: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>(`/goods-transfer/${encodeURIComponent(noTransfer)}/scan`, t, {
    method: "POST",
    body: JSON.stringify({ noLabel, confirmPartial }),
  });
  if (res.status < 200 || res.status >= 300) {
    throw new ApiRequestError(failMessage(res, "Gagal scan label"));
  }
  const data = res.data.data ?? {};
  if (res.data.needsConfirmation === true) {
    return {
      kind: "needsConfirmation",
      suggestion: {
        noLabel: asString(data["noLabel"]) || noLabel,
        availablePcs: asInt(data["availablePcs"]),
        pcsNeeded: asInt(data["pcsNeeded"]),
        message: asString(data["message"] ?? res.data.message),
      },
    };
  }
  return { kind: "success" };
}

/** DELETE /goods-transfer/scan/:idScan — batalkan scan (belum diterima). */
export async function undoGoodTransferScan(
  token: string | undefined,
  idScan: number,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ success?: boolean; message?: string }>(
    `/goods-transfer/scan/${idScan}`,
    t,
    { method: "DELETE" },
  );
  if (res.status < 200 || res.status >= 300 || res.data.success === false) {
    throw new ApiRequestError(failMessage(res, "Gagal membatalkan scan"));
  }
}

/** POST /goods-transfer/:noTransfer/kirim — tandai dikirim (body kosong). */
export async function markGoodTransferKirim(
  token: string | undefined,
  noTransfer: string,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ success?: boolean; message?: string }>(
    `/goods-transfer/${encodeURIComponent(noTransfer)}/kirim`,
    t,
    { method: "POST", body: JSON.stringify({}) },
  );
  if (res.status < 200 || res.status >= 300 || res.data.success === false) {
    throw new ApiRequestError(failMessage(res, "Gagal menandai kirim"));
  }
}
