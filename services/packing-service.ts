import { getBackendBaseUrl, apiFetch, apiFetchAuth, ApiRequestError } from "@/services/api";

// ── Types ────────────────────────────────────────────────────────────────────

export type MachineStatus = "active" | "pending" | "inactive";

export type PackingProduction = {
  noProduksi: string;
  idOperators: number[];
  namaOperators: string;
  idMesin: number;
  namaMesin: string;
  tglProduksi: string | null;
  jamKerja: number;
  shift: number;
  createBy: string;
  checkBy1: string | null;
  checkBy2: string | null;
  approveBy: string | null;
  hourMeter: number | null;
  hourStart: string | null;
  hourEnd: string | null;
  outputJenisId: number | null;
  outputJenisNama: string | null;
  isLocked: boolean;
  lastClosedDate: string | null;
  idRegu: number | null;
  namaRegu: string | null;
  isComplete: boolean;
  produksiStatus: string;
};

export type PackingMesinInfo = {
  idMesin: number;
  namaMesin: string;
  bagian: string | null;
  target: number | null;
  noProduksi: string | null;
  tglProduksi: string | null;
  outputJenisId: number | null;
  outputJenisNama: string | null;
  outputJenisItemCode: string | null;
  idOperators: number[];
  namaOperator: string | null;
  idRegu: number | null;
  namaRegu: string | null;
  shift: number | null;
  hourStart: string | null;
  hourEnd: string | null;
  machineStatus: MachineStatus;
};

export type PackingActiveShift = {
  shift: number;
  hourStart: string;
  hourEnd: string;
};

export type PackingMesinResult = {
  mesinList: PackingMesinInfo[];
  activeShift: PackingActiveShift | null;
};

/** Jenis output = MstBarangJadi aktif (GET /packing-type). */
export type PackingType = {
  idBj: number;
  nama: string;
  enable: boolean;
  pcsPerLabel: number | null;
};

/** Master cabinet material + stok (GET /mst-furniture-material/cabinet-materials). */
export type CabinetMaterialMaster = {
  idCabinetMaterial: number;
  nama: string;
  itemCode: string | null;
  namaUom: string | null;
  namaWarehouse: string | null;
  saldoAkhir: number | null;
};

export type PackingOutputCategory = "bj";

export type PackingOutput = {
  noProduksi: string;
  noLabel: string;
  category: PackingOutputCategory;
  idJenis: number | null;
  namaJenis: string | null;
  hasBeenPrinted: number;
  pcs: number | null;
};

export type PackingFwipInputItem = {
  noFurnitureWip: string | null;
  noFurnitureWipPartial: string | null;
  pcs: number | null;
  pcsHeader: number | null;
  isPartial: boolean | null;
  isPartialRow: boolean;
  idJenis: number | null;
  namaJenis: string | null;
  namaUom: string | null;
  datetimeInput: string | null;
};

export type PackingMaterialInputItem = {
  idCabinetMaterial: number | null;
  jumlah: number | null;
  berat: number | null;
  noBahanPendukung: string | null;
  pcs: number | null;
  namaJenis: string | null;
  namaUom: string | null;
  datetimeInput: string | null;
};

export type PackingInputs = {
  furnitureWip: PackingFwipInputItem[];
  cabinetMaterial: PackingMaterialInputItem[];
  summary: Record<string, number>;
};

export type FetchPackingListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  shift?: number;
  idMesin?: number;
  tanggal?: string;
};

export type FetchPackingListResult = {
  items: PackingProduction[];
  page: number;
  totalPages: number;
  total: number;
};

export type CreatePackingPayload = {
  tglProduksi: string;
  idMesin: number;
  idOperators: number[];
  jamKerja?: number | string;
  shift: number;
  outputJenisId?: number;
  hourStart?: string;
  hourEnd?: string;
  hourMeter?: number;
  idRegu?: number;
};

export type UpdatePackingPayload = {
  tglProduksi?: string;
  idMesin?: number;
  idOperator?: number;
  jamKerja?: number | string;
  shift?: number;
  hourStart?: string;
  hourEnd?: string;
  outputJenisId?: number;
  hourMeter?: number;
  checkBy1?: string;
  checkBy2?: string;
  approveBy?: string;
};

