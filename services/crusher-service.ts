import { getBackendBaseUrl, apiFetch, apiFetchAuth, ApiRequestError } from "@/services/api";

// ── Types ────────────────────────────────────────────────────────────────────

export type MachineStatus = "active" | "pending" | "inactive";

export type CrusherProduction = {
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

export type CrusherMesinInfo = {
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
  namaRegu: string | null;
  shift: number | null;
  hourStart: string | null;
  hourEnd: string | null;
  machineStatus: MachineStatus;
};

export type CrusherActiveShift = {
  shift: number;
  hourStart: string;
  hourEnd: string;
};

export type CrusherMesinResult = {
  mesinList: CrusherMesinInfo[];
  activeShift: CrusherActiveShift | null;
};

export type CrusherType = {
  idCrusher: number;
  namaCrusher: string;
  enable: boolean;
};

export type CrusherOutput = {
  noProduksi: string;
  noCrusher: string;
  idJenis: number;
  namaJenis: string;
  hasBeenPrinted: number;
  berat: number;
};

export type CrusherBbItem = {
  noBahanBaku: string | null;
  noPallet: number | null;
  noSak: number | null;
  noBBPartial: string | null;
  berat: number | null;
  beratAct: number | null;
  isPartial: boolean | null;
  dateUsage: string | null;
  idJenis: number | null;
  namaJenis: string | null;
};

export type CrusherBonggolanItem = {
  noBonggolan: string | null;
  berat: number | null;
  beratAct: number | null;
  idJenis: number | null;
  namaJenis: string | null;
  dateUsage: string | null;
};

export type CrusherInputs = {
  bb: CrusherBbItem[];
  bonggolan: CrusherBonggolanItem[];
  summary: Record<string, number>;
};

export type CrusherFormulaItem = {
  idFormula: number;
  kategoriKode: string;
  kategoriNama: string;
  prefixLabel: string;
  inputId: number;
  inputNama: string;
};

export type CrusherFormulaOutput = {
  idJenis: number;
  namaJenis: string;
  formulas: CrusherFormulaItem[];
};

export type CrusherFormulaResult = {
  kodes: Set<string>;
  outputs: CrusherFormulaOutput[];
};

// ── Parsers ──────────────────────────────────────────────────────────────────

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
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) {
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    }
  }
  return null;
}

function parseStatus(v: unknown): MachineStatus {
  const s = v == null ? "" : String(v).toLowerCase();
  if (s === "current" || s === "active" || s === "aktif") return "active";
  if (s === "pending") return "pending";
  return "inactive";
}

// ── Entity parsers ───────────────────────────────────────────────────────────

