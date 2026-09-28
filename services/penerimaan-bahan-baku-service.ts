import { apiFetchAuth, ApiRequestError } from "@/services/api";

export type PbbTim = {
  idTim: number;
  namaTim: string;
  aktif: boolean;
  noPenerimaan: string | null;
  tglPenerimaan: string | null;
  isComplete: boolean;
  /** punya penerimaan berjalan (belum selesai) */
  isActive: boolean;
};

export type PbbRiwayat = {
  noPenerimaan: string;
  tglPenerimaan: string | null;
  idTim: number;
  namaTim: string;
  createBy: string | null;
  dateTimeCreate: string | null;
  isComplete: boolean;
  tglComplete: string | null;
  noBahanBaku: string | null;
  jumlahPallet: number;
  totalBerat: number;
};

export type PbbBatch = {
  noBahanBaku: string;
  idSupplier: number;
  namaSupplier: string;
  noPlat: string | null;
};

export type PbbOutput = {
  noBahanBaku: string;
  noPallet: number;
  noSak: number;
  idJenisPlastik: number | null;
  namaJenisPlastik: string | null;
  berat: number;
};

export type PbbDetail = {
  header: PbbRiwayat;
  batches: PbbBatch[];
  outputs: PbbOutput[];
};

export type FetchPbbListParams = {
  page?: number;
  pageSize?: number;
  filter?: string;
  kodeKategori?: string;
};

export type FetchPbbListResult = {
  items: PbbRiwayat[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function requireToken(token: string | undefined): string {
  if (!token) throw new ApiRequestError("Tidak terautentikasi");
  return token;
}

function asStr(v: unknown): string {
  return v == null ? "" : String(v);
}

function asInt(v: unknown, fallback = 0): number {
  if (v == null || v === "") return fallback;
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function asFloat(v: unknown, fallback = 0): number {
  if (v == null || v === "") return fallback;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

function asBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    return s === "true" || s === "1";
  }
  return false;
}

function asStrOrNull(v: unknown): string | null {
  const s = asStr(v).trim();
  return s ? s : null;
}

function errMsg(e: unknown, fallback: string): string {
  if (e instanceof ApiRequestError) return e.message;
  if (e instanceof Error) return e.message.replace(/^Exception:\s*/, "");
  return fallback;
}

async function expectOk(
  status: number,
  data: { success?: boolean; message?: string } | null,
  fallback: string,
): Promise<void> {
  if (status >= 200 && status < 300 && (!data || data.success !== false)) {
    return;
  }
  throw new ApiRequestError(errMsg(data, fallback));
}

function parseRiwayat(j: Record<string, unknown>): PbbRiwayat {
  return {
    noPenerimaan: asStr(j["NoPenerimaan"] ?? j["noPenerimaan"]),
    tglPenerimaan: asStrOrNull(j["TglPenerimaan"] ?? j["tglPenerimaan"]),
    idTim: asInt(j["IdTim"] ?? j["idTim"]),
    namaTim: asStr(j["NamaTim"] ?? j["namaTim"]),
    createBy: asStrOrNull(j["CreateBy"] ?? j["createBy"]),
    dateTimeCreate: asStrOrNull(j["DateTimeCreate"] ?? j["dateTimeCreate"]),
    isComplete: asBool(j["IsComplete"] ?? j["isComplete"]),
    tglComplete: asStrOrNull(j["TglComplete"] ?? j["tglComplete"]),
    noBahanBaku: asStrOrNull(j["NoBahanBaku"] ?? j["noBahanBaku"]),
    jumlahPallet: asInt(j["JumlahPallet"] ?? j["jumlahPallet"]),
    totalBerat: asFloat(j["TotalBerat"] ?? j["totalBerat"]),
  };
}

function parseTim(j: Record<string, unknown>): PbbTim {
  const noPenerimaan = asStrOrNull(j["NoPenerimaan"]);
  const isComplete = asBool(j["IsComplete"]);
  return {
    idTim: asInt(j["IdTim"]),
    namaTim: asStr(j["NamaTim"]),
    aktif: asBool(j["Aktif"]),
    noPenerimaan,
    tglPenerimaan: asStrOrNull(j["TglPenerimaan"]),
    isComplete,
    isActive: Boolean(noPenerimaan) && !isComplete,
  };
}

function parseBatch(j: Record<string, unknown>): PbbBatch {
  return {
    noBahanBaku: asStr(j["NoBahanBaku"]),
    idSupplier: asInt(j["IdSupplier"]),
    namaSupplier: asStr(j["NamaSupplier"]),
    noPlat: asStrOrNull(j["NoPlat"]),
  };
}

function parseOutput(j: Record<string, unknown>): PbbOutput {
  return {
    noBahanBaku: asStr(j["NoBahanBaku"]),
    noPallet: asInt(j["NoPallet"]),
    noSak: asInt(j["NoSak"]),
    idJenisPlastik:
      j["IdJenisPlastik"] == null ? null : asInt(j["IdJenisPlastik"]),
    namaJenisPlastik: asStrOrNull(j["NamaJenisPlastik"]),
    berat: asFloat(j["Berat"]),
  };
}

export async function fetchPbbTimStatus(
  token: string | undefined,
): Promise<PbbTim[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: unknown;
  }>("/penerimaan-bahan-baku/tim-status", t);
  await expectOk(res.status, res.data, "Gagal memuat status tim");
  const rows = Array.isArray(res.data.data) ? res.data.data : [];
  return rows.map((r) => parseTim(r as Record<string, unknown>));
}

export async function fetchPbbList(
  token: string | undefined,
  params: FetchPbbListParams = {},
): Promise<FetchPbbListResult> {
  const t = requireToken(token);
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.max(1, params.pageSize ?? 30);
  const filter = (params.filter ?? "").trim();
  const kodeKategori = (params.kodeKategori ?? "").trim();
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (filter) query.set("filter", filter);
  if (kodeKategori) query.set("kodeKategori", kodeKategori);

  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: unknown;
    totalData?: number;
    meta?: { page?: number; totalPages?: number };
  }>(`/penerimaan-bahan-baku?${query.toString()}`, t);
  await expectOk(res.status, res.data, "Gagal memuat riwayat penerimaan");

  const rows = Array.isArray(res.data.data) ? res.data.data : [];
  const total = asInt(res.data.totalData);
  const meta = res.data.meta ?? {};
  const currentPage = asInt(meta.page, page) || page;
  const totalPages = asInt(meta.totalPages, 1) || 1;
  return {
    items: rows.map((r) => parseRiwayat(r as Record<string, unknown>)),
    total,
    page: currentPage,
    pageSize,
    totalPages,
  };
}