/**
 * Payload POST/DELETE /production/packing/:no/inputs.
 * - POST: furnitureWip [{noFurnitureWIP}], cabinetMaterial
 *   [{idCabinetMaterial, jumlah}], furnitureWipPartial [{noFurnitureWIP, pcs}].
 * - DELETE: cabinetMaterial cukup [{idCabinetMaterial}]; partial row pakai
 *   [{noFurnitureWIPPartial: code}].
 */
export type SubmitInputsPayload = {
  furnitureWip?: { noFurnitureWIP: string | null }[];
  cabinetMaterial?: {
    idCabinetMaterial: number;
    jumlah?: number;
    noBahanPendukung?: string | null;
  }[];
  furnitureWipPartial?: {
    noFurnitureWIP?: string | null;
    noFurnitureWIPPartial?: string;
    pcs?: number;
  }[];
};

export type DeleteInputsPayload = SubmitInputsPayload;

export type StokBjItem = {
  idBj: number;
  nama: string;
  labelSisa: number;
  pcsSisa: number;
  beratSisa: number;
  dateCreateTertua: string | null;
};

export type StokBjLabel = {
  noBj: string;
  dateCreate: string | null;
  pcs: number;
  berat: number;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function asString(v: unknown): string {
  return v == null ? "" : String(v);
}

function asInt(v: unknown, fallback = 0): number {
  if (v == null) return fallback;
  if (typeof v === "number") return Math.trunc(v);
  if (typeof v === "string") {
    const n = parseInt(v, 10);
    return Number.isNaN(n) ? fallback : n;
  }
  return fallback;
}

function asIntOrNull(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Math.trunc(v);
  if (typeof v === "string") {
    const n = parseInt(v, 10);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

function asDoubleOrNull(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

function asBool(v: unknown, fallback = false): boolean {
  if (v == null) return fallback;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true" || s === "1" || s === "yes" || s === "y") return true;
    if (s === "false" || s === "0" || s === "no" || s === "n") return false;
  }
  return fallback;
}

function asBoolOrNull(v: unknown): boolean | null {
  if (v == null || v === "") return null;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  const s = String(v).trim().toLowerCase();
  if (s === "true" || s === "1") return true;
  if (s === "false" || s === "0") return false;
  return null;
}

function asDateOrNull(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") {
    const s = v.trim();
    return s === "" ? null : s.slice(0, 10);
  }
  return null;
}

function asTimeHHmm(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return null;
    const m = s.match(/^(\d{1,2}):(\d{2})/);
    if (m) return `${m[1].padStart(2, "0")}:${m[2]}`;
  }
  return null;
}

function parseStatus(v: unknown): MachineStatus {
  const s = v == null ? "" : String(v).toLowerCase();
  if (s === "current" || s === "active" || s === "aktif") return "active";
  if (s === "pending") return "pending";
  return "inactive";
}

function strOr(v: unknown): string | null {
  const t = v == null ? "" : String(v).trim();
  return t || null;
}

function normalizeTime(v: string): string {
  const t = v.trim();
  return t.length === 5 ? `${t}:00` : t;
}

function requireToken(token: string | undefined): string {
  if (!token) throw new ApiRequestError("Tidak terautentikasi");
  return token;
}

function listOf<T>(
  v: unknown,
  f: (m: Record<string, unknown>) => T,
): T[] {
  if (!Array.isArray(v)) return [];
  return v.map((e) => f(e as Record<string, unknown>));
}

// ── Parsers ──────────────────────────────────────────────────────────────────

export function parsePackingProduction(
  j: Record<string, unknown>,
): PackingProduction {
  const rawOperators = j["IdOperators"] ?? j["IdOperator"];
  let idOperators: number[];
  if (Array.isArray(rawOperators)) {
    idOperators = rawOperators.map((e) => asInt(e)).filter((e) => e !== 0);
  } else {
    const single = asIntOrNull(rawOperators);
    idOperators = single ? [single] : [];
  }

  const checkBy1 = asString(j["CheckBy1"]).trim();
  const checkBy2 = asString(j["CheckBy2"]).trim();
  const approveBy = asString(j["ApproveBy"]).trim();
  const outputJenisNama = asString(j["OutputJenisNama"]).trim();

  return {
    noProduksi: asString(j["NoPacking"] ?? j["NoProduksi"]),
    idOperators,
    namaOperators: asString(j["NamaOperators"] ?? j["NamaOperator"]),
    idMesin: asInt(j["IdMesin"]),
    namaMesin: asString(j["NamaMesin"]),
    tglProduksi: asDateOrNull(j["TglProduksi"] ?? j["Tanggal"]),
    jamKerja: asInt(j["JamKerja"] ?? j["Jam"]),
    shift: asInt(j["Shift"]),
    createBy: asString(j["CreateBy"]),
    checkBy1: checkBy1 || null,
    checkBy2: checkBy2 || null,
    approveBy: approveBy || null,
    hourMeter: asDoubleOrNull(j["HourMeter"]),
    hourStart: asTimeHHmm(j["HourStart"]),
    hourEnd: asTimeHHmm(j["HourEnd"]),
    outputJenisId: asIntOrNull(j["OutputJenisId"]),
    outputJenisNama: outputJenisNama || null,
    isLocked: asBool(j["IsLocked"]),
    lastClosedDate: asDateOrNull(j["LastClosedDate"]),
    idRegu: asIntOrNull(j["IdRegu"]),
    namaRegu: strOr(j["NamaRegu"]),
    isComplete: asBool(j["IsComplete"]) || asString(j["status"]) === "complete",
    produksiStatus:
      asString(j["status"]) ||
      (asBool(j["IsComplete"]) ? "complete" : "pending"),
  };
}

export function parsePackingMesinInfo(
  j: Record<string, unknown>,
): PackingMesinInfo {
  const rawOperators = j["IdOperators"];
  let idOperators: number[];
  if (Array.isArray(rawOperators)) {
    idOperators = rawOperators.map((e) => asInt(e)).filter((e) => e !== 0);
  } else {
    const single = asIntOrNull(rawOperators);
    idOperators = single ? [single] : [];
  }

  return {
    idMesin: asInt(j["IdMesin"]),
    namaMesin: asString(j["NamaMesin"]),
    bagian: strOr(j["Bagian"]),
    target: asIntOrNull(j["Target"]),
    noProduksi: strOr(j["NoProduksi"]),
    tglProduksi: asDateOrNull(j["TglProduksi"] ?? j["Tanggal"] ?? j["date"]),
    outputJenisId: asIntOrNull(j["OutputJenisId"]),
    outputJenisNama: strOr(j["OutputJenisNama"]),
    outputJenisItemCode: strOr(j["OutputJenisItemCode"]),
    idOperators,
    namaOperator: strOr(j["NamaOperator"] ?? j["Operators"]),
    idRegu: asIntOrNull(j["IdRegu"]),
    namaRegu: strOr(j["NamaRegu"]),
    shift: asIntOrNull(j["Shift"]),
    hourStart: asTimeHHmm(j["HourStart"]),
    hourEnd: asTimeHHmm(j["HourEnd"]),
    machineStatus: parseStatus(
      j["status"] ?? j["machineStatus"] ?? j["MachineStatus"],
    ),
  };
}

export function parsePackingType(j: Record<string, unknown>): PackingType {
  return {
    idBj: asInt(j["IdBJ"] ?? j["idBj"]),
    nama: asString(j["NamaBJ"] ?? j["Nama"] ?? j["nama"]),
    enable: asBool(j["Enable"] ?? j["enable"], true),
    pcsPerLabel: asIntOrNull(j["PcsPerLabel"]),
  };
}

export function parseCabinetMaterialMaster(
  j: Record<string, unknown>,
): CabinetMaterialMaster {
  return {
    idCabinetMaterial: asInt(
      j["IdCabinetMaterial"] ?? j["idCabinetMaterial"],
    ),
    nama: asString(j["Nama"] ?? j["nama"]),
    itemCode: strOr(j["ItemCode"] ?? j["itemCode"]),
    namaUom: strOr(j["NamaUOM"] ?? j["namaUom"]),
    namaWarehouse: strOr(j["NamaWarehouse"] ?? j["namaWarehouse"]),
    saldoAkhir: asDoubleOrNull(j["SaldoAkhir"] ?? j["saldoAkhir"]),
  };
}

function parseFwipInputItem(j: Record<string, unknown>): PackingFwipInputItem {
  return {
    noFurnitureWip: strOr(
      j["noFurnitureWip"] ?? j["noFurnitureWIP"] ?? j["NoFurnitureWIP"],
    ),
    noFurnitureWipPartial: strOr(
      j["noFurnitureWipPartial"] ??
        j["noFurnitureWIPPartial"] ??
        j["NoFurnitureWIPPartial"],
    ),
    pcs: asIntOrNull(j["pcs"] ?? j["Pcs"]),
    pcsHeader: asIntOrNull(j["pcsHeader"] ?? j["PcsHeader"]),
    isPartial: asBoolOrNull(j["isPartial"] ?? j["IsPartial"]),
    isPartialRow: asBool(j["isPartialRow"] ?? j["IsPartialRow"]),
    idJenis: asIntOrNull(j["idJenis"] ?? j["IdJenis"]),
    namaJenis: strOr(j["namaJenis"] ?? j["NamaJenis"]),
    namaUom: strOr(j["namaUom"] ?? j["NamaUOM"] ?? j["NamaUom"]),
    datetimeInput: asDateOrNull(
      j["datetimeInput"] ?? j["DatetimeInput"],
    ),
  };
}

function parseMaterialInputItem(
  j: Record<string, unknown>,
): PackingMaterialInputItem {
  return {
    idCabinetMaterial: asIntOrNull(
      j["idCabinetMaterial"] ?? j["IdCabinetMaterial"],
    ),
    jumlah: asIntOrNull(j["jumlah"] ?? j["Jumlah"]),
    berat: asDoubleOrNull(j["berat"] ?? j["Berat"]),
    noBahanPendukung: strOr(
      j["noBahanPendukung"] ?? j["NoBahanPendukung"],
    ),
    pcs: asIntOrNull(j["pcs"] ?? j["Pcs"]),
    namaJenis: strOr(j["namaJenis"] ?? j["NamaJenis"] ?? j["Nama"]),
    namaUom: strOr(j["namaUom"] ?? j["NamaUOM"] ?? j["NamaUom"]),
    datetimeInput: asDateOrNull(j["datetimeInput"] ?? j["DatetimeInput"]),
  };
}

export function parsePackingInputs(j: Record<string, unknown>): PackingInputs {
  const summaryRaw = (j["summary"] ?? {}) as Record<string, unknown>;
  const summary: Record<string, number> = {};
  for (const [k, v] of Object.entries(summaryRaw)) summary[k] = asInt(v);

  return {
    furnitureWip: listOf(j["furnitureWip"] ?? j["FurnitureWip"], parseFwipInputItem),
    cabinetMaterial: listOf(
      j["cabinetMaterial"] ?? j["CabinetMaterial"],
      parseMaterialInputItem,
    ),
    summary,
  };
}

export function parsePackingOutput(
  j: Record<string, unknown>,
  category: PackingOutputCategory = "bj",
): PackingOutput {
  return {
    noProduksi: asString(j["NoPacking"] ?? j["noPacking"] ?? j["NoProduksi"]),
    noLabel: asString(j["NoBJ"] ?? j["noBJ"] ?? j["noBj"]),
    category,
    idJenis: asIntOrNull(j["IdJenis"] ?? j["idJenis"]),
    namaJenis: strOr(j["NamaJenis"] ?? j["namaJenis"]),
    hasBeenPrinted: asInt(j["HasBeenPrinted"] ?? j["hasBeenPrinted"]),
    pcs: asIntOrNull(j["Pcs"] ?? j["pcs"]),
  };
}

export function parseStokBjItem(j: Record<string, unknown>): StokBjItem {
  return {
    idBj: asInt(j["IdBJ"] ?? j["idBj"]),
    nama: asString(j["NamaBJ"] ?? j["Nama"] ?? j["nama"]),
    labelSisa: asInt(j["LabelSisa"] ?? j["labelSisa"]),
    pcsSisa: asInt(j["PcsSisa"] ?? j["pcsSisa"]),
    beratSisa: asDoubleOrNull(j["BeratSisa"] ?? j["beratSisa"]) ?? 0,
    dateCreateTertua: asDateOrNull(
      j["DateCreateTertua"] ?? j["dateCreateTertua"],
    ),
  };
}

export function parseStokBjLabel(j: Record<string, unknown>): StokBjLabel {
  return {
    noBj: asString(j["NoBJ"] ?? j["Label"] ?? j["noBj"]),
    dateCreate: asDateOrNull(j["DateCreate"] ?? j["dateCreate"]),
    pcs: asInt(j["Pcs"] ?? j["pcs"]),
    berat: asDoubleOrNull(j["Berat"] ?? j["berat"]) ?? 0,
  };
}

// ── API calls ────────────────────────────────────────────────────────────────

/** GET /mst-mesin/packing — mesin packing (IdBagianMesin = 6). */
export async function fetchPackingMesin(
  token: string | undefined,
): Promise<PackingMesinResult> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    data?: Record<string, unknown>[];
    activeShift?: Record<string, unknown>;
  }>("/mst-mesin/packing", t);
  const mesinList = (res.data.data ?? []).map(parsePackingMesinInfo);
  const shiftRaw = res.data.activeShift;
  const activeShift: PackingActiveShift | null = shiftRaw
    ? {
        shift: asInt(shiftRaw["shift"] ?? shiftRaw["noShift"], 1),
        hourStart: asString(shiftRaw["hourStart"]).slice(0, 5),
        hourEnd: asString(shiftRaw["hourEnd"]).slice(0, 5),
      }
    : null;
  return { mesinList, activeShift };
}

