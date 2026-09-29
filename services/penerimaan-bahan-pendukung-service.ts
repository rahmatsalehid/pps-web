import { getBackendBaseUrl, apiFetchAuth, ApiRequestError } from "@/services/api";

export type PbpTim = {
  idTim: number;
  namaTim: string;
  aktif: boolean;
  noPenerimaan: string | null;
  tglPenerimaan: string | null;
  isComplete: boolean;
  createBy: string | null;
  jumlahItem: number;
  /** punya penerimaan berjalan (belum selesai) */
  isActive: boolean;
};

export type PbpRiwayat = {
  noPenerimaan: string;
  tglPenerimaan: string | null;
  idTim: number;
  namaTim: string;
  isComplete: boolean;
  createBy: string | null;
  tglComplete: string | null;
  jumlahItem: number;
  totalQty: number;
};

export type PbpItem = {
  noPenerimaan: string;
  noBahanPendukung: string;
  idSupplier: number;
  namaSupplier: string;
  idCabinetMaterial: number;
  namaBarang: string;
  qty: number;
  keterangan: string | null;
  hasBeenPrinted: number;
};

export type PbpDetail = {
  header: PbpRiwayat;
  items: PbpItem[];
};

export type PbpBarangMaster = {
  idCabinetMaterial: number;
  nama: string;
  itemCode: string | null;
  namaUOM: string | null;
  saldoAkhir: number;
};

export type PbpSupplier = {
  idSupplier: number;
  namaSupplier: string;
};

export type PbpItemInput = {
  idSupplier: number;
  idCabinetMaterial: number;
  qty: number;
  keterangan?: string;
};

export type FetchPbpListParams = {
  page?: number;
  pageSize?: number;
  filter?: string;
};

export type FetchPbpListResult = {
  items: PbpRiwayat[];
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

function parseHeader(j: Record<string, unknown>): PbpRiwayat {
  return {
    noPenerimaan: asStr(j["NoPenerimaan"] ?? j["noPenerimaan"]),
    tglPenerimaan: asStrOrNull(j["TglPenerimaan"] ?? j["tglPenerimaan"]),
    idTim: asInt(j["IdTim"] ?? j["idTim"]),
    namaTim: asStr(j["NamaTim"] ?? j["namaTim"]),
    isComplete: asBool(j["IsComplete"] ?? j["isComplete"]),
    createBy: asStrOrNull(j["CreateBy"] ?? j["createBy"]),
    tglComplete: asStrOrNull(j["TglComplete"] ?? j["tglComplete"]),
    jumlahItem: asInt(j["JumlahItem"] ?? j["jumlahItem"]),
    totalQty: asFloat(j["TotalQty"] ?? j["totalQty"]),
  };
}

function parseTim(j: Record<string, unknown>): PbpTim {
  const noPenerimaan = asStrOrNull(j["NoPenerimaan"]);
  const isComplete = asBool(j["IsComplete"]);
  return {
    idTim: asInt(j["IdTim"]),
    namaTim: asStr(j["NamaTim"]),
    aktif: asBool(j["Aktif"]),
    noPenerimaan,
    tglPenerimaan: asStrOrNull(j["TglPenerimaan"]),
    isComplete,
    createBy: asStrOrNull(j["CreateBy"]),
    jumlahItem: asInt(j["JumlahItem"]),
    isActive: Boolean(noPenerimaan) && !isComplete,
  };
}

function parseItem(j: Record<string, unknown>): PbpItem {
  return {
    noPenerimaan: asStr(j["NoPenerimaan"]),
    noBahanPendukung: asStr(j["NoBahanPendukung"]),
    idSupplier: asInt(j["IdSupplier"]),
    namaSupplier: asStr(j["NamaSupplier"]),
    idCabinetMaterial: asInt(j["IdCabinetMaterial"]),
    namaBarang: asStr(j["NamaCabinetMaterial"] ?? j["NamaBarang"]),
    qty: asFloat(j["Qty"]),
    keterangan: asStrOrNull(j["Keterangan"]),
    hasBeenPrinted: asInt(j["HasBeenPrinted"]),
  };
}

export async function fetchPbpTimStatus(
  token: string | undefined,
): Promise<PbpTim[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: unknown;
  }>("/penerimaan-bahan-pendukung/tim-status", t);
  await expectOk(res.status, res.data, "Gagal memuat status tim");
  const rows = Array.isArray(res.data.data) ? res.data.data : [];
  return rows.map((r) => parseTim(r as Record<string, unknown>));
}