export function parseCrusherProduction(j: Record<string, unknown>): CrusherProduction {
  const hm = asDoubleOrNull(j["HourMeter"]);

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
  // Backend crusher pakai kolom `Tanggal` (bukan TglProduksi)
  const tanggal = j["Tanggal"] ?? j["TglProduksi"] ?? j["tanggal"];

  return {
    noProduksi: asString(j["NoCrusherProduksi"] ?? j["NoProduksi"]),
    idOperators,
    namaOperators: asString(j["NamaOperators"] ?? j["NamaOperator"]),
    idMesin: asInt(j["IdMesin"]),
    namaMesin: asString(j["NamaMesin"]),
    tglProduksi: asDateOrNull(tanggal),
    jamKerja: asInt(j["JamKerja"] ?? j["Jam"]),
    shift: asInt(j["Shift"]),
    createBy: asString(j["CreateBy"]),
    checkBy1: checkBy1 || null,
    checkBy2: checkBy2 || null,
    approveBy: approveBy || null,
    jmlhAnggota: asIntOrNull(j["JmlhAnggota"]),
    hadir: asIntOrNull(j["Hadir"]),
    hourMeter: hm != null ? Math.round(hm) : null,
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

export function parseCrusherMesinInfo(j: Record<string, unknown>): CrusherMesinInfo {
  const s = (v: unknown): string | null => {
    const t = v == null ? "" : String(v).trim();
    return t || null;
  };
  return {
    idMesin: asInt(j["IdMesin"]),
    namaMesin: asString(j["NamaMesin"]),
    bagian: s(j["Bagian"]),
    target: asIntOrNull(j["Target"]),
    noProduksi: s(j["NoProduksi"] ?? j["NoCrusherProduksi"]),
    tglProduksi: asDateOrNull(j["TglProduksi"] ?? j["Tanggal"]),
    outputJenisId: asIntOrNull(j["OutputJenisId"]),
    outputJenisNama: s(j["OutputJenisNama"]),
    outputJenisItemCode: s(j["OutputJenisItemCode"]),
    idOperator: asIntOrNull(j["IdOperator"]),
    namaOperator: s(j["NamaOperator"]),
    namaRegu: s(j["NamaRegu"]),
    shift: asIntOrNull(j["Shift"]),
    hourStart: asTimeHHmm(j["HourStart"]),
    hourEnd: asTimeHHmm(j["HourEnd"]),
    machineStatus: parseStatus(j["status"] ?? j["machineStatus"] ?? j["MachineStatus"]),
  };
}

export function parseCrusherOutput(j: Record<string, unknown>): CrusherOutput {
  return {
    noProduksi: asString(j["NoProduksi"] ?? j["Produksi"]),
    noCrusher: asString(j["NoCrusher"]) || "-",
    idJenis: asInt(j["IdJenis"]),
    namaJenis: asString(j["NamaJenis"]) || "-",
    hasBeenPrinted: asInt(j["HasBeenPrinted"]),
    berat: asDoubleOrNull(j["Berat"]) ?? 0,
  };
}

function parseBbItem(j: Record<string, unknown>): CrusherBbItem {
  return {
    noBahanBaku: asString(j["NoBahanBaku"] ?? j["noBahanBaku"]) || null,
    noPallet: asIntOrNull(j["NoPallet"] ?? j["noPallet"]),
    noSak: asIntOrNull(j["NoSak"] ?? j["noSak"]),
    noBBPartial: asString(j["NoBBPartial"] ?? j["noBBPartial"]) || null,
    berat: asDoubleOrNull(j["Berat"] ?? j["berat"]),
    beratAct: asDoubleOrNull(j["BeratAct"] ?? j["beratAct"]),
    isPartial: asBoolOrNull(j["IsPartial"] ?? j["isPartial"]),
    dateUsage: asDateOrNull(j["DateUsage"] ?? j["dateUsage"]),
    idJenis: asIntOrNull(j["IdJenis"] ?? j["idJenis"]),
    namaJenis: asString(j["NamaJenis"] ?? j["namaJenis"]) || null,
  };
}

function parseBonggolanItem(j: Record<string, unknown>): CrusherBonggolanItem {
  return {
    noBonggolan: asString(j["NoBonggolan"] ?? j["noBonggolan"]) || null,
    berat: asDoubleOrNull(j["Berat"] ?? j["berat"]),
    beratAct: asDoubleOrNull(j["BeratAct"] ?? j["beratAct"]),
    idJenis: asIntOrNull(j["IdJenis"] ?? j["idJenis"]),
    namaJenis: asString(j["NamaJenis"] ?? j["namaJenis"]) || null,
    dateUsage: asDateOrNull(j["DateUsage"] ?? j["dateUsage"]),
  };
}

export function parseCrusherInputs(j: Record<string, unknown>): CrusherInputs {
  const listOf = <T>(v: unknown, f: (m: Record<string, unknown>) => T): T[] => {
    if (!Array.isArray(v)) return [];
    return v.map((e) => f(e as Record<string, unknown>));
  };
  const summaryRaw = (j["summary"] ?? {}) as Record<string, unknown>;
  const summary: Record<string, number> = {};
  for (const [k, v] of Object.entries(summaryRaw)) summary[k] = asInt(v);
  return {
    bb: listOf(j["bb"], parseBbItem),
    bonggolan: listOf(j["bonggolan"], parseBonggolanItem),
    summary,
  };
}

export function parseCrusherType(j: Record<string, unknown>): CrusherType {
  return {
    idCrusher: asInt(j["IdCrusher"] ?? j["idCrusher"]),
    namaCrusher: asString(j["NamaCrusher"] ?? j["namaCrusher"] ?? j["Nama"]),
    enable: asBool(j["Enable"] ?? j["enable"], true),
  };
}

// ── API calls ────────────────────────────────────────────────────────────────

function requireToken(token: string | undefined): string {
  if (!token) throw new ApiRequestError("Tidak terautentikasi");
  return token;
}

export async function fetchCrusherMesin(
  token: string | undefined,
): Promise<CrusherMesinResult> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    data?: Record<string, unknown>[];
    activeShift?: Record<string, unknown>;
  }>("/mst-mesin/crusher", t);
  const mesinList = (res.data.data ?? []).map(parseCrusherMesinInfo);
  const shiftRaw = res.data.activeShift;
  const activeShift: CrusherActiveShift | null = shiftRaw
    ? {
        shift: asInt(shiftRaw["shift"], 1),
        hourStart: asString(shiftRaw["hourStart"]).slice(0, 5),
        hourEnd: asString(shiftRaw["hourEnd"]).slice(0, 5),
      }
    : null;
  return { mesinList, activeShift };
}