/** GET /packing-type — jenis output Packing (MstBarangJadi aktif). */
export async function fetchPackingTypes(
  token: string | undefined,
): Promise<PackingType[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ data?: Record<string, unknown>[] }>(
    "/packing-type",
    t,
  );
  const rows = res.data.data ?? [];
  return rows.map(parsePackingType).filter((x) => x.idBj !== 0);
}

/** GET /mst-furniture-material/cabinet-materials?idWarehouse=5. */
export async function fetchCabinetMaterials(
  token: string | undefined,
  idWarehouse = 5,
): Promise<CabinetMaterialMaster[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ data?: Record<string, unknown>[] }>(
    `/mst-furniture-material/cabinet-materials?idWarehouse=${idWarehouse}`,
    t,
  );
  const rows = res.data.data ?? [];
  return rows.map(parseCabinetMaterialMaster).filter((x) => x.idCabinetMaterial !== 0);
}

export async function fetchPackingList(
  token: string | undefined,
  params: FetchPackingListParams = {},
): Promise<FetchPackingListResult> {
  const t = requireToken(token);
  const qp = new URLSearchParams();
  qp.set("page", String(params.page ?? 1));
  qp.set("pageSize", String(params.pageSize ?? 20));
  if (params.search) qp.set("search", params.search);
  if (params.shift != null) qp.set("shift", String(params.shift));
  if (params.idMesin != null) qp.set("idMesin", String(params.idMesin));
  if (params.tanggal) qp.set("tanggal", params.tanggal);

  const res = await apiFetchAuth<{
    data?: Record<string, unknown>[];
    meta?: { page?: number; totalPages?: number; total?: number };
    totalData?: number;
  }>(`/production/packing?${qp.toString()}`, t);

  const items = (res.data.data ?? []).map(parsePackingProduction);
  const meta = res.data.meta ?? {};
  return {
    items,
    page: asInt(meta.page, params.page ?? 1),
    totalPages: asInt(meta.totalPages, 1),
    total: asInt(res.data.totalData ?? meta.total, 0),
  };
}

