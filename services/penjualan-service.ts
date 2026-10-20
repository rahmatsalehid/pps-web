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

// ── Create / item types ──────────────────────────────────────────────────────

export type PenjualanCreateItem = {
  kodeKategori: PenjualanKategori;
  idJenis: number;
  pcs: number;
};

export type PenjualanCreateInput = {
  tanggal: string;
  idPembeli: number;
  invoiceType: string;
  remark?: string;
  items: PenjualanCreateItem[];
};

export type PenjualanItemOption = { id: number; nama: string };
export type PenjualanPembeliOption = { idPembeli: number; namaPembeli: string };

export type PenjualanMasters = {
  pembeli: PenjualanPembeliOption[];
  barangJadi: PenjualanItemOption[];
  furnitureWip: PenjualanItemOption[];
  barangDagang: PenjualanItemOption[];
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

// ── Masters (pembeli + jenis per kategori) ───────────────────────────────────

function rowsOf(d: unknown): Record<string, unknown>[] {
  const container = d as { data?: unknown } | null;
  const arr = Array.isArray(d) ? d : Array.isArray(container?.data) ? container?.data : [];
  return arr as Record<string, unknown>[];
}

/** Pesan error dari backend — prioritaskan `error.message` (detail asli). */
function serverMsg(
  data: { message?: string; error?: { message?: string } },
  fallback: string,
): string {
  const detail = data.error?.message;
  if (detail && (!data.message || data.message === "Internal Server Error")) {
    return detail;
  }
  return data.message ?? fallback;
}

/** GET /mst/pembeli + /mst-barang-jadi + /furniture-wip-type + /mst-barang-dagang. */
export async function fetchPenjualanMasters(
  token: string | undefined,
): Promise<PenjualanMasters> {
  const t = requireToken(token);
  const [pembeliRes, bjRes, wipRes, bdRes] = await Promise.all([
    apiFetchAuth<{ data?: unknown; message?: string }>("/mst/pembeli", t),
    apiFetchAuth<{ data?: unknown; message?: string }>("/mst-barang-jadi", t),
    apiFetchAuth<{ data?: unknown; message?: string }>("/furniture-wip-type", t),
    apiFetchAuth<{ data?: unknown; message?: string }>("/mst-barang-dagang", t),
  ]);

  return {
    pembeli: rowsOf(pembeliRes.data)
      .map((p) => ({
        idPembeli: asInt(pick(p, "IdPembeli", "idPembeli")),
        namaPembeli: asString(pick(p, "NamaPembeli", "namaPembeli")),
      }))
      .filter((p) => p.idPembeli > 0),
    barangJadi: rowsOf(bjRes.data)
      .map((p) => ({
        id: asInt(pick(p, "IdBJ", "idBJ", "IdJenis", "idJenis")),
        nama: asString(pick(p, "NamaBJ", "namaBJ", "NamaJenis", "namaJenis")),
      }))
      .filter((p) => p.id > 0),
    furnitureWip: rowsOf(wipRes.data)
      .map((p) => ({
        id: asInt(pick(p, "IdCabinetWIP", "idCabinetWip")),
        nama: asString(pick(p, "Nama", "nama")),
      }))
      .filter((p) => p.id > 0),
    barangDagang: rowsOf(bdRes.data)
      .map((p) => ({
        id: asInt(pick(p, "IdBarangDagang", "idBarangDagang")),
        nama: asString(pick(p, "NamaBarangDagang", "namaBarangDagang")),
      }))
      .filter((p) => p.id > 0),
  };
}

// ── Create DO (header + items) ───────────────────────────────────────────────

/**
 * POST /bj-jual — buat BJJual_h + BJJualItem_d sekaligus.
 * Butuh permission penjualan:create. Mengembalikan NoBJJual (auto K.00000xxxxx).
 */
export async function createPenjualan(
  token: string | undefined,
  input: PenjualanCreateInput,
): Promise<string> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>("/bj-jual", t, {
    method: "POST",
    body: JSON.stringify({
      tanggal: input.tanggal,
      idPembeli: input.idPembeli,
      invoiceType: input.invoiceType,
      ...(input.remark?.trim() ? { remark: input.remark.trim() } : {}),
      items: input.items.map((i) => ({
        kodeKategori: i.kodeKategori,
        idJenis: i.idJenis,
        pcs: i.pcs,
      })),
    }),
  });
  if (res.status === 403) {
    throw new ApiRequestError("Anda tidak punya akses membuat Penjualan (penjualan:create).");
  }
  if (res.status < 200 || res.status >= 300) {
    throw new ApiRequestError(serverMsg(res.data, `Gagal membuat penjualan (${res.status})`));
  }
  const noBJJual = asString(res.data.data?.["NoBJJual"] ?? res.data.data?.["noBJJual"]);
  if (!noBJJual) throw new ApiRequestError("Nomor DO tidak diterima dari server");
  return noBJJual;
}