export async function fetchCrusherTypes(token: string | undefined): Promise<CrusherType[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ data?: Record<string, unknown>[] }>("/crusher-type", t);
  return (res.data.data ?? []).map(parseCrusherType);
}

export type FetchCrusherListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  shift?: number;
  idMesin?: number;
  tanggal?: string;
};

export type FetchCrusherListResult = {
  items: CrusherProduction[];
  page: number;
  totalPages: number;
  total: number;
};

export async function fetchCrusherList(
  token: string | undefined,
  params: FetchCrusherListParams = {},
): Promise<FetchCrusherListResult> {
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
  }>(`/production/crusher?${qp.toString()}`, t);

  const items = (res.data.data ?? []).map(parseCrusherProduction);
  const meta = res.data.meta ?? {};
  return {
    items,
    page: asInt(meta.page, params.page ?? 1),
    totalPages: asInt(meta.totalPages, 1),
    total: asInt(res.data.totalData ?? meta.total, 0),
  };
}

export async function fetchCrusherOne(
  token: string | undefined,
  noProduksi: string,
): Promise<CrusherProduction | null> {
  const result = await fetchCrusherList(token, {
    page: 1,
    pageSize: 1,
    search: noProduksi.trim(),
  });
  return result.items[0] ?? null;
}

export type CreateCrusherPayload = {
  tanggal: string;
  idMesin: number;
  idOperators: number[];
  outputJenisId?: number;
  jamKerja: number | string;
  shift: number;
  checkBy1?: string;
  checkBy2?: string;
  approveBy?: string;
  jmlhAnggota?: number;
  hadir?: number;
  hourMeter?: number;
  hourStart?: string;
  hourEnd?: string;
  idRegu?: number;
};

export async function createCrusher(
  token: string | undefined,
  payload: CreateCrusherPayload,
): Promise<CrusherProduction> {
  const t = requireToken(token);
  const body: Record<string, unknown> = {
    tanggal: payload.tanggal,
    idMesin: payload.idMesin,
    idOperators: payload.idOperators,
    jamKerja: payload.jamKerja,
    shift: payload.shift,
  };
  if (payload.outputJenisId != null) body.outputJenisId = payload.outputJenisId;
  if (payload.checkBy1) body.checkBy1 = payload.checkBy1;
  if (payload.checkBy2) body.checkBy2 = payload.checkBy2;
  if (payload.approveBy) body.approveBy = payload.approveBy;
  if (payload.jmlhAnggota != null) body.jmlhAnggota = payload.jmlhAnggota;
  if (payload.hadir != null) body.hadir = payload.hadir;
  if (payload.hourMeter != null) body.hourMeter = payload.hourMeter;
  if (payload.hourStart) body.hourStart = payload.hourStart;
  if (payload.hourEnd) body.hourEnd = payload.hourEnd;
  if (payload.idRegu != null) body.idRegu = payload.idRegu;

  const res = await apiFetchAuth<{ data?: Record<string, unknown>; message?: string }>(
    "/production/crusher",
    t,
    { method: "POST", body: JSON.stringify(body) },
  );
  if (res.status !== 201 && res.status !== 200) {
    throw new ApiRequestError(res.data.message ?? `Gagal membuat produksi (${res.status})`);
  }
  if (!res.data.data) throw new ApiRequestError("Response create tidak valid");
  return parseCrusherProduction(res.data.data);
}