export async function fetchPackingOne(
  token: string | undefined,
  noProduksi: string,
): Promise<PackingProduction | null> {
  const result = await fetchPackingList(token, {
    page: 1,
    pageSize: 1,
    search: noProduksi.trim(),
  });
  return result.items[0] ?? null;
}

export async function createPacking(
  token: string | undefined,
  payload: CreatePackingPayload,
): Promise<PackingProduction> {
  const t = requireToken(token);
  const body: Record<string, unknown> = {
    tglProduksi: payload.tglProduksi,
    idMesin: payload.idMesin,
    idOperators: payload.idOperators,
    shift: payload.shift,
    outputJenisId: payload.outputJenisId,
    idRegu: payload.idRegu,
    hourStart: payload.hourStart ? normalizeTime(payload.hourStart) : null,
    hourEnd: payload.hourEnd ? normalizeTime(payload.hourEnd) : null,
  };
  if (payload.jamKerja != null) body.jamKerja = payload.jamKerja;
  if (payload.hourMeter != null) body.hourMeter = payload.hourMeter;

  const res = await apiFetchAuth<{
    data?: Record<string, unknown>;
    message?: string;
  }>("/production/packing", t, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (res.status !== 201 && res.status !== 200) {
    throw new ApiRequestError(
      res.data.message ?? `Gagal membuat produksi (${res.status})`,
    );
  }
  if (!res.data.data) throw new ApiRequestError("Response create tidak valid");
  return parsePackingProduction(res.data.data);
}

export async function updatePacking(
  token: string | undefined,
  noProduksi: string,
  payload: UpdatePackingPayload,
): Promise<PackingProduction> {
  const t = requireToken(token);
  const body: Record<string, unknown> = {};
  if (payload.tglProduksi) body.tglProduksi = payload.tglProduksi;
  if (payload.idMesin != null) body.idMesin = payload.idMesin;
  if (payload.idOperator != null) body.idOperator = payload.idOperator;
  if (payload.jamKerja != null) body.jamKerja = payload.jamKerja;
  if (payload.shift != null) body.shift = payload.shift;
  if (payload.hourStart) body.hourStart = normalizeTime(payload.hourStart);
  if (payload.hourEnd) body.hourEnd = normalizeTime(payload.hourEnd);
  if (payload.outputJenisId != null) body.outputJenisId = payload.outputJenisId;
  if (payload.hourMeter != null) body.hourMeter = payload.hourMeter;
  if (payload.checkBy1) body.checkBy1 = payload.checkBy1;
  if (payload.checkBy2) body.checkBy2 = payload.checkBy2;
  if (payload.approveBy) body.approveBy = payload.approveBy;

  const res = await apiFetchAuth<{
    data?: Record<string, unknown>;
    message?: string;
  }>(`/production/packing/${encodeURIComponent(noProduksi)}`, t, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  if (res.status !== 200) {
    throw new ApiRequestError(
      res.data.message ?? `Gagal mengubah produksi (${res.status})`,
    );
  }
  if (!res.data.data)
    throw new ApiRequestError("Response update tidak mengandung data");
  return parsePackingProduction(res.data.data);
}

export async function deletePacking(
  token: string | undefined,
  noProduksi: string,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ message?: string; error?: string }>(
    `/production/packing/${encodeURIComponent(noProduksi)}`,
    t,
    { method: "DELETE" },
  );
  if (res.status !== 200) {
    const msg =
      res.data.message ??
      res.data.error ??
      `Gagal menghapus (${res.status})`;
    throw new ApiRequestError(msg);
  }
}

export async function completePacking(
  token: string | undefined,
  noProduksi: string,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ message?: string; success?: boolean }>(
    `/production/packing/${encodeURIComponent(noProduksi)}/complete`,
    t,
    { method: "PATCH" },
  );
  if (res.status !== 200 || res.data.success === false) {
    throw new ApiRequestError(
      res.data.message ?? `Gagal menyelesaikan (${res.status})`,
    );
  }
}

