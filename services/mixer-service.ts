import { getBackendBaseUrl, apiFetch, apiFetchAuth, ApiRequestError } from "@/services/api";

// â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type MachineStatus = "active" | "pending" | "inactive";

export type MixerProduction = {
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

export type MixerMesinInfo = {
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

export type MixerActiveShift = {
  shift: number;
  hourStart: string;
  hourEnd: string;
};

export type MixerMesinResult = {
  mesinList: MixerMesinInfo[];
  activeShift: MixerActiveShift | null;
};

export type MixerType = {
  idMixer: number;
  nama: string;
  itemCode?: string | null;
  isEnable?: boolean | null;
};

export type MixerOutput = {
  noProduksi: string;
  NoMixer: string;
  idJenis: number;
  namaJenis: string;
  hasBeenPrinted: number;
  detailSak: { noSak: number; berat: number; dateUsage?: string | null; isPartial?: boolean | null }[];
  totalSak: number;
  totalBerat: number;
};

export type BonggolanOutput = {
  noProduksi: string;
  noBonggolan: string;
  idJenis: number;
  namaJenis: string;
  berat: number;
  hasBeenPrinted: number;
};

export type MixerBbItem = {
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

export type MixerSakItem = {
  noLabel: string | null;
  noSak: number | null;
  noPartial: string | null;
  berat: number | null;
  beratAct: number | null;
  isPartial: boolean | null;
  idJenis: number | null;
  namaJenis: string | null;
  dateUsage: string | null;
};

export type MixerBeratItem = {
  noLabel: string | null;
  noPartial: string | null;
  berat: number | null;
  beratAct: number | null;
  isPartial: boolean | null;
  idJenis: number | null;
  namaJenis: string | null;
  dateUsage: string | null;
};

export type MixerInputs = {
  broker: MixerSakItem[];
  bb: MixerBbItem[];
  washing: MixerSakItem[];
  gilingan: MixerBeratItem[];
  mixer: MixerSakItem[];
  crusher?: MixerBeratItem[];
  reject?: MixerBeratItem[];
  summary: Record<string, number>;
};

export type MixerFormulaItem = {
  idFormula: number;
  kategoriKode: string;
  kategoriNama: string;
  prefixLabel: string;
  inputId: number;
  inputNama: string;
};

export type MixerFormulaOutput = {
  idJenis: number;
  namaJenis: string;
  formulas: MixerFormulaItem[];
};

export type MixerFormulaResult = {
  kodes: Set<string>;
  outputs: MixerFormulaOutput[];
};

export type FetchMixerListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  shift?: number;
  idMesin?: number;
  tanggal?: string;
};

export type FetchMixerListResult = {
  items: MixerProduction[];
  page: number;
  totalPages: number;
  total: number;
};

export type CreateMixerPayload = {
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

export type UpdateMixerPayload = {
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
  bb?: { noBahanBaku: string | null; noPallet: number | null; noSak: number | null }[];
  washing?: { noWashing: string | null; noSak: number | null }[];
  gilingan?: { noGilingan: string | null }[];
  mixer?: { noMixer: string | null; noSak: number | null }[];
  bbPartial?: (
    | {
        noBahanBaku: string | null;
        noPallet: number | null;
        noSak: number | null;
        berat: number | null;
      }
    | { noBBPartial: string }
  )[];
  gilinganPartial?: (
    | { noGilingan: string | null; berat: number | null }
    | { noGilinganPartial: string }
  )[];
  mixerPartial?: (
    | { noMixer: string | null; noSak: number | null; berat: number | null }
    | { noMixerPartial: string }
  )[];
  brokerPartial?: (
    | { noBroker: string | null; noSak: number | null; berat: number | null }
    | { noBrokerPartial: string }
  )[];
};

export type DeleteInputsPayload = SubmitInputsPayload;

// â”€â”€ Parsers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€ Entity parsers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function parseMixerProduction(j: Record<string, unknown>): MixerProduction {
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

export function parseMixerMesinInfo(j: Record<string, unknown>): MixerMesinInfo {
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
    namaOperator: strOr(j["NamaOperator"]),
    namaRegu: strOr(j["NamaRegu"]),
    shift: asIntOrNull(j["Shift"]),
    hourStart: asTimeHHmm(j["HourStart"]),
    hourEnd: asTimeHHmm(j["HourEnd"]),
    machineStatus: parseStatus(j["status"] ?? j["machineStatus"] ?? j["MachineStatus"]),
  };
}

export function parseMixerType(j: Record<string, unknown>): MixerType {
  return {
    idMixer: asInt(j["IdMixer"] ?? j["idMixer"] ?? j["Id"] ?? j["id"] ?? j["Jenis"] ?? j["jenis"]),
    nama: asString(j["Nama"] ?? j["nama"] ?? j["NamaMixer"] ?? j["Jenis"] ?? j["jenis"]),
    itemCode: strOr(j["ItemCode"] ?? j["itemCode"]),
    isEnable: asBoolOrNull(j["IsEnable"] ?? j["isEnable"] ?? j["Enable"]),
  };
}

function parseDetailSak(raw: unknown): MixerOutput["detailSak"] {
  if (!Array.isArray(raw)) return [];
  return raw.map((e) => {
    const j = (e ?? {}) as Record<string, unknown>;
    return {
      noSak: asInt(j["NoSak"] ?? j["noSak"]),
      berat: asDoubleOrNull(j["Berat"] ?? j["berat"]) ?? 0,
      dateUsage: asDateOrNull(j["DateUsage"] ?? j["dateUsage"]),
      isPartial: asBoolOrNull(j["IsPartial"] ?? j["isPartial"]),
    };
  });
}

export function parseMixerOutput(j: Record<string, unknown>): MixerOutput {
  const detailSak = parseDetailSak(j["DetailSak"] ?? j["detailSak"]);
  const NoMixer = asString(j["NoMixer"] ?? j["noMixer"]);
  return {
    noProduksi: asString(j["NoProduksi"] ?? j["noProduksi"]),
    NoMixer,
    idJenis: asInt(j["IdJenis"] ?? j["idJenis"]),
    namaJenis: asString(j["NamaJenis"] ?? j["namaJenis"]) || "-",
    hasBeenPrinted: asInt(j["HasBeenPrinted"] ?? j["hasBeenPrinted"]),
    detailSak,
    totalSak: detailSak.length,
    totalBerat: detailSak.reduce((s, d) => s + d.berat, 0),
  };
}

export function parseBonggolanOutput(j: Record<string, unknown>): BonggolanOutput {
  return {
    noProduksi: asString(j["NoProduksi"] ?? j["noProduksi"]),
    noBonggolan: asString(j["NoBonggolan"] ?? j["noBonggolan"]),
    idJenis: asInt(j["IdBonggolan"] ?? j["IdJenis"] ?? j["idJenis"]),
    namaJenis: asString(j["NamaBonggolan"] ?? j["NamaJenis"] ?? j["namaJenis"]) || "-",
    berat: asDoubleOrNull(j["Berat"] ?? j["berat"]) ?? 0,
    hasBeenPrinted: asInt(j["HasBeenPrinted"] ?? j["hasBeenPrinted"]),
  };
}

function parseSakItem(j: Record<string, unknown>, labelKeys: string[]): MixerSakItem {
  return {
    noLabel: strOr(pickFirst(j, labelKeys)),
    noSak: asIntOrNull(j["NoSak"] ?? j["noSak"]),
    noPartial: strOr(
      pickFirst(j, ["NoPartial", "noPartial", "NoBBPartial", "noBBPartial", "NoBrokerPartial", "noBrokerPartial", "NoGilinganPartial", "noGilinganPartial", "NoMixerPartial", "noMixerPartial", "NoRejectPartial", "noRejectPartial"]),
    ),
    berat: asDoubleOrNull(j["Berat"] ?? j["berat"]),
    beratAct: asDoubleOrNull(j["BeratAct"] ?? j["beratAct"]),
    isPartial: asBoolOrNull(j["IsPartial"] ?? j["isPartial"]),
    idJenis: asIntOrNull(j["IdJenis"] ?? j["idJenis"]),
    namaJenis: strOr(j["NamaJenis"] ?? j["namaJenis"]),
    dateUsage: asDateOrNull(j["DateUsage"] ?? j["dateUsage"]),
  };
}

function parseBeratItem(j: Record<string, unknown>, labelKeys: string[]): MixerBeratItem {
  return {
    noLabel: strOr(pickFirst(j, labelKeys)),
    noPartial: strOr(
      pickFirst(j, ["NoPartial", "noPartial", "NoCrusherPartial", "noCrusherPartial", "NoGilinganPartial", "noGilinganPartial", "NoRejectPartial", "noRejectPartial"]),
    ),
    berat: asDoubleOrNull(j["Berat"] ?? j["berat"]),
    beratAct: asDoubleOrNull(j["BeratAct"] ?? j["beratAct"]),
    isPartial: asBoolOrNull(j["IsPartial"] ?? j["isPartial"]),
    idJenis: asIntOrNull(j["IdJenis"] ?? j["idJenis"]),
    namaJenis: strOr(j["NamaJenis"] ?? j["namaJenis"]),
    dateUsage: asDateOrNull(j["DateUsage"] ?? j["dateUsage"]),
  };
}

function parseBbItem(j: Record<string, unknown>): MixerBbItem {
  return {
    noBahanBaku: strOr(j["NoBahanBaku"] ?? j["noBahanBaku"]),
    noPallet: asIntOrNull(j["NoPallet"] ?? j["noPallet"]),
    noSak: asIntOrNull(j["NoSak"] ?? j["noSak"]),
    noBBPartial: strOr(j["NoBBPartial"] ?? j["noBBPartial"]),
    berat: asDoubleOrNull(j["Berat"] ?? j["berat"]),
    beratAct: asDoubleOrNull(j["BeratAct"] ?? j["beratAct"]),
    isPartial: asBoolOrNull(j["IsPartial"] ?? j["isPartial"]),
    dateUsage: asDateOrNull(j["DateUsage"] ?? j["dateUsage"]),
    idJenis: asIntOrNull(j["IdJenis"] ?? j["idJenis"]),
    namaJenis: strOr(j["NamaJenis"] ?? j["namaJenis"]),
  };
}

export function parseMixerInputs(j: Record<string, unknown>): MixerInputs {
  const listOf = <T>(v: unknown, f: (m: Record<string, unknown>) => T): T[] => {
    if (!Array.isArray(v)) return [];
    return v.map((e) => f(e as Record<string, unknown>));
  };
  const summaryRaw = (j["summary"] ?? {}) as Record<string, unknown>;
  const summary: Record<string, number> = {};
  for (const [k, v] of Object.entries(summaryRaw)) summary[k] = asInt(v);

  return {
    broker: listOf(j["broker"] ?? j["Broker"] ?? j["Mixer"], (m) =>
      parseSakItem(m, ["NoBroker", "noBroker", "NoMixer", "noMixer"]),
    ),
    bb: listOf(j["bb"], parseBbItem),
    washing: listOf(j["washing"], (m) => parseSakItem(m, ["NoWashing", "noWashing"])),
    gilingan: listOf(j["gilingan"], (m) => parseBeratItem(m, ["NoGilingan", "noGilingan"])),
    mixer: listOf(j["mixer"], (m) => parseSakItem(m, ["NoMixer", "noMixer"])),
    crusher: listOf(j["crusher"], (m) => parseBeratItem(m, ["NoCrusher", "noCrusher"])),
    reject: listOf(j["reject"], (m) => parseBeratItem(m, ["NoReject", "noReject"])),
    summary,
  };
}

// â”€â”€ API calls â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function requireToken(token: string | undefined): string {
  if (!token) throw new ApiRequestError("Tidak terautentikasi");
  return token;
}

export async function fetchMixerMesin(
  token: string | undefined,
): Promise<MixerMesinResult> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    data?: Record<string, unknown>[];
    activeShift?: Record<string, unknown>;
  }>("/mst-mesin/mixer", t);
  const mesinList = (res.data.data ?? []).map(parseMixerMesinInfo);
  const shiftRaw = res.data.activeShift;
  const activeShift: MixerActiveShift | null = shiftRaw
    ? {
        shift: asInt(shiftRaw["shift"] ?? shiftRaw["noShift"], 1),
        hourStart: asString(shiftRaw["hourStart"]).slice(0, 5),
        hourEnd: asString(shiftRaw["hourEnd"]).slice(0, 5),
      }
    : null;
  return { mesinList, activeShift };
}

