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
  keterangan: string | null;
  hasBeenPrinted: number;
  /** hasil QC pallet (null = belum diisi) */
  moisture: number | null;
  meltingIndex: number | null;
  elasticity: number | null;
  tenggelam: number | null;
  density: number | null;
  density2: number | null;
  density3: number | null;
  /** berat tersimpan (setelah potongan) */
  berat: number;
  /** berat asli timbangan; null untuk data dari tablet */
  beratAct: number | null;
  isLembab: boolean;
  /** terisi bila sak sudah terpakai di proses lain */
  dateUsage: string | null;
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

async function expectOk(
  status: number,
  data: { success?: boolean; message?: string } | null,
  fallback: string,
): Promise<void> {
  if (status >= 200 && status < 300 && (!data || data.success !== false)) {
    return;
  }
  throw new ApiRequestError(data?.message?.trim() || fallback);
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
    keterangan: asStrOrNull(j["Keterangan"]),
    hasBeenPrinted: asInt(j["HasBeenPrinted"]),
    moisture: asFloatOrNull(j["Moisture"]),
    meltingIndex: asFloatOrNull(j["MeltingIndex"]),
    elasticity: asFloatOrNull(j["Elasticity"]),
    tenggelam: asFloatOrNull(j["Tenggelam"]),
    density: asFloatOrNull(j["Density"]),
    density2: asFloatOrNull(j["Density2"]),
    density3: asFloatOrNull(j["Density3"]),
    berat: asFloat(j["Berat"]),
    beratAct: asFloatOrNull(j["BeratAct"]),
    isLembab: asBool(j["IsLembab"]),
    dateUsage: asStrOrNull(j["DateUsage"]),
  };
}

function asFloatOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = asFloat(v, Number.NaN);
  return Number.isFinite(n) ? n : null;
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

export type PbbKodeKategori = "bahanbaku" | "bahanbakupakai";

export type PbbFormOptions = {
  suppliers: { idSupplier: number; namaSupplier: string }[];
  jenis: { idBB: number; nama: string }[];
  maxSak: number;
};

/**
 * Aturan potongan berat supplier (sama seperti form VB):
 * - "tetap": persen tetap dari MstSupplier.Potongan
 * - "acak": persen diundi bilangan bulat lower..upper lalu dibagi 10
 * disableMinMaxIds: jenis dengan MstBahanBaku.IsDisableMinMax = 1
 * (potongan dilewati untuk jenis ini).
 */
export type PbbPotongan =
  | { mode: "tetap"; percent: number; disableMinMaxIds: number[] }
  | { mode: "acak"; lower: number; upper: number; disableMinMaxIds: number[] };

export type PbbSakPayload = {
  noSak: number;
  /** berat tersimpan (setelah potongan) */
  berat: number;
  /** berat asli timbangan */
  beratAct: number;
  isLembab: boolean;
};

export type PbbAddPalletsPayload = {
  idSupplier: number;
  noPlat: string;
  kodeKategori: PbbKodeKategori;
  pallets: {
    idJenisPlastik: number;
    keterangan: string | null;
    saks: PbbSakPayload[];
  }[];
};

export async function fetchPbbFormOptions(
  token: string | undefined,
  kodeKategori: PbbKodeKategori,
): Promise<PbbFormOptions> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>(
    `/penerimaan-bahan-baku/form-options?kodeKategori=${encodeURIComponent(kodeKategori)}`,
    t,
  );
  await expectOk(res.status, res.data, "Gagal memuat opsi form");
  const d = res.data.data ?? {};
  const suppliers = Array.isArray(d["suppliers"]) ? d["suppliers"] : [];
  const jenis = Array.isArray(d["jenis"]) ? d["jenis"] : [];
  return {
    suppliers: suppliers.map((r) => {
      const j = r as Record<string, unknown>;
      return { idSupplier: asInt(j["IdSupplier"]), namaSupplier: asStr(j["NamaSupplier"]) };
    }),
    jenis: jenis.map((r) => {
      const j = r as Record<string, unknown>;
      return { idBB: asInt(j["IdBB"]), nama: asStr(j["Nama"]) };
    }),
    maxSak: asInt(d["maxSak"]),
  };
}

export async function fetchPbbPotongan(
  token: string | undefined,
  idSupplier: number,
): Promise<PbbPotongan> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>(`/penerimaan-bahan-baku/potongan/${idSupplier}`, t);
  await expectOk(res.status, res.data, "Gagal memuat aturan potongan supplier");
  const d = res.data.data ?? {};
  const disableMinMaxIds = Array.isArray(d["disableMinMaxIds"])
    ? d["disableMinMaxIds"]
        .map((v) => Number(v))
        .filter((n) => Number.isInteger(n))
    : [];
  if (asStr(d["mode"]) === "tetap") {
    return { mode: "tetap", percent: asFloat(d["percent"]), disableMinMaxIds };
  }
  return {
    mode: "acak",
    lower: asInt(d["lower"]),
    upper: asInt(d["upper"]),
    disableMinMaxIds,
  };
}