export async function uncompletePacking(
  token: string | undefined,
  noProduksi: string,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ message?: string; success?: boolean }>(
    `/production/packing/${encodeURIComponent(noProduksi)}/uncomplete`,
    t,
    { method: "PATCH" },
  );
  if (res.status !== 200 || res.data.success === false) {
    throw new ApiRequestError(
      res.data.message ?? `Gagal membuka kunci (${res.status})`,
    );
  }
}

export async function splitPackingTime(
  token: string | undefined,
  idMesin: number,
  tanggal: string,
  payload: { hourStart: string; outputJenisId: number },
): Promise<{ noProduksi?: string }> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    message?: string;
    data?: Record<string, unknown>;
    noProduksi?: string;
  }>(
    `/production/packing/split-time/${idMesin}/${encodeURIComponent(tanggal)}`,
    t,
    {
      method: "POST",
      body: JSON.stringify({
        hourStart: normalizeTime(payload.hourStart),
        outputJenisId: payload.outputJenisId,
      }),
    },
  );
  if (res.status < 200 || res.status >= 300) {
    throw new ApiRequestError(
      res.data.message ?? `Gagal ganti produksi (${res.status})`,
    );
  }
  const data = res.data.data ?? {};
  const header = (data["header"] ?? {}) as Record<string, unknown>;
  return {
    noProduksi:
      asString(
        header["NoProduksi"] ??
          data["noProduksi"] ??
          data["newNoProduksi"] ??
          res.data.noProduksi,
      ) || undefined,
  };
}