export async function fetchPbpList(
  token: string | undefined,
  params: FetchPbpListParams = {},
): Promise<FetchPbpListResult> {
  const t = requireToken(token);
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.max(1, params.pageSize ?? 30);
  const filter = (params.filter ?? "").trim();
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (filter) query.set("filter", filter);

  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: unknown;
    totalData?: number;
    meta?: { page?: number; totalPages?: number };
  }>(`/penerimaan-bahan-pendukung?${query.toString()}`, t);
  await expectOk(res.status, res.data, "Gagal memuat riwayat penerimaan");

  const rows = Array.isArray(res.data.data) ? res.data.data : [];
  const total = asInt(res.data.totalData);
  const meta = res.data.meta ?? {};
  const currentPage = asInt(meta.page, page) || page;
  const totalPages = asInt(meta.totalPages, 1) || 1;
  return {
    items: rows.map((r) => parseHeader(r as Record<string, unknown>)),
    total,
    page: currentPage,
    pageSize,
    totalPages,
  };
}

export async function fetchPbpDetail(
  token: string | undefined,
  noPenerimaan: string,
): Promise<PbpDetail> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>(`/penerimaan-bahan-pendukung/${encodeURIComponent(noPenerimaan)}`, t);
  await expectOk(res.status, res.data, "Gagal memuat detail penerimaan");
  const data = res.data.data;
  if (!data) throw new ApiRequestError("Data penerimaan tidak ditemukan");
  const itemsRaw = Array.isArray(data["items"]) ? data["items"] : [];
  return {
    header: parseHeader(data),
    items: itemsRaw.map((r) => parseItem(r as Record<string, unknown>)),
  };
}

export async function createPbpHeader(
  token: string | undefined,
  payload: { tglPenerimaan: string; idTim: number },
): Promise<string> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>("/penerimaan-bahan-pendukung", t, {
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

export async function addPbpItems(
  token: string | undefined,
  noPenerimaan: string,
  items: PbpItemInput[],
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
  }>(
    `/penerimaan-bahan-pendukung/${encodeURIComponent(noPenerimaan)}/items`,
    t,
    {
      method: "POST",
      body: JSON.stringify({
        items: items.map((it) => ({
          idSupplier: it.idSupplier,
          idCabinetMaterial: it.idCabinetMaterial,
          qty: it.qty,
          ...(it.keterangan && it.keterangan.trim()
            ? { keterangan: it.keterangan.trim() }
            : {}),
        })),
      }),
    },
  );
  await expectOk(res.status, res.data, "Gagal menyimpan barang");
}

export async function deletePbp(
  token: string | undefined,
  noPenerimaan: string,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ success?: boolean; message?: string }>(
    `/penerimaan-bahan-pendukung/${encodeURIComponent(noPenerimaan)}`,
    t,
    { method: "DELETE" },
  );
  await expectOk(res.status, res.data, "Gagal menghapus penerimaan");
}

export async function completePbp(
  token: string | undefined,
  noPenerimaan: string,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ success?: boolean; message?: string }>(
    `/penerimaan-bahan-pendukung/${encodeURIComponent(noPenerimaan)}/complete`,
    t,
    { method: "PATCH" },
  );
  await expectOk(res.status, res.data, "Gagal menandai selesai");
}