export async function addPbbPallets(
  token: string | undefined,
  noPenerimaan: string,
  payload: PbbAddPalletsPayload,
): Promise<{ noBahanBaku: string }> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>(`/penerimaan-bahan-baku/${encodeURIComponent(noPenerimaan)}/pallets`, t, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  await expectOk(res.status, res.data, "Gagal menyimpan pallet");
  return { noBahanBaku: asStr(res.data.data?.["noBahanBaku"]) };
}

function palletPath(noPenerimaan: string, noBahanBaku: string, noPallet: number): string {
  return `/penerimaan-bahan-baku/${encodeURIComponent(noPenerimaan)}/pallets/${encodeURIComponent(noBahanBaku)}/${noPallet}`;
}

export async function updatePbbPallet(
  token: string | undefined,
  noPenerimaan: string,
  noBahanBaku: string,
  noPallet: number,
  payload: { idJenisPlastik: number; keterangan: string | null },
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ success?: boolean; message?: string }>(
    palletPath(noPenerimaan, noBahanBaku, noPallet),
    t,
    { method: "PATCH", body: JSON.stringify(payload) },
  );
  await expectOk(res.status, res.data, "Gagal mengubah pallet");
}

export async function deletePbbPallet(
  token: string | undefined,
  noPenerimaan: string,
  noBahanBaku: string,
  noPallet: number,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ success?: boolean; message?: string }>(
    palletPath(noPenerimaan, noBahanBaku, noPallet),
    t,
    { method: "DELETE" },
  );
  await expectOk(res.status, res.data, "Gagal menghapus pallet");
}

export async function addPbbSaks(
  token: string | undefined,
  noPenerimaan: string,
  noBahanBaku: string,
  noPallet: number,
  saks: { berat: number; beratAct: number; isLembab: boolean }[],
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ success?: boolean; message?: string }>(
    `${palletPath(noPenerimaan, noBahanBaku, noPallet)}/saks`,
    t,
    { method: "POST", body: JSON.stringify({ saks }) },
  );
  await expectOk(res.status, res.data, "Gagal menambah sak");
}

export async function deletePbbSak(
  token: string | undefined,
  noPenerimaan: string,
  noBahanBaku: string,
  noPallet: number,
  noSak: number,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ success?: boolean; message?: string }>(
    `${palletPath(noPenerimaan, noBahanBaku, noPallet)}/saks/${noSak}`,
    t,
    { method: "DELETE" },
  );
  await expectOk(res.status, res.data, "Gagal menghapus sak");
}

export type PbbQcPayload = {
  Moisture: number | null;
  MeltingIndex: number | null;
  Elasticity: number | null;
  Tenggelam: number | null;
  Density: number | null;
  Density2: number | null;
  Density3: number | null;
};

/** PUT /labels/bahan-baku/:nobahanbaku/pallet/:nopallet — hasil QC pallet. */
export async function updatePbbQc(
  token: string | undefined,
  noBahanBaku: string,
  noPallet: number,
  qc: PbbQcPayload,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ success?: boolean; message?: string }>(
    `/labels/bahan-baku/${encodeURIComponent(noBahanBaku)}/pallet/${noPallet}`,
    t,
    { method: "PUT", body: JSON.stringify({ header: qc }) },
  );
  await expectOk(res.status, res.data, "Gagal menyimpan hasil QC");
}

export type PbbLaporanRow = {
  noBahanBaku: string;
  dateCreate: string | null;
  noPlat: string | null;
  namaSupplier: string | null;
  jenis: string | null;
  noPallet: number;
  kondisi: string;
  jumlahSak: number;
  beratTimbangan: number;
  berat: number;
};

export async function fetchPbbLaporan(
  token: string | undefined,
  noPenerimaan: string,
): Promise<PbbLaporanRow[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: { perPallet?: unknown };
  }>(`/penerimaan-bahan-baku/${encodeURIComponent(noPenerimaan)}/laporan`, t);
  await expectOk(res.status, res.data, "Gagal memuat laporan");
  const rows = Array.isArray(res.data.data?.perPallet) ? res.data.data.perPallet : [];
  return rows.map((r) => {
    const j = r as Record<string, unknown>;
    return {
      noBahanBaku: asStr(j["NoBahanBaku"]),
      dateCreate: asStrOrNull(j["DateCreate"]),
      noPlat: asStrOrNull(j["NoPlat"]),
      namaSupplier: asStrOrNull(j["NamaSupplier"]),
      jenis: asStrOrNull(j["Jenis"]),
      noPallet: asInt(j["NoPallet"]),
      kondisi: asStr(j["Kondisi"]),
      jumlahSak: asInt(j["JumlahSak"]),
      beratTimbangan: asFloat(j["BeratTimbangan"]),
      berat: asFloat(j["Berat"]),
    };
  });
}