export async function fetchPackingInputs(
  token: string | undefined,
  noProduksi: string,
): Promise<PackingInputs> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ data?: Record<string, unknown> }>(
    `/production/packing/${encodeURIComponent(noProduksi)}/inputs`,
    t,
  );
  if (!res.data.data) throw new ApiRequestError("Response inputs tidak valid");
  return parsePackingInputs(res.data.data);
}

export async function fetchPackingOutputs(
  token: string | undefined,
  noProduksi: string,
): Promise<PackingOutput[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ data?: Record<string, unknown>[] }>(
    `/production/packing/${encodeURIComponent(noProduksi)}/outputs`,
    t,
  );
  return (res.data.data ?? []).map((j) => parsePackingOutput(j, "bj"));
}

export async function submitPackingInputs(
  token: string | undefined,
  noProduksi: string,
  payload: SubmitInputsPayload,
): Promise<Record<string, unknown>> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>(
    `/production/packing/${encodeURIComponent(noProduksi)}/inputs`,
    t,
    { method: "POST", body: JSON.stringify(payload) },
  );
  if (res.status === 422 || res.status === 400) {
    throw new ApiRequestError(res.data.message ?? "Data tidak valid");
  }
  if (res.status !== 200) {
    throw new ApiRequestError(
      res.data.message ?? `Gagal submit inputs (${res.status})`,
    );
  }
  if (res.data.success === false) {
    throw new ApiRequestError(res.data.message ?? "Submit gagal");
  }
  return res.data as Record<string, unknown>;
}

