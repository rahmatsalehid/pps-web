import { ApiRequestError, apiFetchAuth, getBackendBaseUrl } from "@/services/api";

export type SoStatus = "not_started" | "in_progress" | "completed";

export type SoWorkingUser = {
  idUsername: number;
  username: string;
  fullName: string | null;
};

export type SoWorkingLocation = {
  lokasi: string;
  description: string | null;
  users: SoWorkingUser[];
};

export type SoKategori = {
  categoryId: number;
  categoryCode: string;
  categoryName: string;
  stockOpnameNo: string | null;
  status: SoStatus;
  labelCount: number;
  scannedCount: number;
  startDate: string | null;
  completedAt: string | null;
  workingLocationCount: number;
  workingLocations: SoWorkingLocation[];
};

export type SoGeneratePreviewJenis = {
  typeId: number;
  typeName: string;
  labelCount: number;
  totalWeight: number;
};

export type SoGeneratePreview = {
  categoryId: number;
  categoryCode: string;
  categoryName: string;
  date: string | null;
  hasDateFilter: boolean;
  labelCount: number;
  totalWeight: number;
  perJenis: SoGeneratePreviewJenis[];
};

export type SoGenerateResult = {
  stockOpnameNo: string;
  categoryCode?: string;
  categoryName?: string;
};

export type SoBlok = {
  blok: string;
  locationCount: number;
  labelCount: number;
  scannedCount: number;
  totalWeight: number;
  workingLocationCount: number;
};

export type SoBlokPage = {
  stockOpnameNo: string;
  categoryId: number;
  categoryCode: string;
  categoryName: string;
  isComplete: boolean;
  completedAt: string | null;
  data: SoBlok[];
  totalRecords: number;
};

export type SoLokasiAllowedUser = {
  idUsername: number;
  username: string;
  fullName: string;
};

export type SoLokasi = {
  locationId: number;
  description: string;
  labelCount: number;
  scannedCount: number;
  totalWeight: number;
  allowedUsers: SoLokasiAllowedUser[];
};

export type SoLokasiPage = {
  stockOpnameNo: string;
  categoryCode: string;
  categoryName: string;
  isComplete: boolean;
  blok: string;
  data: SoLokasi[];
  totalRecords: number;
};

export type SoLabelRow = {
  primaryKey: string;
  primaryValue: string;
  isScanned: boolean;
  isLocationMismatch: boolean;
  scannedBlok: string | null;
  scannedLocationId: number | null;
  secondaryEntries: Array<[string, unknown]>;
  weightRaw: unknown | null;
  countRaw: unknown | null;
};

export type SoLabelGroup = {
  typeId: number | null;
  typeName: string;
  labelCount: number;
  scannedCount: number;
  totalWeight: number;
  labels: SoLabelRow[];
};

export type SoLabelPage = {
  stockOpnameNo: string;
  categoryCode: string;
  blok: string | null;
  locationId: number | null;
  isComplete: boolean;
  data: SoLabelGroup[];
  currentPage: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  totalWeight: number;
  totalScanned: number;
};

export type SoSummaryTotal = {
  labelCount: number;
  scannedCount: number;
  unscannedCount: number;
  totalWeight: number;
};

export type SoCompleteSummaryJenis = SoSummaryTotal & {
  typeId: number;
  typeName: string;
};

export type SoCompleteSummaryBlok = SoSummaryTotal & {
  blok: string;
  locationCount: number;
};

export type SoCompleteSummary = {
  stockOpnameNo: string;
  date: string | null;
  categoryId: number;
  categoryCode: string;
  categoryName: string;
  isComplete: boolean;
  completedAt: string | null;
  total: SoSummaryTotal;
  perJenis: SoCompleteSummaryJenis[];
  perBlok: SoCompleteSummaryBlok[];
  assignedUsersCount: number;
};

export type SoScanSummaryUser = {
  username: string;
  fullName: string;
  labelCount: number;
  firstScanAt: string | null;
  lastScanAt: string | null;
  totalWeight: number;
};