/** GET /mst-mixer â€” jenis output Mixer (MstBroker aktif). */
export async function fetchMixerTypes(token: string | undefined): Promise<MixerType[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ data?: Record<string, unknown>[] }>("/mst-mixer", t);
  const rows = res.data.data ?? [];
  return rows.map(parseMixerType).filter((x) => x.idMixer !== 0);
}

export async function fetchMixerList(
  token: string | undefined,
  params: FetchMixerListParams = {},
): Promise<FetchMixerListResult> {
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
  }>(`/production/mixer?${qp.toString()}`, t);

  const items = (res.data.data ?? []).map(parseMixerProduction);
  const meta = res.data.meta ?? {};
  return {
    items,
    page: asInt(meta.page, params.page ?? 1),
    totalPages: asInt(meta.totalPages, 1),
    total: asInt(res.data.totalData ?? meta.total, 0),
  };
}

export async function fetchMixerOne(
  token: string | undefined,
  noProduksi: string,
): Promise<MixerProduction | null> {
  const result = await fetchMixerList(token, {
    page: 1,
    pageSize: 1,
    search: noProduksi.trim(),
  });
  return result.items[0] ?? null;
}

export async function createMixer(
  token: string | undefined,
  payload: CreateMixerPayload,
): Promise<MixerProduction> {
  const t = requireToken(token);
  const body: Record<string, unknown> = {
    tglProduksi: payload.tglProduksi,
    idMesin: payload.idMesin,
    idOperators: payload.idOperators,
    shift: payload.shift,
  };
  if (payload.jamKerja != null) body.jam = payload.jamKerja;
  if (payload.outputJenisId != null) body.outputJenisId = payload.outputJenisId;
  if (payload.hourStart) body.hourStart = payload.hourStart;
  if (payload.hourEnd) body.hourEnd = payload.hourEnd;
  if (payload.hadir != null) body.hadir = payload.hadir;
  if (payload.jmlhAnggota != null) body.jmlhAnggota = payload.jmlhAnggota;
  if (payload.hourMeter != null) body.hourMeter = payload.hourMeter;
  if (payload.idRegu != null) body.idRegu = payload.idRegu;
  if (payload.checkBy1) body.checkBy1 = payload.checkBy1;
  if (payload.checkBy2) body.checkBy2 = payload.checkBy2;
  if (payload.approveBy) body.approveBy = payload.approveBy;

  const res = await apiFetchAuth<{ data?: Record<string, unknown>; message?: string }>(
    "/production/mixer",
    t,
    { method: "POST", body: JSON.stringify(body) },
  );
  if (res.status !== 201 && res.status !== 200) {
    throw new ApiRequestError(res.data.message ?? `Gagal membuat produksi (${res.status})`);
  }
  if (!res.data.data) throw new ApiRequestError("Response create tidak valid");
  return parseMixerProduction(res.data.data);
}