// ── Item CRUD (POST/PATCH/DELETE /penjualan/:no/items) ───────────────────────

/** POST /penjualan/:noBJJual/items — tambah 1 baris item. */
export async function addPenjualanItem(
  token: string | undefined,
  noBJJual: string,
  item: PenjualanCreateItem,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ message?: string }>(
    `/penjualan/${encodeURIComponent(noBJJual)}/items`,
    t,
    {
      method: "POST",
      body: JSON.stringify({
        kodeKategori: item.kodeKategori,
        idJenis: item.idJenis,
        pcs: item.pcs,
      }),
    },
  );
  if (res.status < 200 || res.status >= 300) {
    throw new ApiRequestError(serverMsg(res.data, `Gagal menambah item (${res.status})`));
  }
}

/** PATCH /penjualan/:noBJJual/items — ubah pcs 1 baris (belum discan). */
export async function updatePenjualanItem(
  token: string | undefined,
  noBJJual: string,
  item: PenjualanCreateItem,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ message?: string }>(
    `/penjualan/${encodeURIComponent(noBJJual)}/items`,
    t,
    {
      method: "PATCH",
      body: JSON.stringify({
        kodeKategori: item.kodeKategori,
        idJenis: item.idJenis,
        pcs: item.pcs,
      }),
    },
  );
  if (res.status < 200 || res.status >= 300) {
    throw new ApiRequestError(serverMsg(res.data, `Gagal memperbarui item (${res.status})`));
  }
}

/** DELETE /penjualan/:noBJJual/items?kodeKategori=&idJenis= — hapus baris (belum discan). */
export async function deletePenjualanItem(
  token: string | undefined,
  noBJJual: string,
  kodeKategori: string,
  idJenis: number,
): Promise<void> {
  const t = requireToken(token);
  const qp = new URLSearchParams();
  qp.set("kodeKategori", kodeKategori);
  qp.set("idJenis", String(idJenis));
  const res = await apiFetchAuth<{ message?: string }>(
    `/penjualan/${encodeURIComponent(noBJJual)}/items?${qp.toString()}`,
    t,
    { method: "DELETE" },
  );
  if (res.status < 200 || res.status >= 300) {
    throw new ApiRequestError(serverMsg(res.data, `Gagal menghapus item (${res.status})`));
  }
}

/**
 * DELETE /penjualan/:noBJJual — hapus DO beserta seluruh label terkait
 * (BJJual_h, BJJualItem_d, BJJualScan_d, BarangJadiPartial; termasuk
 * kategori furniturewip & barangdagang). DateUsage pada label yang sudah
 * terpakai/dimatikan dikosongkan (NULL) agar aktif kembali. Cascade dilakukan backend dalam
 * satu transaksi; butuh permission penjualan:delete.
 */
export async function deletePenjualan(
  token: string | undefined,
  noBJJual: string,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ message?: string }>(
    `/penjualan/${encodeURIComponent(noBJJual)}`,
    t,
    { method: "DELETE" },
  );
  if (res.status === 403) {
    throw new ApiRequestError("Anda tidak punya akses menghapus Penjualan.");
  }
  if (res.status < 200 || res.status >= 300) {
    throw new ApiRequestError(serverMsg(res.data, `Gagal menghapus penjualan (${res.status})`));
  }
}