export async function fetchPbpCabinetMaterials(
  token: string | undefined,
): Promise<PbpBarangMaster[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: unknown;
  }>("/mst-furniture-material/cabinet-materials?idWarehouse=5", t);
  await expectOk(res.status, res.data, "Gagal memuat data barang");
  const rows = Array.isArray(res.data.data) ? res.data.data : [];
  return rows.map((r) => {
    const j = r as Record<string, unknown>;
    return {
      idCabinetMaterial: asInt(j["IdCabinetMaterial"]),
      nama: asStr(j["Nama"]),
      itemCode: asStrOrNull(j["ItemCode"]),
      namaUOM: asStrOrNull(j["NamaUOM"]),
      saldoAkhir: asFloat(j["SaldoAkhir"]),
    };
  });
}

export async function fetchPbpSuppliers(
  token: string | undefined,
): Promise<PbpSupplier[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: unknown;
  }>("/mst/supplier?orderBy=NmSupplier&orderDir=ASC", t);
  await expectOk(res.status, res.data, "Gagal memuat data supplier");
  const rows = Array.isArray(res.data.data) ? res.data.data : [];
  return rows.map((r) => {
    const j = r as Record<string, unknown>;
    return {
      idSupplier: asInt(j["IdSupplier"] ?? j["idSupplier"]),
      namaSupplier: asStr(j["NamaSupplier"] ?? j["namaSupplier"]),
    };
  });
}

export async function deletePbpLabel(
  token: string | undefined,
  noBahanPendukung: string,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ success?: boolean; message?: string }>(
    `/labels/bahan-pendukung/${encodeURIComponent(noBahanPendukung)}`,
    t,
    { method: "DELETE" },
  );
  await expectOk(res.status, res.data, "Gagal menghapus barang");
}

export async function acquirePbpPrintLock(
  token: string | undefined,
  noLabel: string,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ message?: string }>(
    `/labels/${encodeURIComponent(noLabel)}/print-lock`,
    t,
    { method: "POST" },
  );
  if (res.status < 200 || res.status >= 300) {
    throw new ApiRequestError(
      res.data.message ?? `Gagal lock cetak (${res.status})`,
    );
  }
}

export async function releasePbpPrintLock(
  token: string | undefined,
  noLabel: string,
): Promise<void> {
  const t = requireToken(token);
  try {
    await apiFetchAuth(`/labels/${encodeURIComponent(noLabel)}/print-lock`, t, {
      method: "DELETE",
    });
  } catch {
    return;
  }
}

export async function fetchPbpLabelPdfBase64(
  token: string | undefined,
  noBahanPendukung: string,
): Promise<string> {
  const t = requireToken(token);
  const base = getBackendBaseUrl();
  const path = `/api/labels/bahan-pendukung/${encodeURIComponent(noBahanPendukung)}/pdf`;
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      headers: { Authorization: `Bearer ${t}` },
      cache: "no-store",
    });
  } catch (e) {
    throw new ApiRequestError("Tidak dapat terhubung ke server", { cause: e });
  }
  if (!response.ok) {
    let message = `Gagal ambil PDF (${response.status})`;
    try {
      const body = (await response.json()) as { message?: string };
      if (body?.message) message = body.message;
    } catch {
      message = `Gagal ambil PDF (${response.status})`;
    }
    throw new ApiRequestError(message);
  }
  const buf = Buffer.from(await response.arrayBuffer());
  return buf.toString("base64");
}

export async function markPbpLabelPrinted(
  token: string | undefined,
  noBahanPendukung: string,
): Promise<number | null> {
  const t = requireToken(token);
  const path = `/labels/bahan-pendukung/${encodeURIComponent(noBahanPendukung)}/print`;
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>(path, t, { method: "PATCH" });
  if (res.status !== 200 && res.status !== 204) {
    throw new ApiRequestError(
      res.data.message ?? `Gagal update cetak (${res.status})`,
    );
  }
  const count = Number(
    res.data.data?.["HasBeenPrinted"] ?? res.data.data?.["hasBeenPrinted"] ?? 0,
  );
  return Number.isFinite(count) ? count : null;
}
