import { getBackendBaseUrl, apiFetch, apiFetchAuth, ApiRequestError } from "@/services/api";

// ── Types ────────────────────────────────────────────────────────────────────

export type MachineStatus = "active" | "pending" | "inactive";

export type GilinganProduction = {
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
  jmlhAnggota: number | null;
  hadir: number | null;
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

export type GilinganMesinInfo = {
  idMesin: number;
  namaMesin: string;
  bagian: string | null;
  target: number | null;
  noProduksi: string | null;
  tglProduksi: string | null;
  outputJenisId: number | null;
  outputJenisNama: string | null;
  outputJenisItemCode: string | null;
  idOperator: number | null;
  namaOperator: string | null;
  idRegu: number | null;
  namaRegu: string | null;
  shift: number | null;
  hourStart: string | null;
  hourEnd: string | null;
  machineStatus: MachineStatus;
};

export type GilinganActiveShift = {
  shift: number;
  hourStart: string;
  hourEnd: string;
};

export type GilinganMesinResult = {
  mesinList: GilinganMesinInfo[];
  activeShift: GilinganActiveShift | null;
};

export type GilinganType = {
  idGilingan: number;
  nama: string;
  enable: boolean;
};

export type GilinganOutput = {
  noProduksi: string;
  noGilingan: string;
  idJenis: number;
  namaJenis: string;
  hasBeenPrinted: number;
  berat: number;
};

export type GilinganBrokerItem = {
  noBroker: string | null;
  noSak: number | null;
  noBrokerPartial: string | null;
  berat: number | null;
  beratAct: number | null;
  isPartial: boolean | null;
  idJenis: number | null;
  namaJenis: string | null;
  datetimeInput: string | null;
};

export type GilinganBeratItem = {
  noLabel: string | null;
  noPartial: string | null;
  berat: number | null;
  beratAct: number | null;
  isPartial: boolean | null;
  idJenis: number | null;
  namaJenis: string | null;
  datetimeInput: string | null;
};

export type GilinganInputs = {
  broker: GilinganBrokerItem[];
  bonggolan: GilinganBeratItem[];
  crusher: GilinganBeratItem[];
  reject: GilinganBeratItem[];
  summary: Record<string, number>;
};

export type FetchGilinganListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  shift?: number;
  idMesin?: number;
  tanggal?: string;
};

export type FetchGilinganListResult = {
  items: GilinganProduction[];
  page: number;
  totalPages: number;
  total: number;
};

export type CreateGilinganPayload = {
  tglProduksi: string;
  idMesin: number;
  idOperators: number[];
  jamKerja?: number | string;
  shift: number;
  outputJenisId?: number;
  hourStart?: string;
  hourEnd?: string;
  hadir?: number;
  jmlhAnggota?: number;
  hourMeter?: number;
  idRegu?: number;
  checkBy1?: string;
  checkBy2?: string;
  approveBy?: string;
};

export type UpdateGilinganPayload = {
  tglProduksi?: string;
  idMesin?: number;
  idOperator?: number;
  jamKerja?: number | string;
  shift?: number;
  hourStart?: string;
  hourEnd?: string;
  hadir?: number;
  idRegu?: number;
  outputJenisId?: number;
  jmlhAnggota?: number;
  hourMeter?: number;
  checkBy1?: string;
  checkBy2?: string;
  approveBy?: string;
};

export type SubmitInputsPayload = {
  broker?: { noBroker: string | null; noSak: number | null }[];
  bonggolan?: { noBonggolan: string | null }[];
  crusher?: { noCrusher: string | null }[];
  reject?: { noReject: string | null }[];
  brokerPartial?: (
    | { noBroker: string | null; noSak: number | null; berat: number | null }
    | { noBrokerPartial: string }
  )[];
  rejectPartial?: (
    | { noReject: string | null; berat: number | null }
    | { noRejectPartial: string }
  )[];
};

export type DeleteInputsPayload = SubmitInputsPayload;

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
  if (v == null) return null;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true" || s === "1") return true;
    if (s === "false" || s === "0") return false;
  }
  return null;
}

