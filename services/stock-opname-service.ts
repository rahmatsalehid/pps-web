import { ApiRequestError, apiFetchAuth } from "@/services/api";

export type SoOldRow = {
  noSO: string;
  tanggal: string;
  namaWarehouse: string;
  idWarehouses: number[];
  isBahanBaku: boolean;
  isWashing: boolean;
  isBonggolan: boolean;
  isCrusher: boolean;
  isBroker: boolean;
  isGilingan: boolean;
  isMixer: boolean;
  isFurnitureWIP: boolean;
  isBarangJadi: boolean;
  isReject: boolean;
  isAscend: boolean;
};

export type SoOldListPage = {
  data: SoOldRow[];
  total: number;
  page: number;
  limit: number;
};

export type SoOldListParams = {
  page: number;
  limit?: number;
  search?: string;
  isAscend?: 0 | 1;
};

export type SoOldLabelRow = {
  nomorLabel: string;
  labelType: string;
  jmlhSak: number;
  berat: number;
  blok: string | null;
  idLokasi: number | null;
  username: string | null;
  dateTimeScan: string | null;
};

export type SoOldLabelPageParams = {
  page: number;
  pageSize?: number;
  filterBy?: string;
  blok?: string | null;
  idLokasi?: number | null;
  search?: string;
};

export type SoOldAcuanPage = {
  data: SoOldLabelRow[];
  totalData: number;
  totalSak: number;
  totalBerat: number;
  totalLabelGlobal: number;
  totalSakGlobal: number;
  totalBeratGlobal: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
};

export type SoOldHasilPage = {
  data: SoOldLabelRow[];
  totalData: number;
  totalSak: number;
  totalBerat: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
};

export type SoOldFamily = {
  noSO: string;
  categoryId: number;
  familyId: number;
  familyName: string;
  totalItem: number;
  completeItem: number;
};

export type SoOldAscendItem = {
  noSO: string;
  itemID: number;
  itemCode: string;
  shelfCode: string | null;
  itemName: string;
  pcs: number;
  qtyFisik: number | null;
  qtyUsage: number | null;
  usageRemark: string;
  isUpdateUsage: boolean;
};

export type SoOldAscendSaveEntry = {
  itemId: number;
  qtyFound: number | null;
  qtyUsage: number | null;
  usageRemark: string;
  isUpdateUsage: boolean;
};

export type SoOldLokasi = {
  idLokasi: number;
  blok: string;
  enable: boolean;
};

export type SoOldLabelDetail = {
  labelType: string | null;
  nomorLabel: string | null;
  namaJenisPlastik: string | null;
  namaWarehouse: string | null;
  keterangan: string | null;
  berat: number | null;
  jumlahSak: number | null;
  totalBerat: number | null;
  moisture: number | null;
  meltingIndex: number | null;
  elasticity: number | null;
  tenggelam: boolean | null;
  namaCrusher: string | null;
  namaBonggolan: string | null;
  namaGilingan: string | null;
  namaMixer: string | null;
  namaFurnitureWIP: string | null;
  namaBJ: string | null;
  namaReject: string | null;
  pcs: number | null;
  isPartial: boolean | null;
  dateCreate: string | null;
  idLokasi: string | null;
};

function requireToken(token: string | undefined): string {
  if (!token) throw new ApiRequestError("Tidak terautentikasi");
  return token;
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}