function normalizeTime(v: string): string {
  const t = v.trim();
  return t.length === 5 ? `${t}:00` : t;
}

export async function updateMixer(
  token: string | undefined,
  noProduksi: string,
  payload: UpdateMixerPayload,
): Promise<MixerProduction> {
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
  if (payload.outputJenisId != null) body.outputJenisId = String(payload.outputJenisId);
  if (payload.jmlhAnggota != null) body.jmlhAnggota = String(payload.jmlhAnggota);
  if (payload.hourMeter != null) body.hourMeter = String(payload.hourMeter);
  if (payload.checkBy1) body.checkBy1 = payload.checkBy1;
  if (payload.checkBy2) body.checkBy2 = payload.checkBy2;
  if (payload.approveBy) body.approveBy = payload.approveBy;

  const res = await apiFetchAuth<{ data?: Record<string, unknown>; message?: string }>(
    `/production/mixer/${encodeURIComponent(noProduksi)}`,
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
  return parseMixerProduction(res.data.data);
}

export async function deleteMixer(
  token: string | undefined,
  noProduksi: string,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ message?: string; error?: string }>(
    `/production/mixer/${encodeURIComponent(noProduksi)}`,
    t,
    { method: "DELETE" },
  );
  if (res.status !== 200) {
    const msg = res.data.message ?? res.data.error ?? `Gagal menghapus (${res.status})`;
    throw new ApiRequestError(msg);
  }
}