function asDateOrNull(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") {
    const s = v.trim();
    return s === "" ? null : s;
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

function pickFirst(j: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    if (j[k] !== undefined && j[k] !== null && j[k] !== "") return j[k];
  }
  return null;
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

// ── Parsers ──────────────────────────────────────────────────────────────────

export function parseGilinganProduction(
  j: Record<string, unknown>,
): GilinganProduction {
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
  const namaRegu = j["NamaRegu"] as string | null | undefined;

  return {
    noProduksi: asString(j["NoProduksi"]),
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
    jmlhAnggota: asIntOrNull(j["JmlhAnggota"]),
    hadir: asIntOrNull(j["Hadir"]),
    hourMeter: asDoubleOrNull(j["HourMeter"]),
    hourStart: asTimeHHmm(j["HourStart"]),
    hourEnd: asTimeHHmm(j["HourEnd"]),
    outputJenisId: asIntOrNull(j["OutputJenisId"]),
    outputJenisNama: outputJenisNama || null,
    isLocked: asBool(j["IsLocked"]),
    lastClosedDate: asDateOrNull(j["LastClosedDate"]),
    idRegu: asIntOrNull(j["IdRegu"]),
    namaRegu: namaRegu ?? null,
    isComplete: asBool(j["IsComplete"]) || asString(j["status"]) === "complete",
    produksiStatus:
      asString(j["status"]) ||
      (asBool(j["IsComplete"]) ? "complete" : "pending"),
  };
}

export function parseGilinganMesinInfo(
  j: Record<string, unknown>,
): GilinganMesinInfo {
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
    idOperator: asIntOrNull(j["IdOperator"]),
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

export function parseGilinganType(j: Record<string, unknown>): GilinganType {
  return {
    idGilingan: asInt(j["IdGilingan"] ?? j["idGilingan"]),
    nama: asString(j["NamaGilingan"] ?? j["Nama"] ?? j["nama"]),
    enable: asBool(j["Enable"] ?? j["enable"], true),
  };
}

export function parseGilinganOutput(j: Record<string, unknown>): GilinganOutput {
  return {
    noProduksi: asString(j["NoProduksi"] ?? j["noProduksi"]),
    noGilingan: asString(j["NoGilingan"] ?? j["noGilingan"]),
    idJenis: asInt(j["IdJenis"] ?? j["idJenis"]),
    namaJenis: asString(j["NamaJenis"] ?? j["namaJenis"]) || "-",
    hasBeenPrinted: asInt(j["HasBeenPrinted"] ?? j["hasBeenPrinted"]),
    berat: asDoubleOrNull(j["Berat"] ?? j["berat"]) ?? 0,
  };
}

function parseBrokerItem(j: Record<string, unknown>): GilinganBrokerItem {
  return {
    noBroker: strOr(j["noBroker"] ?? j["NoBroker"]),
    noSak: asIntOrNull(j["noSak"] ?? j["NoSak"]),
    noBrokerPartial: strOr(
      j["noBrokerPartial"] ?? j["NoBrokerPartial"] ?? j["noPartial"],
    ),
    berat: asDoubleOrNull(j["berat"] ?? j["Berat"]),
    beratAct: asDoubleOrNull(j["beratAct"] ?? j["BeratAct"]),
    isPartial: asBoolOrNull(j["isPartial"] ?? j["IsPartial"]),
    idJenis: asIntOrNull(j["idJenis"] ?? j["IdJenis"]),
    namaJenis: strOr(j["namaJenis"] ?? j["NamaJenis"]),
    datetimeInput: asDateOrNull(j["datetimeInput"] ?? j["DatetimeInput"]),
  };
}

function parseBeratItem(j: Record<string, unknown>): GilinganBeratItem {
  const noLabel = strOr(
    pickFirst(j, [
      "noBonggolan",
      "NoBonggolan",
      "noCrusher",
      "NoCrusher",
      "noReject",
      "NoReject",
      "noLabel",
    ]),
  );
  const noPartial = strOr(
    pickFirst(j, [
      "noRejectPartial",
      "NoRejectPartial",
      "noBrokerPartial",
      "NoBrokerPartial",
      "noPartial",
      "NoPartial",
    ]),
  );
  return {
    noLabel,
    noPartial,
    berat: asDoubleOrNull(j["berat"] ?? j["Berat"]),
    beratAct: asDoubleOrNull(j["beratAct"] ?? j["BeratAct"]),
    isPartial: asBoolOrNull(j["isPartial"] ?? j["IsPartial"]),
    idJenis: asIntOrNull(j["idJenis"] ?? j["IdJenis"]),
    namaJenis: strOr(j["namaJenis"] ?? j["NamaJenis"]),
    datetimeInput: asDateOrNull(j["datetimeInput"] ?? j["DatetimeInput"]),
  };
}

export function parseGilinganInputs(j: Record<string, unknown>): GilinganInputs {
  const listOf = <T>(v: unknown, f: (m: Record<string, unknown>) => T): T[] => {
    if (!Array.isArray(v)) return [];
    return v.map((e) => f(e as Record<string, unknown>));
  };
  const summaryRaw = (j["summary"] ?? {}) as Record<string, unknown>;
  const summary: Record<string, number> = {};
  for (const [k, v] of Object.entries(summaryRaw)) summary[k] = asInt(v);

  return {
    broker: listOf(j["broker"] ?? j["Broker"], parseBrokerItem),
    bonggolan: listOf(j["bonggolan"] ?? j["Bonggolan"], parseBeratItem),
    crusher: listOf(j["crusher"] ?? j["Crusher"], parseBeratItem),
    reject: listOf(j["reject"] ?? j["Reject"], parseBeratItem),
    summary,
  };
}

// ── API calls ────────────────────────────────────────────────────────────────

export async function fetchGilinganMesin(
  token: string | undefined,
): Promise<GilinganMesinResult> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    data?: Record<string, unknown>[];
    activeShift?: Record<string, unknown>;
  }>("/mst-mesin/gilingan", t);
  const mesinList = (res.data.data ?? []).map(parseGilinganMesinInfo);
  const shiftRaw = res.data.activeShift;
  const activeShift: GilinganActiveShift | null = shiftRaw
    ? {
        shift: asInt(shiftRaw["shift"] ?? shiftRaw["noShift"], 1),
        hourStart: asString(shiftRaw["hourStart"]).slice(0, 5),
        hourEnd: asString(shiftRaw["hourEnd"]).slice(0, 5),
      }
    : null;
  return { mesinList, activeShift };
}