export async function deletePackingInputs(
  token: string | undefined,
  noProduksi: string,
  payload: DeleteInputsPayload,
): Promise<Record<string, unknown>> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ success?: boolean; message?: string }>(
    `/production/packing/${encodeURIComponent(noProduksi)}/inputs`,
    t,
    { method: "DELETE", body: JSON.stringify(payload) },
  );
  if (res.status === 200 || res.status === 404) {
    return res.data as Record<string, unknown>;
  }
  throw new ApiRequestError(
    res.data.message ?? `Gagal delete inputs (${res.status})`,
  );
}

/**
 * GET /production/lookup-label/:labelCode — lookup label generik
 * (prefix BB. = Furniture WIP). Response: { success, message, tableName,
 * totalRecords, data: [...] }; 404 = label tidak ada / sudah dipakai.
 */
export async function lookupFwipLabel(
  token: string | undefined,
  labelCode: string,
): Promise<{ found: boolean; body: Record<string, unknown> }> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Record<string, unknown>>(
    `/production/lookup-label/${encodeURIComponent(labelCode)}`,
    t,
  );
  if (res.status === 200) return { found: true, body: res.data };
  if (res.status === 404) return { found: false, body: res.data };
  throw new ApiRequestError(
    asString(res.data.message) || `Gagal lookup label (HTTP ${res.status})`,
  );
}