export async function completeMixer(
  token: string | undefined,
  noProduksi: string,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ message?: string; data?: Record<string, unknown> }>(
    `/production/mixer/${encodeURIComponent(noProduksi)}/complete`,
    t,
    { method: "PATCH" },
  );
  if (res.status !== 200) {
    throw new ApiRequestError(res.data.message ?? `Gagal menyelesaikan (${res.status})`);
  }
}

export async function uncompleteMixer(
  token: string | undefined,
  noProduksi: string,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ message?: string }>(
    `/production/mixer/${encodeURIComponent(noProduksi)}/uncomplete`,
    t,
    { method: "PATCH" },
  );
  if (res.status !== 200) {
    throw new ApiRequestError(res.data.message ?? `Gagal membuka kunci (${res.status})`);
  }
}

export async function splitMixerTime(
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
  }>(`/production/mixer/split-time/${idMesin}/${encodeURIComponent(tanggal)}`, t, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (res.status < 200 || res.status >= 300) {
    throw new ApiRequestError(res.data.message ?? `Gagal ganti produksi (${res.status})`);
  }
  const data = res.data.data ?? {};
  return {
    noProduksi:
      asString(data["noProduksi"] ?? data["newNoProduksi"] ?? res.data.noProduksi) ||
      undefined,
  };
}