export type SoScanSummary = {
  stockOpnameNo: string;
  categoryId: number;
  categoryCode: string;
  categoryName: string;
  isComplete: boolean;
  completedAt: string | null;
  data: SoScanSummaryUser[];
  totalUsers: number;
  totalScanned: number;
};

export type SoAccessUser = {
  idUsername: number;
  username: string;
  fName: string;
  lName: string | null;
  isOnline: boolean;
};

export type SoKategoriParams = { year?: number; month?: number };

export type SoLabelPageParams = {
  stockOpnameNo: string;
  blok: string;
  locationId: number;
  page: number;
  pageSize?: number;
  search?: string;
};

export type SoAccessPayload = {
  stockOpnameNo: string;
  blok: string;
  idLokasi: number;
  idUsername: number;
};

type Envelope<T> = { success?: boolean; message?: string; data?: T };

const UNKNOWN_BLOK = "TIDAK_DIKETAHUI";

const LABEL_ROW_EXCLUDED_KEYS = new Set([
  "NoSO",
  "isScanned",
  "IdJenisPlastik",
  "IdLokasi",
  "Blok",
  "IdBonggolan",
  "ScannedBlok",
  "ScannedIdLokasi",
  "isLocationMismatch",
]);

export { UNKNOWN_BLOK };