export async function fetchPbbDetail(
  token: string | undefined,
  noPenerimaan: string,
): Promise<PbbDetail> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>(`/penerimaan-bahan-baku/${encodeURIComponent(noPenerimaan)}`, t);
  await expectOk(res.status, res.data, "Gagal memuat detail penerimaan");
  const data = res.data.data;
  if (!data) throw new ApiRequestError("Data penerimaan tidak ditemukan");
  const batchesRaw = Array.isArray(data["batches"]) ? data["batches"] : [];
  const outputsRaw = Array.isArray(data["outputs"]) ? data["outputs"] : [];
  return {
    header: parseRiwayat(data),
    batches: batchesRaw.map((r) => parseBatch(r as Record<string, unknown>)),
    outputs: outputsRaw.map((r) => parseOutput(r as Record<string, unknown>)),
  };
}

export async function createPbbHeader(
  token: string | undefined,
  payload: { tglPenerimaan: string; idTim: number },
): Promise<string> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>("/penerimaan-bahan-baku", t, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  await expectOk(res.status, res.data, "Gagal membuat penerimaan");
  const noPenerimaan = asStrOrNull(res.data.data?.["noPenerimaan"]);
  if (!noPenerimaan) {
    throw new ApiRequestError("Response create header penerimaan tidak valid");
  }
  return noPenerimaan;
}

export async function deletePbb(
  token: string | undefined,
  noPenerimaan: string,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ success?: boolean; message?: string }>(
    `/penerimaan-bahan-baku/${encodeURIComponent(noPenerimaan)}`,
    t,
    { method: "DELETE" },
  );
  await expectOk(res.status, res.data, "Gagal menghapus penerimaan");
}

export async function completePbb(
  token: string | undefined,
  noPenerimaan: string,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ success?: boolean; message?: string }>(
    `/penerimaan-bahan-baku/${encodeURIComponent(noPenerimaan)}/complete`,
    t,
    { method: "PATCH" },
  );
  await expectOk(res.status, res.data, "Gagal menandai selesai");
}