/** GET /gilingan-type — jenis output Gilingan (MstGilingan aktif). */
export async function fetchGilinganTypes(
  token: string | undefined,
): Promise<GilinganType[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ data?: Record<string, unknown>[] }>(
    "/gilingan-type",
    t,
  );
  const rows = res.data.data ?? [];
  return rows.map(parseGilinganType).filter((x) => x.idGilingan !== 0);
}

export async function fetchGilinganList(
  token: string | undefined,
  params: FetchGilinganListParams = {},
): Promise<FetchGilinganListResult> {
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
  }>(`/production/gilingan?${qp.toString()}`, t);

  const items = (res.data.data ?? []).map(parseGilinganProduction);
  const meta = res.data.meta ?? {};
  return {
    items,
    page: asInt(meta.page, params.page ?? 1),
    totalPages: asInt(meta.totalPages, 1),
    total: asInt(res.data.totalData ?? meta.total, 0),
  };
}

export async function fetchGilinganOne(
  token: string | undefined,
  noProduksi: string,
): Promise<GilinganProduction | null> {
  const result = await fetchGilinganList(token, {
    page: 1,
    pageSize: 1,
    search: noProduksi.trim(),
  });
  return result.items[0] ?? null;
}

export async function createGilingan(
  token: string | undefined,
  payload: CreateGilinganPayload,
): Promise<GilinganProduction> {
  const t = requireToken(token);
  const body: Record<string, unknown> = {
    tanggal: payload.tglProduksi,
    idMesin: payload.idMesin,
    idOperators: payload.idOperators,
    shift: payload.shift,
  };
  if (payload.jamKerja != null) body.jam = payload.jamKerja;
  if (payload.outputJenisId != null) body.outputJenisId = payload.outputJenisId;
  if (payload.hourStart) body.hourStart = normalizeTime(payload.hourStart);
  if (payload.hourEnd) body.hourEnd = normalizeTime(payload.hourEnd);
  if (payload.hadir != null) body.hadir = payload.hadir;
  if (payload.jmlhAnggota != null) body.jmlhAnggota = payload.jmlhAnggota;
  if (payload.hourMeter != null) body.hourMeter = payload.hourMeter;
  if (payload.idRegu != null) body.idRegu = payload.idRegu;
  if (payload.checkBy1) body.checkBy1 = payload.checkBy1;
  if (payload.checkBy2) body.checkBy2 = payload.checkBy2;
  if (payload.approveBy) body.approveBy = payload.approveBy;

  const res = await apiFetchAuth<{
    data?: Record<string, unknown>;
    message?: string;
  }>("/production/gilingan", t, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (res.status !== 201 && res.status !== 200) {
    throw new ApiRequestError(
      res.data.message ?? `Gagal membuat produksi (${res.status})`,
    );
  }
  if (!res.data.data) throw new ApiRequestError("Response create tidak valid");
  return parseGilinganProduction(res.data.data);
}

export async function updateGilingan(
  token: string | undefined,
  noProduksi: string,
  payload: UpdateGilinganPayload,
): Promise<GilinganProduction> {
  const t = requireToken(token);
  const body: Record<string, string> = {};
  if (payload.tglProduksi) body.tglProduksi = payload.tglProduksi;
  if (payload.idMesin != null) body.idMesin = String(payload.idMesin);
  if (payload.idOperator != null) body.idOperator = String(payload.idOperator);
  if (payload.jamKerja != null) body.jam = String(payload.jamKerja);
  if (payload.shift != null) body.shift = String(payload.shift);
  if (payload.hourStart) body.hourStart = normalizeTime(payload.hourStart);
  if (payload.hourEnd) body.hourEnd = normalizeTime(payload.hourEnd);
  if (payload.hadir != null) body.hadir = String(payload.hadir);
  if (payload.idRegu != null) body.idRegu = String(payload.idRegu);
  if (payload.outputJenisId != null)
    body.outputJenisId = String(payload.outputJenisId);
  if (payload.jmlhAnggota != null)
    body.jmlhAnggota = String(payload.jmlhAnggota);
  if (payload.hourMeter != null) body.hourMeter = String(payload.hourMeter);
  if (payload.checkBy1) body.checkBy1 = payload.checkBy1;
  if (payload.checkBy2) body.checkBy2 = payload.checkBy2;
  if (payload.approveBy) body.approveBy = payload.approveBy;

  const res = await apiFetchAuth<{
    data?: Record<string, unknown>;
    message?: string;
  }>(`/production/gilingan/${encodeURIComponent(noProduksi)}`, t, {
    method: "PUT",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });
  if (res.status !== 200) {
    throw new ApiRequestError(
      res.data.message ?? `Gagal mengubah produksi (${res.status})`,
    );
  }
  if (!res.data.data)
    throw new ApiRequestError("Response update tidak mengandung data");
  return parseGilinganProduction(res.data.data);
}

export async function deleteGilingan(
  token: string | undefined,
  noProduksi: string,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ message?: string; error?: string }>(
    `/production/gilingan/${encodeURIComponent(noProduksi)}`,
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

export async function completeGilingan(
  token: string | undefined,
  noProduksi: string,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ message?: string }>(
    `/production/gilingan/${encodeURIComponent(noProduksi)}/complete`,
    t,
    { method: "PATCH" },
  );
  if (res.status !== 200) {
    throw new ApiRequestError(
      res.data.message ?? `Gagal menyelesaikan (${res.status})`,
    );
  }
}

export async function uncompleteGilingan(
  token: string | undefined,
  noProduksi: string,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ message?: string }>(
    `/production/gilingan/${encodeURIComponent(noProduksi)}/uncomplete`,
    t,
    { method: "PATCH" },
  );
  if (res.status !== 200) {
    throw new ApiRequestError(
      res.data.message ?? `Gagal membuka kunci (${res.status})`,
    );
  }
}