export type UpdateCrusherPayload = {
  tanggal?: string;
  idMesin?: number;
  idOperator?: number;
  jamKerja?: number | string;
  shift?: number;
  hourStart?: string;
  hourEnd?: string;
  checkBy1?: string;
  checkBy2?: string;
  approveBy?: string;
  jmlhAnggota?: number;
  hadir?: number;
  hourMeter?: number;
  idRegu?: number;
  outputJenisId?: number;
};

function normalizeTime(v: string): string {
  const t = v.trim();
  return t.length === 5 ? `${t}:00` : t;
}

export async function updateCrusher(
  token: string | undefined,
  noProduksi: string,
  payload: UpdateCrusherPayload,
): Promise<CrusherProduction> {
  const t = requireToken(token);
  const body: Record<string, string> = {};
  if (payload.tanggal) body.tanggal = payload.tanggal;
  if (payload.idMesin != null) body.idMesin = String(payload.idMesin);
  if (payload.idOperator != null) body.idOperator = String(payload.idOperator);
  if (payload.jamKerja != null) body.jamKerja = String(payload.jamKerja);
  if (payload.shift != null) body.shift = String(payload.shift);
  if (payload.hourStart) body.hourStart = normalizeTime(payload.hourStart);
  if (payload.hourEnd) body.hourEnd = normalizeTime(payload.hourEnd);
  if (payload.checkBy1) body.checkBy1 = payload.checkBy1;
  if (payload.checkBy2) body.checkBy2 = payload.checkBy2;
  if (payload.approveBy) body.approveBy = payload.approveBy;
  if (payload.jmlhAnggota != null) body.jmlhAnggota = String(payload.jmlhAnggota);
  if (payload.hadir != null) body.hadir = String(payload.hadir);
  if (payload.idRegu != null) body.idRegu = String(payload.idRegu);
  if (payload.hourMeter != null) body.hourMeter = String(payload.hourMeter);
  if (payload.outputJenisId != null) body.outputJenisId = String(payload.outputJenisId);

  const res = await apiFetchAuth<{ data?: Record<string, unknown>; message?: string }>(
    `/production/crusher/${encodeURIComponent(noProduksi)}`,
    t,
    {
      method: "PUT",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(body).toString(),
    },
  );
  if (res.status !== 200) {
    throw new ApiRequestError(res.data.message ?? `Gagal mengubah produksi (${res.status})`);
  }
  if (!res.data.data) throw new ApiRequestError("Response update tidak mengandung data");
  return parseCrusherProduction(res.data.data);
}

export async function deleteCrusher(
  token: string | undefined,
  noProduksi: string,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ message?: string; error?: string }>(
    `/production/crusher/${encodeURIComponent(noProduksi)}`,
    t,
    { method: "DELETE" },
  );
  if (res.status !== 200) {
    const msg = res.data.message ?? res.data.error ?? `Gagal menghapus (${res.status})`;
    throw new ApiRequestError(msg);
  }
}

export async function completeCrusher(
  token: string | undefined,
  noProduksi: string,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ message?: string }>(
    `/production/crusher/${encodeURIComponent(noProduksi)}/complete`,
    t,
    { method: "PATCH" },
  );
  if (res.status !== 200) {
    throw new ApiRequestError(res.data.message ?? `Gagal menyelesaikan (${res.status})`);
  }
}