export async function fetchMixerInputs(
  token: string | undefined,
  noProduksi: string,
): Promise<MixerInputs> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ data?: Record<string, unknown> }>(
    `/production/mixer/${encodeURIComponent(noProduksi)}/inputs`,
    t,
  );
  if (!res.data.data) throw new ApiRequestError("Response inputs tidak valid");
  return parseMixerInputs(res.data.data);
}

export async function fetchMixerOutputs(
  token: string | undefined,
  noProduksi: string,
): Promise<MixerOutput[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ data?: Record<string, unknown>[] }>(
    `/production/mixer/${encodeURIComponent(noProduksi)}/outputs`,
    t,
  );
  return (res.data.data ?? []).map(parseMixerOutput);
}

export async function submitMixerInputs(
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
    `/production/mixer/${encodeURIComponent(noProduksi)}/inputs`,
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

export async function deleteMixerInputs(
  token: string | undefined,
  noProduksi: string,
  payload: DeleteInputsPayload,
): Promise<Record<string, unknown>> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ success?: boolean; message?: string }>(
    `/production/mixer/${encodeURIComponent(noProduksi)}/inputs`,
    t,
    { method: "DELETE", body: JSON.stringify(payload) },
  );
  if (res.status === 200 || res.status === 404) {
    return res.data as Record<string, unknown>;
  }
  throw new ApiRequestError(res.data.message ?? `Gagal delete inputs (${res.status})`);
}

/** Create Mixer label output â€” POST /labels/mixer (sak-based). */
export async function createMixerOutput(
  token: string | undefined,
  noProduksi: string,
  idJenis: number,
  tanggal: string,
  details: { NoSak: number; Berat: number }[],
): Promise<string> {
  const t = requireToken(token);
  const total = details.reduce((s, d) => s + d.Berat, 0);
  const payload = {
    header: {
      IdMixer: idJenis,
      DateCreate: tanggal,
      Berat: total,
    },
    details: details.map((d) => ({ NoSak: d.NoSak, Berat: d.Berat, IsPartial: 0 })),
    outputCode: noProduksi,
  };
  const res = await apiFetchAuth<{
    data?: Record<string, unknown> | Record<string, unknown>[];
    message?: string;
  }>("/labels/mixer", t, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (res.status !== 200 && res.status !== 201) {
    throw new ApiRequestError(res.data.message ?? `Gagal membuat label (${res.status})`);
  }
  const data = res.data.data;
  if (data && !Array.isArray(data)) {
    const header = (data["header"] ?? {}) as Record<string, unknown>;
    return asString(header["NoMixer"] ?? header["noMixer"] ?? data["NoMixer"] ?? data["noMixer"]);
  }
  if (Array.isArray(data) && data.length > 0) {
    const first = data[0];
    const header = (first["header"] ?? {}) as Record<string, unknown>;
    return asString(header["NoMixer"] ?? header["noMixer"] ?? first["NoMixer"] ?? first["noMixer"]);
  }
  return "";
}

export async function lookupMixerLabel(
  token: string | undefined,
  labelCode: string,
): Promise<{ found: boolean; body: Record<string, unknown> }> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Record<string, unknown>>(
    `/production/mixer/validate-label/${encodeURIComponent(labelCode)}`,
    t,
  );
  if (res.status === 200) return { found: true, body: res.data };
  if (res.status === 404) return { found: false, body: res.data };
  throw new ApiRequestError(
    asString(res.data.message) || `Gagal lookup label (HTTP ${res.status})`,
  );
}

export async function markMixerLabelPrinted(
  token: string | undefined,
  NoMixer: string,
): Promise<number | null> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>(`/labels/mixer/${encodeURIComponent(NoMixer)}/print`, t, {
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

export async function deleteMixerLabel(
  token: string | undefined,
  NoMixer: string,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ success?: boolean; message?: string }>(
    `/labels/mixer/${encodeURIComponent(NoMixer)}`,
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

async function fetchPdfBase64(
  token: string,
  path: string,
): Promise<string> {
  const base = getBackendBaseUrl();
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
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

export async function fetchMixerLabelPdfBase64(
  token: string | undefined,
  NoMixer: string,
): Promise<string> {
  const t = requireToken(token);
  return fetchPdfBase64(t, `/api/labels/mixer/${encodeURIComponent(NoMixer)}/pdf`);
}

export { apiFetch, ApiRequestError };