export async function splitGilinganTime(
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
    `/production/gilingan/split-time/${idMesin}/${encodeURIComponent(tanggal)}`,
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
  return {
    noProduksi:
      asString(
        data["noProduksi"] ?? data["newNoProduksi"] ?? res.data.noProduksi,
      ) || undefined,
  };
}

export async function fetchGilinganInputs(
  token: string | undefined,
  noProduksi: string,
): Promise<GilinganInputs> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ data?: Record<string, unknown> }>(
    `/production/gilingan/${encodeURIComponent(noProduksi)}/inputs`,
    t,
  );
  if (!res.data.data) throw new ApiRequestError("Response inputs tidak valid");
  return parseGilinganInputs(res.data.data);
}

export async function fetchGilinganOutputs(
  token: string | undefined,
  noProduksi: string,
): Promise<GilinganOutput[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ data?: Record<string, unknown>[] }>(
    `/production/gilingan/${encodeURIComponent(noProduksi)}/outputs`,
    t,
  );
  return (res.data.data ?? []).map(parseGilinganOutput);
}

export async function submitGilinganInputs(
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
    `/production/gilingan/${encodeURIComponent(noProduksi)}/inputs`,
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

export async function deleteGilinganInputs(
  token: string | undefined,
  noProduksi: string,
  payload: DeleteInputsPayload,
): Promise<Record<string, unknown>> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ success?: boolean; message?: string }>(
    `/production/gilingan/${encodeURIComponent(noProduksi)}/inputs`,
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

/** Create Gilingan label output — POST /labels/gilingan (berat-only). */
export async function createGilinganOutput(
  token: string | undefined,
  noProduksi: string,
  idJenis: number,
  tanggal: string,
  berat: number,
): Promise<string> {
  const t = requireToken(token);
  const payload = {
    header: {
      IdGilingan: idJenis,
      DateCreate: tanggal,
      Berat: berat,
    },
    outputCode: noProduksi,
  };
  const res = await apiFetchAuth<{
    data?: Record<string, unknown> | Record<string, unknown>[];
    message?: string;
  }>("/labels/gilingan", t, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (res.status !== 200 && res.status !== 201) {
    throw new ApiRequestError(
      res.data.message ?? `Gagal membuat label (${res.status})`,
    );
  }
  const data = res.data.data;
  if (data && !Array.isArray(data)) {
    const header = (data["header"] ?? {}) as Record<string, unknown>;
    return asString(
      header["NoGilingan"] ??
        header["noGilingan"] ??
        data["NoGilingan"] ??
        data["noGilingan"],
    );
  }
  if (Array.isArray(data) && data.length > 0) {
    const first = data[0];
    const header = (first["header"] ?? {}) as Record<string, unknown>;
    return asString(
      header["NoGilingan"] ??
        header["noGilingan"] ??
        first["NoGilingan"] ??
        first["noGilingan"],
    );
  }
  return "";
}

export async function lookupGilinganLabel(
  token: string | undefined,
  labelCode: string,
): Promise<{ found: boolean; body: Record<string, unknown> }> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Record<string, unknown>>(
    `/production/gilingan/validate-label/${encodeURIComponent(labelCode)}`,
    t,
  );
  if (res.status === 200) return { found: true, body: res.data };
  if (res.status === 404) return { found: false, body: res.data };
  throw new ApiRequestError(
    asString(res.data.message) || `Gagal lookup label (HTTP ${res.status})`,
  );
}

export async function markGilinganLabelPrinted(
  token: string | undefined,
  noGilingan: string,
): Promise<number | null> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>(`/labels/gilingan/${encodeURIComponent(noGilingan)}/print`, t, {
    method: "PATCH",
  });
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

export async function deleteGilinganLabel(
  token: string | undefined,
  noGilingan: string,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ success?: boolean; message?: string }>(
    `/labels/gilingan/${encodeURIComponent(noGilingan)}`,
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

export async function fetchGilinganLabelPdfBase64(
  token: string | undefined,
  noGilingan: string,
): Promise<string> {
  const t = requireToken(token);
  const base = getBackendBaseUrl();
  let response: Response;
  try {
    response = await fetch(
      `${base}/api/labels/gilingan/${encodeURIComponent(noGilingan)}/pdf`,
      {
        headers: { Authorization: `Bearer ${t}` },
        cache: "no-store",
      },
    );
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

export { apiFetch, ApiRequestError };