export async function uncompleteCrusher(
  token: string | undefined,
  noProduksi: string,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ message?: string }>(
    `/production/crusher/${encodeURIComponent(noProduksi)}/uncomplete`,
    t,
    { method: "PATCH" },
  );
  if (res.status !== 200) {
    throw new ApiRequestError(res.data.message ?? `Gagal membuka kunci (${res.status})`);
  }
}

export async function splitCrusherTime(
  token: string | undefined,
  idMesin: number,
  tanggal: string,
  payload: { hourStart: string; outputJenisId: number },
): Promise<{ noProduksi?: string }> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    message?: string;
    data?: { noProduksi?: string; newNoProduksi?: string };
    noProduksi?: string;
    newNoProduksi?: string;
  }>(`/production/crusher/split-time/${idMesin}/${encodeURIComponent(tanggal)}`, t, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (res.status < 200 || res.status >= 300) {
    throw new ApiRequestError(res.data.message ?? `Gagal ganti produksi (${res.status})`);
  }
  const data = res.data.data ?? res.data;
  return {
    noProduksi:
      data?.noProduksi ?? data?.newNoProduksi ?? res.data.newNoProduksi,
  };
}

export async function fetchCrusherInputs(
  token: string | undefined,
  noProduksi: string,
): Promise<CrusherInputs> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ data?: Record<string, unknown> }>(
    `/production/crusher/${encodeURIComponent(noProduksi)}/inputs`,
    t,
  );
  if (!res.data.data) throw new ApiRequestError("Response inputs tidak valid");
  return parseCrusherInputs(res.data.data);
}

export async function fetchCrusherOutputs(
  token: string | undefined,
  noProduksi: string,
): Promise<CrusherOutput[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ data?: Record<string, unknown>[] }>(
    `/production/crusher/${encodeURIComponent(noProduksi)}/outputs`,
    t,
  );
  return (res.data.data ?? []).map(parseCrusherOutput);
}

export async function fetchCrusherFormula(
  token: string | undefined,
  noProduksi: string,
): Promise<CrusherFormulaResult> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ data?: { outputs?: Record<string, unknown>[] } }>(
    `/production/crusher/${encodeURIComponent(noProduksi)}/formula-inputs`,
    t,
  );
  const rawOutputs = res.data.data?.outputs ?? [];
  const kodes = new Set<string>();
  const outputs: CrusherFormulaOutput[] = [];
  for (const o of rawOutputs) {
    const rawFormulas = Array.isArray(o["formulas"])
      ? (o["formulas"] as Record<string, unknown>[])
      : [];
    const formulas: CrusherFormulaItem[] = [];
    for (const f of rawFormulas) {
      const kode = asString(f["InputKategoriKode"] ?? f["Kode"]);
      if (kode) kodes.add(kode);
      formulas.push({
        idFormula: asInt(f["IdFormula"]),
        kategoriKode: kode,
        kategoriNama: asString(f["InputKategoriNama"] ?? f["Nama"]),
        prefixLabel: asString(f["InputPrefixLabel"]),
        inputId: asInt(f["InputId"]),
        inputNama: asString(f["InputNama"]),
      });
    }
    outputs.push({
      idJenis: asInt(o["idJenis"]),
      namaJenis: asString(o["namaJenis"]),
      formulas,
    });
  }
  return { kodes, outputs };
}

export type SubmitInputsPayload = {
  bb?: { noBahanBaku: string | null; noPallet: number | null; noSak: number | null }[];
  bonggolan?: { noBonggolan: string | null }[];
  bbPartial?: {
    noBahanBaku: string | null;
    noPallet: number | null;
    noSak: number | null;
    berat: number | null;
  }[];
};

export async function submitCrusherInputs(
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
    `/production/crusher/${encodeURIComponent(noProduksi)}/inputs`,
    t,
    { method: "POST", body: JSON.stringify(payload) },
  );
  if (res.status === 422 || res.status === 400) {
    throw new ApiRequestError(res.data.message ?? "Data tidak valid");
  }
  if (res.status !== 200) {
    throw new ApiRequestError(res.data.message ?? `Gagal submit inputs (${res.status})`);
  }
  if (res.data.success === false) {
    throw new ApiRequestError(res.data.message ?? "Submit gagal");
  }
  return res.data as Record<string, unknown>;
}