/**
 * Create label output Barang Jadi — POST /labels/packing
 * (outputCode = NoPacking, prefix BD.).
 */
export async function createBjOutput(
  token: string | undefined,
  noProduksi: string,
  idBj: number,
  tanggal: string,
  pcs: number,
): Promise<string> {
  const t = requireToken(token);
  const payload = {
    header: {
      IdBJ: idBj,
      Pcs: pcs,
      DateCreate: tanggal,
    },
    outputCode: noProduksi,
  };
  const res = await apiFetchAuth<{
    data?: Record<string, unknown> | Record<string, unknown>[];
    message?: string;
  }>("/labels/packing", t, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (res.status !== 200 && res.status !== 201) {
    throw new ApiRequestError(
      res.data.message ?? `Gagal membuat label (${res.status})`,
    );
  }
  const data = res.data.data;
  const headers: Record<string, unknown>[] = [];
  if (data && !Array.isArray(data)) {
    const h = data["headers"];
    if (Array.isArray(h)) headers.push(...(h as Record<string, unknown>[]));
    else headers.push(data);
  } else if (Array.isArray(data)) {
    for (const first of data) {
      const h = first["headers"];
      if (Array.isArray(h)) headers.push(...(h as Record<string, unknown>[]));
      else headers.push(first);
    }
  }
  const first = headers[0] ?? {};
  return asString(first["NoBJ"] ?? first["noBJ"]);
}

export async function markLabelPrinted(
  token: string | undefined,
  noLabel: string,
): Promise<number | null> {
  const t = requireToken(token);
  const path = `/labels/packing/${encodeURIComponent(noLabel)}/print`;
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

export async function deleteOutputLabel(
  token: string | undefined,
  noLabel: string,
): Promise<void> {
  const t = requireToken(token);
  const path = `/labels/packing/${encodeURIComponent(noLabel)}`;
  const res = await apiFetchAuth<{ success?: boolean; message?: string }>(
    path,
    t,
    { method: "DELETE" },
  );
  if (res.status !== 200 && res.status !== 202 && res.status !== 204) {
    throw new ApiRequestError(
      res.data.message ?? `Gagal hapus label (${res.status})`,
    );
  }
}

export async function acquireLabelPrintLock(
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

export async function releaseLabelPrintLock(
  token: string | undefined,
  noLabel: string,
): Promise<void> {
  const t = requireToken(token);
  try {
    await apiFetchAuth(`/labels/${encodeURIComponent(noLabel)}/print-lock`, t, {
      method: "DELETE",
    });
  } catch {
    // best-effort
  }
}

export async function fetchOutputLabelPdfBase64(
  token: string | undefined,
  noLabel: string,
): Promise<string> {
  const t = requireToken(token);
  const base = getBackendBaseUrl();
  const path = `/api/labels/packing/${encodeURIComponent(noLabel)}/pdf`;
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
      /* ignore */
    }
    throw new ApiRequestError(message);
  }
  const buf = Buffer.from(await response.arrayBuffer());
  return buf.toString("base64");
}

/** GET /production/packing/stok — stok Barang Jadi sisa per jenis. */
export async function fetchPackingStok(
  token: string | undefined,
): Promise<StokBjItem[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ data?: Record<string, unknown>[] }>(
    "/production/packing/stok",
    t,
  );
  return (res.data.data ?? []).map(parseStokBjItem);
}

/** GET /production/packing/:idbj/label — label sisa per jenis. */
export async function fetchPackingStokLabels(
  token: string | undefined,
  idBj: number,
): Promise<StokBjLabel[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ data?: Record<string, unknown>[] }>(
    `/production/packing/${idBj}/label`,
    t,
  );
  return (res.data.data ?? []).map(parseStokBjLabel);
}

export { apiFetch, ApiRequestError };