function requireToken(token: string | undefined): string {
  if (!token) throw new ApiRequestError("Tidak terautentikasi");
  return token;
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

function str(v: unknown): string {
  return v == null ? "" : String(v);
}

function strOrNull(v: unknown): string | null {
  const s = str(v).trim();
  return s ? s : null;
}

function bool(v: unknown): boolean {
  return v === true || v === 1 || v === "1";
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}

function asList(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function parseStatus(v: unknown): SoStatus {
  const s = str(v);
  if (s === "in_progress") return "in_progress";
  if (s === "completed") return "completed";
  return "not_started";
}

function weightOf(v: unknown): number {
  const rec = asRecord(v);
  return num(rec.totalWeight, num(rec.totalPcs, 0));
}

function parseWorkingUser(v: unknown): SoWorkingUser {
  const rec = asRecord(v);
  return {
    idUsername: int(rec.idUsername),
    username: str(rec.username),
    fullName: strOrNull(rec.fullName),
  };
}

function parseWorkingLocation(v: unknown): SoWorkingLocation {
  const rec = asRecord(v);
  return {
    lokasi: str(rec.lokasi),
    description: strOrNull(rec.description),
    users: asList(rec.users).map(parseWorkingUser),
  };
}

function parseKategori(v: unknown): SoKategori {
  const rec = asRecord(v);
  return {
    categoryId: int(rec.categoryId),
    categoryCode: str(rec.categoryCode),
    categoryName: str(rec.categoryName),
    stockOpnameNo: strOrNull(rec.stockOpnameNo),
    status: parseStatus(rec.status),
    labelCount: int(rec.labelCount),
    scannedCount: int(rec.scannedCount),
    startDate: strOrNull(rec.startDate),
    completedAt: strOrNull(rec.completedAt),
    workingLocationCount: int(rec.workingLocationCount),
    workingLocations: asList(rec.workingLocations).map(parseWorkingLocation),
  };
}

function parseGeneratePreview(v: unknown): SoGeneratePreview {
  const rec = asRecord(v);
  return {
    categoryId: int(rec.categoryId),
    categoryCode: str(rec.categoryCode),
    categoryName: str(rec.categoryName),
    date: strOrNull(rec.date),
    hasDateFilter: bool(rec.hasDateFilter),
    labelCount: int(rec.labelCount),
    totalWeight: num(rec.totalWeight),
    perJenis: asList(rec.perJenis).map((j) => {
      const jr = asRecord(j);
      return {
        typeId: int(jr.typeId),
        typeName: str(jr.typeName),
        labelCount: int(jr.labelCount),
        totalWeight: num(jr.totalWeight),
      };
    }),
  };
}

function parseGenerateResult(v: unknown): SoGenerateResult {
  const rec = asRecord(v);
  return {
    stockOpnameNo: str(rec.stockOpnameNo),
    categoryCode: strOrNull(rec.categoryCode) ?? undefined,
    categoryName: strOrNull(rec.categoryName) ?? undefined,
  };
}

function parseBlok(v: unknown): SoBlok {
  const rec = asRecord(v);
  return {
    blok: str(rec.blok),
    locationCount: int(rec.locationCount),
    labelCount: int(rec.labelCount),
    scannedCount: int(rec.scannedCount),
    totalWeight: weightOf(v),
    workingLocationCount: int(rec.workingLocationCount),
  };
}

function parseBlokPage(v: unknown): SoBlokPage {
  const rec = asRecord(v);
  return {
    stockOpnameNo: str(rec.stockOpnameNo),
    categoryId: int(rec.categoryId),
    categoryCode: str(rec.categoryCode),
    categoryName: str(rec.categoryName),
    isComplete: bool(rec.isComplete),
    completedAt: strOrNull(rec.completedAt),
    data: asList(rec.data).map(parseBlok),
    totalRecords: int(rec.totalRecords),
  };
}

function parseLokasi(v: unknown): SoLokasi {
  const rec = asRecord(v);
  return {
    locationId: int(rec.locationId),
    description: str(rec.description),
    labelCount: int(rec.labelCount),
    scannedCount: int(rec.scannedCount),
    totalWeight: weightOf(v),
    allowedUsers: asList(rec.allowedUsers).map((u) => {
      const ur = asRecord(u);
      return {
        idUsername: int(ur.idUsername),
        username: str(ur.username),
        fullName: str(ur.fullName),
      };
    }),
  };
}

function parseLokasiPage(v: unknown): SoLokasiPage {
  const rec = asRecord(v);
  return {
    stockOpnameNo: str(rec.stockOpnameNo),
    categoryCode: str(rec.categoryCode),
    categoryName: str(rec.categoryName),
    isComplete: bool(rec.isComplete),
    blok: str(rec.blok),
    data: asList(rec.data).map(parseLokasi),
    totalRecords: int(rec.totalRecords),
  };
}

function parseLabelRow(v: unknown): SoLabelRow {
  const rec = asRecord(v);
  const isScanned = rec.isScanned === 1 || rec.isScanned === true;
  const isLocationMismatch =
    rec.isLocationMismatch === 1 || rec.isLocationMismatch === true;
  const scannedBlokRaw = rec.ScannedBlok;
  const scannedIdRaw = rec.ScannedIdLokasi;
  const scannedLocationId =
    typeof scannedIdRaw === "number"
      ? scannedIdRaw
      : scannedIdRaw == null || scannedIdRaw === ""
        ? null
        : int(scannedIdRaw, 0) || null;

  let primaryKey = "";
  let primaryValue = "";
  if ("NoBahanBaku" in rec && "NoPallet" in rec) {
    primaryKey = "NoBahanBaku";
    primaryValue = `${str(rec.NoBahanBaku)}-${str(rec.NoPallet)}`;
  } else {
    const entries = Object.entries(rec);
    const entry =
      entries.find(([k]) => !LABEL_ROW_EXCLUDED_KEYS.has(k)) ?? entries[0];
    if (entry) {
      primaryKey = entry[0];
      primaryValue = entry[1] == null ? "" : String(entry[1]);
    }
  }

  const secondaryEntries = Object.entries(rec).filter(
    ([k]) =>
      k !== primaryKey &&
      !LABEL_ROW_EXCLUDED_KEYS.has(k) &&
      !(primaryKey === "NoBahanBaku" && k === "NoPallet"),
  );

  let weightRaw: unknown = null;
  let countRaw: unknown = null;
  for (const [k, v2] of secondaryEntries) {
    if (v2 == null) continue;
    if (k.toLowerCase().includes("berat")) {
      weightRaw = v2;
      break;
    }
  }
  if (weightRaw == null) {
    for (const [k, v2] of secondaryEntries) {
      if (v2 == null) continue;
      const key = k.toLowerCase();
      if (key.includes("jmlh") || key.includes("pcs") || key.includes("qty")) {
        countRaw = v2;
        break;
      }
    }
  }

  return {
    primaryKey,
    primaryValue,
    isScanned,
    isLocationMismatch,
    scannedBlok: strOrNull(scannedBlokRaw),
    scannedLocationId,
    secondaryEntries,
    weightRaw,
    countRaw,
  };
}

function parseLabelGroup(v: unknown): SoLabelGroup {
  const rec = asRecord(v);
  const labels = asList(rec.labels).map(parseLabelRow);
  return {
    typeId: rec.typeId == null ? null : int(rec.typeId),
    typeName: str(rec.typeName),
    labelCount: int(rec.labelCount),
    scannedCount: labels.filter((l) => l.isScanned).length,
    totalWeight: weightOf(v),
    labels,
  };
}

function parseLabelPage(v: unknown): SoLabelPage {
  const rec = asRecord(v);
  return {
    stockOpnameNo: str(rec.stockOpnameNo),
    categoryCode: str(rec.categoryCode),
    blok: strOrNull(rec.blok),
    locationId: rec.locationId == null ? null : int(rec.locationId),
    isComplete: bool(rec.isComplete),
    data: asList(rec.data).map(parseLabelGroup),
    currentPage: int(rec.currentPage, 1) || 1,
    pageSize: int(rec.pageSize, 20) || 20,
    totalRecords: int(rec.totalRecords),
    totalPages: int(rec.totalPages, 1) || 1,
    totalWeight: weightOf(v),
    totalScanned: int(rec.totalScanned),
  };
}

function parseSummaryTotal(v: unknown): SoSummaryTotal {
  const rec = asRecord(v);
  return {
    labelCount: int(rec.labelCount),
    scannedCount: int(rec.scannedCount),
    unscannedCount: int(rec.unscannedCount),
    totalWeight: num(rec.totalWeight),
  };
}

function parseCompleteSummary(v: unknown): SoCompleteSummary {
  const rec = asRecord(v);
  return {
    stockOpnameNo: str(rec.stockOpnameNo),
    date: strOrNull(rec.date),
    categoryId: int(rec.categoryId),
    categoryCode: str(rec.categoryCode),
    categoryName: str(rec.categoryName),
    isComplete: bool(rec.isComplete),
    completedAt: strOrNull(rec.completedAt),
    total: parseSummaryTotal(rec.total),
    perJenis: asList(rec.perJenis).map((j) => {
      const jr = asRecord(j);
      return {
        ...parseSummaryTotal(jr),
        typeId: int(jr.typeId),
        typeName: str(jr.typeName),
      };
    }),
    perBlok: asList(rec.perBlok).map((b) => {
      const br = asRecord(b);
      return {
        ...parseSummaryTotal(br),
        blok: str(br.blok),
        locationCount: int(br.locationCount),
      };
    }),
    assignedUsersCount: int(rec.assignedUsersCount),
  };
}

function parseScanSummary(v: unknown): SoScanSummary {
  const rec = asRecord(v);
  return {
    stockOpnameNo: str(rec.stockOpnameNo),
    categoryId: int(rec.categoryId),
    categoryCode: str(rec.categoryCode),
    categoryName: str(rec.categoryName),
    isComplete: bool(rec.isComplete),
    completedAt: strOrNull(rec.completedAt),
    data: asList(rec.data).map((u) => {
      const ur = asRecord(u);
      return {
        username: str(ur.username),
        fullName: str(ur.fullName),
        labelCount: int(ur.labelCount),
        firstScanAt: strOrNull(ur.firstScanAt),
        lastScanAt: strOrNull(ur.lastScanAt),
        totalWeight: num(ur.totalWeight),
      };
    }),
    totalUsers: int(rec.totalUsers),
    totalScanned: int(rec.totalScanned),
  };
}

function parseAccessUser(v: unknown): SoAccessUser {
  const rec = asRecord(v);
  return {
    idUsername: int(rec.IdUsername),
    username: str(rec.Username),
    fName: str(rec.FName),
    lName: strOrNull(rec.LName),
    isOnline: str(rec.Status).toUpperCase() === "ONLINE",
  };
}

async function getData<T>(
  path: string,
  token: string,
  fallback: string,
  parse: (v: unknown) => T,
): Promise<T> {
  const res = await apiFetchAuth<Envelope<unknown>>(path, token);
  if (res.data && res.data.data != null) return parse(res.data.data);
  throw new ApiRequestError(res.data?.message || fallback);
}

async function sendData<T>(
  path: string,
  token: string,
  fallback: string,
  init: RequestInit,
  parse: (v: unknown) => T,
  okStatuses: number[] = [200, 201],
): Promise<T> {
  const res = await apiFetchAuth<Envelope<unknown>>(path, token, init);
  if (
    okStatuses.includes(res.status) &&
    res.data?.success !== false &&
    res.data && res.data.data != null
  ) {
    return parse(res.data.data);
  }
  if (okStatuses.includes(res.status) && res.data?.success !== false) {
    return parse(res.data && res.data.data != null ? res.data.data : null);
  }
  throw new ApiRequestError(res.data?.message || fallback);
}

export async function fetchSoKategori(
  token: string | undefined,
  params: SoKategoriParams = {},
): Promise<SoKategori[]> {
  const t = requireToken(token);
  const query: string[] = [];
  if (params.year) query.push(`year=${params.year}`);
  if (params.month) query.push(`month=${params.month}`);
  const qs = query.length ? `?${query.join("&")}` : "";
  const list = await getData<unknown[]>(
    `/stock-opname-v2/kategori${qs}`,
    t,
    "Gagal memuat kategori",
    (v) => asList(v),
  );
  return list.map(parseKategori);
}

export async function previewSoGenerate(
  token: string | undefined,
  categoryId: number,
): Promise<{ message: string; preview: SoGeneratePreview }> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<unknown>>(
    `/stock-opname-v2/transaksi/preview?categoryId=${categoryId}`,
    t,
  );
  if (res.data && res.data.data != null) {
    return { message: str(res.data.message), preview: parseGeneratePreview(res.data.data) };
  }
  throw new ApiRequestError(res.data?.message || "Gagal memuat preview");
}

export async function generateSo(
  token: string | undefined,
  categoryId: number,
): Promise<SoGenerateResult> {
  const t = requireToken(token);
  const result = await sendData(
    "/stock-opname-v2/transaksi",
    t,
    "Gagal generate stock opname",
    {
      method: "POST",
      body: JSON.stringify({ categoryId }),
    },
    parseGenerateResult,
  );
  if (!result.stockOpnameNo) {
    throw new ApiRequestError("Gagal generate stock opname");
  }
  return result;
}

export async function deleteSo(
  token: string | undefined,
  stockOpnameNo: string,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<unknown>>(
    `/stock-opname-v2/transaksi/${encodeURIComponent(stockOpnameNo)}`,
    t,
    { method: "DELETE" },
  );
  if (res.status >= 200 && res.status < 300 && res.data?.success !== false) return;
  throw new ApiRequestError(res.data?.message || "Gagal menghapus stock opname");
}

export async function fetchSoBlok(
  token: string | undefined,
  stockOpnameNo: string,
): Promise<SoBlokPage> {
  const t = requireToken(token);
  return getData(
    `/stock-opname-v2/transaksi/${encodeURIComponent(stockOpnameNo)}/blok`,
    t,
    "Gagal memuat blok",
    parseBlokPage,
  );
}

export async function fetchSoLokasi(
  token: string | undefined,
  stockOpnameNo: string,
  blok: string,
): Promise<SoLokasiPage> {
  const t = requireToken(token);
  return getData(
    `/stock-opname-v2/transaksi/${encodeURIComponent(stockOpnameNo)}/blok/${encodeURIComponent(blok)}/lokasi`,
    t,
    "Gagal memuat lokasi",
    parseLokasiPage,
  );
}

export async function fetchSoLabelPage(
  token: string | undefined,
  params: SoLabelPageParams,
): Promise<SoLabelPage> {
  const t = requireToken(token);
  const query = [
    `page=${params.page}`,
    `pageSize=${params.pageSize ?? 20}`,
  ];
  const search = params.search?.trim();
  if (search) query.push(`search=${encodeURIComponent(search)}`);
  return getData(
    `/stock-opname-v2/transaksi/${encodeURIComponent(params.stockOpnameNo)}/blok/${encodeURIComponent(params.blok)}/lokasi/${params.locationId}/label?${query.join("&")}`,
    t,
    "Gagal memuat label",
    parseLabelPage,
  );
}

export async function fetchSoCompleteSummary(
  token: string | undefined,
  stockOpnameNo: string,
): Promise<SoCompleteSummary> {
  const t = requireToken(token);
  return getData(
    `/stock-opname-v2/transaksi/${encodeURIComponent(stockOpnameNo)}/complete-summary`,
    t,
    "Gagal memuat ringkasan",
    parseCompleteSummary,
  );
}

export async function completeSo(
  token: string | undefined,
  stockOpnameNo: string,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<unknown>>(
    `/stock-opname-v2/transaksi/${encodeURIComponent(stockOpnameNo)}/complete`,
    t,
    { method: "PATCH" },
  );
  if ((res.status >= 200 && res.status < 300) || res.status === 409) {
    return;
  }
  throw new ApiRequestError(res.data?.message || "Gagal menandai selesai");
}

export async function deleteSoHasil(
  token: string | undefined,
  stockOpnameNo: string,
  labelNo: string,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<unknown>>(
    `/stock-opname-v2/transaksi/${encodeURIComponent(stockOpnameNo)}/hasil/${encodeURIComponent(labelNo)}`,
    t,
    { method: "DELETE" },
  );
  if (res.status >= 200 && res.status < 300 && res.data?.success !== false) return;
  throw new ApiRequestError(res.data?.message || "Gagal menghapus hasil scan");
}

export async function fetchSoScanSummary(
  token: string | undefined,
  stockOpnameNo: string,
): Promise<SoScanSummary> {
  const t = requireToken(token);
  return getData(
    `/stock-opname-v2/transaksi/${encodeURIComponent(stockOpnameNo)}/scan-summary`,
    t,
    "Gagal memuat ringkasan scan",
    parseScanSummary,
  );
}

export async function fetchSoLaporanPdfBase64(
  token: string | undefined,
  stockOpnameNo: string,
): Promise<string> {
  const t = requireToken(token);
  const base = getBackendBaseUrl();
  const path = `/api/stock-opname-v2/transaksi/${encodeURIComponent(stockOpnameNo)}/laporan/pdf`;
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

export async function fetchSoAllUsers(
  token: string | undefined,
): Promise<SoAccessUser[]> {
  const t = requireToken(token);
  const list = await getData<unknown[]>(
    "/stock-opname-v2/lokasi-access/users",
    t,
    "Gagal memuat daftar user",
    (v) => asList(v),
  );
  return list.map(parseAccessUser);
}

export async function assignSoAccess(
  token: string | undefined,
  payload: SoAccessPayload,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<unknown>>(
    "/stock-opname-v2/lokasi-access",
    t,
    {
      method: "POST",
      body: JSON.stringify({
        blok: payload.blok,
        idLokasi: payload.idLokasi,
        idUsername: payload.idUsername,
        stockOpnameNo: payload.stockOpnameNo,
      }),
    },
  );
  if (res.status >= 200 && res.status < 300 && res.data?.success !== false) return;
  throw new ApiRequestError(res.data?.message || "Gagal menugaskan user");
}

export async function revokeSoAccess(
  token: string | undefined,
  payload: SoAccessPayload,
): Promise<void> {
  const t = requireToken(token);
  const path = `/stock-opname-v2/lokasi-access/${encodeURIComponent(payload.stockOpnameNo)}/${encodeURIComponent(payload.blok)}/${payload.idLokasi}/${payload.idUsername}`;
  const res = await apiFetchAuth<Envelope<unknown>>(path, t, {
    method: "DELETE",
  });
  if (res.status >= 200 && res.status < 300 && res.data?.success !== false) return;
  throw new ApiRequestError(res.data?.message || "Gagal melepas user");
}