export type DeleteInputsPayload = SubmitInputsPayload;

export async function deleteCrusherInputs(
  token: string | undefined,
  noProduksi: string,
  payload: DeleteInputsPayload,
): Promise<Record<string, unknown>> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ success?: boolean; message?: string }>(
    `/production/crusher/${encodeURIComponent(noProduksi)}/inputs`,
    t,
    { method: "DELETE", body: JSON.stringify(payload) },
  );
  if (res.status === 200 || res.status === 404) {
    return res.data as Record<string, unknown>;
  }
  throw new ApiRequestError(res.data.message ?? `Gagal delete inputs (${res.status})`);
}

/** Create output label F. — POST /labels/crusher (hanya Berat, tanpa sak). */
export async function createCrusherOutput(
  token: string | undefined,
  noProduksi: string,
  idJenis: number,
  tanggal: string,
  berat: number,
): Promise<string> {
  const t = requireToken(token);
  const payload = {
    header: {
      IdCrusher: idJenis,
      DateCreate: tanggal,
      Berat: berat,
    },
    ProcessedCode: noProduksi,
  };
  const res = await apiFetchAuth<{
    data?: Record<string, unknown> | Record<string, unknown>[];
    message?: string;
  }>("/labels/crusher", t, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (res.status !== 200 && res.status !== 201) {
    throw new ApiRequestError(res.data.message ?? `Gagal membuat label (${res.status})`);
  }
  const data = res.data.data;
  if (data && !Array.isArray(data)) {
    const header = data["header"] as Record<string, unknown> | undefined;
    if (header?.NoCrusher != null) return asString(header.NoCrusher);
    return asString(data["NoCrusher"]);
  }
  if (Array.isArray(data) && data.length > 0) return asString(data[0]["NoCrusher"]);
  return "";
}

export async function lookupCrusherLabel(
  token: string | undefined,
  labelCode: string,
): Promise<{ found: boolean; body: Record<string, unknown> }> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Record<string, unknown>>(
    `/production/crusher/validate-label/${encodeURIComponent(labelCode)}`,
    t,
  );
  if (res.status === 200) return { found: true, body: res.data };
  if (res.status === 404) return { found: false, body: res.data };
  throw new ApiRequestError(
    asString(res.data.message) || `Gagal lookup label (HTTP ${res.status})`,
  );
}

export async function markCrusherLabelPrinted(
  token: string | undefined,
  noCrusher: string,
): Promise<number | null> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>(`/labels/crusher/${encodeURIComponent(noCrusher)}/print`, t, {
    method: "PATCH",
  });
  if (res.status !== 200 && res.status !== 204) {
    throw new ApiRequestError(res.data.message ?? `Gagal update cetak (${res.status})`);
  }
  const count = Number(
    res.data.data?.["HasBeenPrinted"] ?? res.data.data?.["hasBeenPrinted"] ?? 0,
  );
  return Number.isFinite(count) ? count : null;
}

export async function deleteCrusherLabel(
  token: string | undefined,
  noCrusher: string,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ success?: boolean; message?: string }>(
    `/labels/crusher/${encodeURIComponent(noCrusher)}`,
    t,
    { method: "DELETE" },
  );
  if (res.status !== 200 && res.status !== 202 && res.status !== 204) {
    throw new ApiRequestError(res.data.message ?? `Gagal hapus label (${res.status})`);
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
    throw new ApiRequestError(res.data.message ?? `Gagal lock cetak (${res.status})`);
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

export async function fetchCrusherLabelPdfBase64(
  token: string | undefined,
  noCrusher: string,
): Promise<string> {
  const t = requireToken(token);
  const base = getBackendBaseUrl();
  let response: Response;
  try {
    response = await fetch(
      `${base}/api/labels/crusher/${encodeURIComponent(noCrusher)}/pdf`,
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