function asList(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function str(v: unknown): string {
  return v == null ? "" : String(v);
}

function strOrNull(v: unknown): string | null {
  const s = str(v).trim();
  return s ? s : null;
}

function num(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (v == null || v === "") return fallback;
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

function int(v: unknown, fallback = 0): number {
  return Math.trunc(num(v, fallback));
}

function bool(v: unknown): boolean {
  return v === true || v === 1 || v === "1";
}

function errMsg(body: unknown, fallback: string): string {
  const rec = asRecord(body);
  return str(rec.message) || fallback;
}

async function v1Fetch<T>(
  path: string,
  token: string,
  fallback: string,
  init?: RequestInit,
  okStatuses: number[] = [200],
): Promise<T> {
  const res = await apiFetchAuth<unknown>(path, token, init);
  if (!okStatuses.includes(res.status)) {
    throw new ApiRequestError(errMsg(res.data, fallback));
  }
  return res.data as T;
}

export function parseSoOldRow(v: unknown): SoOldRow {
  const rec = asRecord(v);
  const wids = str(rec.IdWarehouse)
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0);
  return {
    noSO: str(rec.NoSO),
    tanggal: str(rec.Tanggal),
    namaWarehouse: str(rec.NamaWarehouse) || "-",
    idWarehouses: wids,
    isBahanBaku: bool(rec.IsBahanBaku),
    isWashing: bool(rec.IsWashing),
    isBonggolan: bool(rec.IsBonggolan),
    isCrusher: bool(rec.IsCrusher),
    isBroker: bool(rec.IsBroker),
    isGilingan: bool(rec.IsGilingan),
    isMixer: bool(rec.IsMixer),
    isFurnitureWIP: bool(rec.IsFurnitureWIP),
    isBarangJadi: bool(rec.IsBarangJadi),
    isReject: bool(rec.IsReject),
    isAscend: bool(rec.IsAscend),
  };
}

function parseLabelRow(v: unknown): SoOldLabelRow {
  const rec = asRecord(v);
  const idRaw = rec.IdLokasi ?? rec.idLokasi ?? rec.idlokasi;
  let idLokasi: number | null = null;
  if (idRaw != null && String(idRaw).trim() !== "" && String(idRaw) !== "0") {
    const n = parseInt(String(idRaw), 10);
    idLokasi = Number.isFinite(n) ? n : null;
  }
  return {
    nomorLabel: str(rec.nomorLabel ?? rec.NomorLabel),
    labelType: str(rec.labelType ?? rec.LabelType),
    jmlhSak: int(rec.jmlhSak ?? rec.JmlhSak ?? rec.Pcs),
    berat: num(rec.berat ?? rec.Berat),
    blok: strOrNull(rec.Blok ?? rec.blok),
    idLokasi,
    username: strOrNull(rec.username ?? rec.Username),
    dateTimeScan: strOrNull(rec.DateTimeScan),
  };
}

export async function fetchSoOldList(
  token: string | undefined,
  params: SoOldListParams,
): Promise<SoOldListPage> {
  const t = requireToken(token);
  const query = [
    `page=${params.page}`,
    `limit=${params.limit ?? 10}`,
  ];
  const search = params.search?.trim();
  if (search) query.push(`search=${encodeURIComponent(search)}`);
  if (params.isAscend !== undefined) query.push(`isAscend=${params.isAscend}`);
  const raw = await v1Fetch<unknown>(
    `/no-stock-opname?${query.join("&")}`,
    t,
    "Gagal memuat data Stock Opname",
  );
  const rec = asRecord(raw);
  return {
    data: asList(rec.data).map(parseSoOldRow),
    total: int(rec.total),
    page: int(rec.page, params.page),
    limit: int(rec.limit, params.limit ?? 10),
  };
}

export async function fetchSoOldByNo(
  token: string | undefined,
  noSO: string,
): Promise<SoOldRow | null> {
  const page = await fetchSoOldList(token, {
    page: 1,
    limit: 20,
    search: noSO,
  });
  return page.data.find((row) => row.noSO === noSO) ?? null;
}

function labelQuery(params: SoOldLabelPageParams): string {
  const query = [
    `page=${params.page}`,
    `pageSize=${params.pageSize ?? 50}`,
    `filterBy=${encodeURIComponent(params.filterBy?.trim() || "all")}`,
  ];
  if (params.blok) query.push(`blok=${encodeURIComponent(params.blok)}`);
  if (params.idLokasi) query.push(`idLokasi=${params.idLokasi}`);
  const search = params.search?.trim();
  if (search) query.push(`search=${encodeURIComponent(search)}`);
  return query.join("&");
}

export async function fetchSoOldAcuan(
  token: string | undefined,
  noSO: string,
  params: SoOldLabelPageParams,
): Promise<SoOldAcuanPage> {
  const t = requireToken(token);
  const raw = await v1Fetch<unknown>(
    `/no-stock-opname/${encodeURIComponent(noSO)}/acuan?${labelQuery(params)}`,
    t,
    "Gagal memuat data acuan",
  );
  const rec = asRecord(raw);
  const totalData = int(rec.totalData);
  return {
    data: asList(rec.data).map(parseLabelRow),
    totalData,
    totalSak: int(rec.totalSak),
    totalBerat: num(rec.totalBerat),
    totalLabelGlobal: int(rec.totalLabelGlobal),
    totalSakGlobal: int(rec.totalSakGlobal),
    totalBeratGlobal: num(rec.totalBeratGlobal),
    currentPage: int(rec.currentPage, params.page),
    pageSize: int(rec.pageSize, params.pageSize ?? 50),
    totalPages: int(rec.totalPages, Math.ceil(totalData / (params.pageSize ?? 50))),
  };
}

export async function fetchSoOldHasil(
  token: string | undefined,
  noSO: string,
  params: SoOldLabelPageParams,
): Promise<SoOldHasilPage> {
  const t = requireToken(token);
  const raw = await v1Fetch<unknown>(
    `/no-stock-opname/${encodeURIComponent(noSO)}/hasil?${labelQuery(params)}`,
    t,
    "Gagal memuat hasil scan",
  );
  const rec = asRecord(raw);
  const totalData = int(rec.totalData);
  return {
    data: asList(rec.data).map(parseLabelRow),
    totalData,
    totalSak: int(rec.totalSak),
    totalBerat: num(rec.totalBerat),
    currentPage: int(rec.currentPage, params.page),
    pageSize: int(rec.pageSize, params.pageSize ?? 50),
    totalPages: int(rec.totalPages, Math.ceil(totalData / (params.pageSize ?? 50))),
  };
}

export async function deleteSoOldHasil(
  token: string | undefined,
  noSO: string,
  nomorLabel: string,
): Promise<void> {
  const t = requireToken(token);
  await v1Fetch<unknown>(
    `/no-stock-opname/${encodeURIComponent(noSO)}/hasil`,
    t,
    "Gagal menghapus label",
    {
      method: "DELETE",
      body: JSON.stringify({ nomorLabel }),
    },
  );
}

export async function fetchSoOldFamilies(
  token: string | undefined,
  noSO: string,
): Promise<SoOldFamily[]> {
  const t = requireToken(token);
  const raw = await v1Fetch<unknown>(
    `/no-stock-opname/${encodeURIComponent(noSO)}/families`,
    t,
    "Family Stock Opname tidak ditemukan",
    undefined,
    [200, 404],
  );
  if (Array.isArray(raw)) {
    return raw.map((v) => {
      const rec = asRecord(v);
      return {
        noSO: str(rec.NoSO),
        categoryId: int(rec.CategoryID),
        familyId: int(rec.FamilyID),
        familyName: str(rec.FamilyName),
        totalItem: int(rec.TotalItem),
        completeItem: int(rec.CompleteItem),
      };
    });
  }
  const rec = asRecord(raw);
  return asList(rec.data).map((v) => {
    const item = asRecord(v);
    return {
      noSO: str(item.NoSO),
      categoryId: int(item.CategoryID),
      familyId: int(item.FamilyID),
      familyName: str(item.FamilyName),
      totalItem: int(item.TotalItem),
      completeItem: int(item.CompleteItem),
    };
  });
}

export async function fetchSoOldAscendItems(
  token: string | undefined,
  noSO: string,
  familyID: number,
  keyword = "",
): Promise<SoOldAscendItem[]> {
  const t = requireToken(token);
  const query = keyword ? `?keyword=${encodeURIComponent(keyword)}` : "";
  const raw = await v1Fetch<unknown>(
    `/no-stock-opname/${encodeURIComponent(noSO)}/families/${familyID}/ascend${query}`,
    t,
    "Gagal memuat data ascend",
  );
  const list = Array.isArray(raw) ? raw : asList(asRecord(raw).data);
  return list.map((v) => {
    const rec = asRecord(v);
    return {
      noSO: str(rec.NoSO),
      itemID: int(rec.ItemID),
      itemCode: str(rec.ItemCode),
      shelfCode: strOrNull(rec.ShelfCode),
      itemName: str(rec.ItemName),
      pcs: num(rec.Pcs),
      qtyFisik: rec.QtyFisik == null ? null : num(rec.QtyFisik),
      qtyUsage: rec.QtyUsage == null ? null : num(rec.QtyUsage),
      usageRemark: str(rec.UsageRemark),
      isUpdateUsage: bool(rec.IsUpdateUsage),
    };
  });
}

export async function saveSoOldAscend(
  token: string | undefined,
  noSO: string,
  dataList: SoOldAscendSaveEntry[],
): Promise<void> {
  const t = requireToken(token);
  await v1Fetch<unknown>(
    `/no-stock-opname/${encodeURIComponent(noSO)}/ascend/hasil`,
    t,
    "Gagal menyimpan data",
    {
      method: "POST",
      body: JSON.stringify({ dataList }),
    },
  );
}

export async function deleteSoOldAscendItem(
  token: string | undefined,
  noSO: string,
  itemID: number,
): Promise<void> {
  const t = requireToken(token);
  await v1Fetch<unknown>(
    `/no-stock-opname/${encodeURIComponent(noSO)}/ascend/hasil/${itemID}`,
    t,
    "Gagal menghapus item",
    { method: "DELETE" },
  );
}

export async function fetchSoOldUsage(
  token: string | undefined,
  itemID: number,
  tglSO: string,
  idWarehouses: number[],
): Promise<number> {
  const t = requireToken(token);
  const wids = idWarehouses.filter((w) => w > 0).join(",");
  if (!wids) throw new ApiRequestError("wids kosong");
  const raw = await v1Fetch<unknown>(
    `/no-stock-opname/${itemID}/usage/${encodeURIComponent(tglSO)}/${encodeURIComponent(wids)}`,
    t,
    "Gagal ambil usage",
  );
  return num(asRecord(raw).qtyUsage);
}

export async function fetchSoOldLokasi(
  token: string | undefined,
): Promise<SoOldLokasi[]> {
  const t = requireToken(token);
  const raw = await v1Fetch<{ data?: unknown }>(
    "/mst-lokasi",
    t,
    "Gagal mengambil lokasi",
  );
  const rec = asRecord(raw);
  if (!Array.isArray(rec.data)) return [];
  return asList(rec.data).map((v) => {
    const item = asRecord(v);
    return {
      idLokasi: int(item.IdLokasi),
      blok: str(item.Blok),
      enable: item.Enable == null ? true : bool(item.Enable),
    };
  });
}

export async function fetchSoOldLabelDetail(
  token: string | undefined,
  nomorLabel: string,
): Promise<SoOldLabelDetail> {
  const t = requireToken(token);
  const raw = await v1Fetch<{ success?: boolean; data?: unknown; message?: string }>(
    `/label/detail/${encodeURIComponent(nomorLabel)}`,
    t,
    "Data tidak ditemukan",
    undefined,
    [200, 404],
  );
  if (!raw || raw.success !== true || raw.data == null) {
    throw new ApiRequestError("Data tidak ditemukan");
  }
  const rec = asRecord(raw.data);
  return {
    labelType: strOrNull(rec.LabelType),
    nomorLabel: strOrNull(rec.NomorLabel),
    namaJenisPlastik: strOrNull(rec.NamaJenisPlastik),
    namaWarehouse: strOrNull(rec.NamaWarehouse),
    keterangan: strOrNull(rec.Keterangan),
    berat: rec.Berat == null ? (rec.TotalBerat == null ? null : num(rec.TotalBerat)) : num(rec.Berat),
    jumlahSak: rec.JumlahSak == null ? null : int(rec.JumlahSak),
    totalBerat: rec.TotalBerat == null ? null : num(rec.TotalBerat),
    moisture: rec.Moisture == null ? null : num(rec.Moisture),
    meltingIndex: rec.MeltingIndex == null ? null : num(rec.MeltingIndex),
    elasticity: rec.Elasticity == null ? null : num(rec.Elasticity),
    tenggelam: rec.Tenggelam == null ? null : bool(rec.Tenggelam),
    namaCrusher: strOrNull(rec.NamaCrusher),
    namaBonggolan: strOrNull(rec.NamaBonggolan),
    namaGilingan: strOrNull(rec.NamaGilingan),
    namaMixer: strOrNull(rec.NamaMixer),
    namaFurnitureWIP: strOrNull(rec.Nama),
    namaBJ: strOrNull(rec.NamaBJ),
    namaReject: strOrNull(rec.NamaReject),
    pcs: rec.Pcs == null ? null : int(rec.Pcs),
    isPartial:
      rec.IsPartial == null
        ? null
        : rec.IsPartial === true || bool(rec.IsPartial),
    dateCreate: strOrNull(rec.DateCreate),
    idLokasi: strOrNull(rec.IdLokasi),
  };
}
