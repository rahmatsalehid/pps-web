import { apiFetch, apiFetchAuth, ApiRequestError } from "@/services/api";

// ── Types ────────────────────────────────────────────────────────────────────

export type MachineStatus = "active" | "pending" | "inactive";

/** Jenis output hasil mapping Master Input Output (Cetakan + Warna [+ FM]). */
export type InjectOutputJenis = {
  idJenis: number;
  namaJenis: string;
  outputCategory: string;
};

export type InjectProduction = {
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
  idCetakan: number | null;
  namaCetakan: string | null;
  idWarna: number | null;
  warna: string | null;
  idFurnitureMaterial: number | null;
  namaFurnitureMaterial: string | null;
  /** "furnitureWip" | "barangjadi" | null (belum ada mapping output). */
  outputCategory: string | null;
  outputs: InjectOutputJenis[];
  isLocked: boolean;
  lastClosedDate: string | null;
  idRegu: number | null;
  namaRegu: string | null;
  isComplete: boolean;
  produksiStatus: string;
  /** "realtime" (kartu mesin, batch per jam) | "backdate" | null. */
  inputMode: string | null;
};

export type InjectMesinInfo = {
  idMesin: number;
  namaMesin: string;
  bagian: string | null;
  target: number | null;
  noProduksi: string | null;
  tglProduksi: string | null;
  idCetakan: number | null;
  namaCetakan: string | null;
  idWarna: number | null;
  warna: string | null;
  idFurnitureMaterial: number | null;
  namaFurnitureMaterial: string | null;
  outputCategory: string | null;
  outputs: InjectOutputJenis[];
  idOperators: number[];
  namaOperator: string | null;
  idRegu: number | null;
  namaRegu: string | null;
  shift: number | null;
  hourStart: string | null;
  hourEnd: string | null;
  machineStatus: MachineStatus;
};

export type InjectActiveShift = {
  shift: number;
  hourStart: string;
  hourEnd: string;
};

export type InjectMesinResult = {
  mesinList: InjectMesinInfo[];
  activeShift: InjectActiveShift | null;
};

/** Master cetakan aktif (GET /mst-cetakan). */
export type CetakanItem = {
  idCetakan: number;
  namaCetakan: string;
  enable: boolean;
};

/** Warna per cetakan (GET /mst-warna/cetakan/:idCetakan). */
export type WarnaItem = {
  idWarna: number;
  warna: string;
  enable: boolean;
};

/** Furniture material per cetakan+warna (GET /mst-furniture-material/by-cetakan-warna). */
export type FurnitureMaterialItem = {
  idFurnitureMaterial: number;
  nama: string;
  itemCode: string | null;
};

/** Jenis output FWIP (GET /furniture-wip-type) / BJ (GET /packing-type). */
export type OutputTypeItem = {
  idJenis: number;
  nama: string;
};

/** Jenis reject = MstReject aktif (GET /reject-type). */
export type RejectTypeItem = {
  idReject: number;
  namaReject: string;
  enable: boolean;
};

/** Jenis bonggolan (dari stok bonggolan, GET /production/broker/stok-bonggolan). */
export type BonggolanTypeItem = {
  idBonggolan: number;
  nama: string;
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

export type InjectOutputCategory = "fwip" | "bj" | "reject" | "bonggolan";

export type InjectOutput = {
  noProduksi: string;
  noLabel: string;
  category: InjectOutputCategory;
  idJenis: number | null;
  namaJenis: string | null;
  hasBeenPrinted: number;
  berat: number | null;
  pcs: number | null;
};

/** Item input berbasis sak (Broker / Mixer). */
export type InjectSakItem = {
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

/** Item input berbasis berat saja (Gilingan). */
export type InjectBeratItem = {
  noLabel: string | null;
  noPartial: string | null;
  berat: number | null;
  beratAct: number | null;
  isPartial: boolean | null;
  idJenis: number | null;
  namaJenis: string | null;
  dateUsage: string | null;
};

export type InjectFwipInputItem = {
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

export type InjectMaterialInputItem = {
  idCabinetMaterial: number | null;
  jumlah: number | null;
  berat: number | null;
  noBahanPendukung: string | null;
  pcs: number | null;
  namaJenis: string | null;
  namaUom: string | null;
  datetimeInput: string | null;
};

export type InjectInputs = {
  broker: InjectSakItem[];
  mixer: InjectSakItem[];
  gilingan: InjectBeratItem[];
  furnitureWip: InjectFwipInputItem[];
  cabinetMaterial: InjectMaterialInputItem[];
  summary: Record<string, number>;
};

export type StokFwipItem = {
  idCabinetWip: number;
  nama: string;
  labelSisa: number;
  pcsSisa: number;
  beratSisa: number;
  dateCreateTertua: string | null;
};

export type StokFwipLabel = {
  noFurnitureWip: string;
  dateCreate: string | null;
  pcs: number;
  berat: number;
};

/** Target pcs per label per jenis (GET /inject/pcs-per-label/:no). */
export type InjectPcsPerLabelItem = {
  idJenis: number;
  namaBarang: string;
  pcsPerLabel: number;
  /** Target label pertama bila ada defisit dari produksi sebelumnya. */
  pcsPerLabelAwal: number | null;
};

export type InjectPcsPerLabelResult = {
  outputCategory: string;
  items: InjectPcsPerLabelItem[];
  counterCurrent: number | null;
  standarBerat: number | null;
  standarCycleTime: number | null;
};

export type InjectBatchLabelItem = {
  code: string;
  namaJenis: string;
  pcs: number | null;
  berat: number | null;
  hasBeenPrinted: number;
};

export type InjectBatchLabels = {
  furnitureWip: InjectBatchLabelItem[];
  barangJadi: InjectBatchLabelItem[];
  bonggolan: InjectBatchLabelItem[];
  reject: InjectBatchLabelItem[];
};

export type InjectBatchJenisItem = {
  idJenis: number;
  outputCategory: string;
  carryOverIn: number;
  pcsInput: number;
  carryOverOut: number;
};

/** Satu batch = satu bucket jam yang sudah disubmit. */
export type InjectBatchItem = {
  id: number;
  noProduksi: string;
  /** "HH:mm" */
  hourStart: string;
  carryOverIn: number;
  pcsInput: number;
  carryOverOut: number;
  berat: number | null;
  cycleTime: number | null;
  counter: number | null;
  keterangan: string | null;
  isDowntime: boolean;
  labels: InjectBatchLabels;
  jenisItems: InjectBatchJenisItem[];
};

export type InjectBatchSubmitPayload = {
  noProduksi: string;
  hourStart: string;
  berat?: number;
  cycleTime?: number;
  counter?: number;
  isDowntime?: boolean;
  keterangan?: string;
  items: {
    idJenis: number;
    pcsInput: number;
    carryOverIn: number;
    carryOverOut: number;
  }[];
  bonggolan?: { idBonggolan: number; berat: number };
  reject?: { idReject: number; berat: number };
};

export type InjectBatchSubmitResult = {
  batchId: number;
  hourStart: string;
  furnitureWip: InjectBatchLabelItem[];
  barangJadi: InjectBatchLabelItem[];
  bonggolan: InjectBatchLabelItem | null;
  reject: InjectBatchLabelItem | null;
  keterangan: string | null;
  isDowntime: boolean;
};

export type FetchInjectListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  shift?: number;
  idMesin?: number;
  tanggal?: string;
};

export type FetchInjectListResult = {
  items: InjectProduction[];
  page: number;
  totalPages: number;
  total: number;
};

export type CreateInjectPayload = {
  tglProduksi: string;
  idMesin: number;
  idOperators: number[];
  idRegu?: number;
  shift: number;
  jamKerja?: number | string;
  hourStart?: string;
  hourEnd?: string;
  idCetakan: number;
  idWarna: number;
  idFurnitureMaterial?: number;
};

export type UpdateInjectPayload = {
  tglProduksi?: string;
  idMesin?: number;
  idOperators?: number[];
  idRegu?: number;
  jamKerja?: number | string;
  shift?: number;
  hourStart?: string;
  hourEnd?: string;
  idCetakan?: number;
  idWarna?: number;
  idFurnitureMaterial?: number;
  hourMeter?: number;
  checkBy1?: string;
  checkBy2?: string;
  approveBy?: string;
};

/**
 * Payload POST/DELETE /production/inject/:no/inputs.
 * - POST: item utuh (broker/mixer per sak, gilingan/FWIP per label),
 *   `*Partial` untuk partial baru (sak/label + berat/pcs),
 *   cabinetMaterial [{idCabinetMaterial, jumlah}] (dikirim sebagai `pcs`).
 * - DELETE: partial pakai kode partial (`noXxxPartial`).
 */
export type SubmitInputsPayload = {
  broker?: { noBroker: string | null; noSak: number | null }[];
  mixer?: { noMixer: string | null; noSak: number | null }[];
  gilingan?: { noGilingan: string | null }[];
  furnitureWip?: { noFurnitureWIP: string | null }[];
  cabinetMaterial?: {
    idCabinetMaterial: number;
    jumlah?: number;
    noBahanPendukung?: string | null;
  }[];
  brokerPartial?: (
    | { noBroker: string | null; noSak: number | null; berat: number | null }
    | { noBrokerPartial: string }
  )[];
  mixerPartial?: (
    | { noMixer: string | null; noSak: number | null; berat: number | null }
    | { noMixerPartial: string }
  )[];
  gilinganPartial?: (
    | { noGilingan: string | null; berat: number | null }
    | { noGilinganPartial: string }
  )[];
  furnitureWipPartial?: {
    noFurnitureWIP?: string | null;
    noFurnitureWIPPartial?: string;
    pcs?: number;
  }[];
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

function pickFirst(j: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    const v = j[k];
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
}

function parseOutputJenisList(v: unknown): InjectOutputJenis[] {
  let raw: unknown = v;
  if (typeof raw === "string" && raw.trim()) {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = [];
    }
  }
  if (!Array.isArray(raw)) return [];
  return raw
    .map((e) => (e ?? {}) as Record<string, unknown>)
    .map((e) => ({
      idJenis: asInt(e["idJenis"] ?? e["IdJenis"]),
      namaJenis: asString(e["namaJenis"] ?? e["NamaJenis"]),
      outputCategory: asString(e["outputCategory"] ?? e["OutputCategory"]),
    }))
    .filter((e) => e.idJenis !== 0);
}

function parseOperatorIds(raw: unknown): number[] {
  if (Array.isArray(raw)) {
    return raw
      .map((e) =>
        typeof e === "object" && e !== null
          ? asInt((e as Record<string, unknown>)["value"])
          : asInt(e),
      )
      .filter((e) => e !== 0);
  }
  const single = asIntOrNull(raw);
  return single ? [single] : [];
}

// ── Parsers ──────────────────────────────────────────────────────────────────

export function parseInjectProduction(
  j: Record<string, unknown>,
): InjectProduction {
  const checkBy1 = asString(j["CheckBy1"]).trim();
  const checkBy2 = asString(j["CheckBy2"]).trim();
  const approveBy = asString(j["ApproveBy"]).trim();

  return {
    noProduksi: asString(j["NoProduksi"]),
    idOperators: parseOperatorIds(j["IdOperators"] ?? j["IdOperator"]),
    namaOperators: asString(
      j["Operators"] ?? j["NamaOperators"] ?? j["NamaOperator"],
    ),
    idMesin: asInt(j["IdMesin"]),
    namaMesin: asString(j["NamaMesin"]),
    tglProduksi: asDateOrNull(j["TglProduksi"] ?? j["Tanggal"]),
    jamKerja: asInt(j["Jam"] ?? j["JamKerja"]),
    shift: asInt(j["Shift"]),
    createBy: asString(j["CreateBy"]),
    checkBy1: checkBy1 || null,
    checkBy2: checkBy2 || null,
    approveBy: approveBy || null,
    hourMeter: asDoubleOrNull(j["HourMeter"]),
    hourStart: asTimeHHmm(j["HourStart"]),
    hourEnd: asTimeHHmm(j["HourEnd"]),
    idCetakan: asIntOrNull(j["IdCetakan"]),
    namaCetakan: strOr(j["NamaCetakan"]),
    idWarna: asIntOrNull(j["IdWarna"]),
    warna: strOr(j["Warna"] ?? j["NamaWarna"]),
    idFurnitureMaterial: asIntOrNull(j["IdFurnitureMaterial"]),
    namaFurnitureMaterial: strOr(
      j["NamaFurnitureMaterial"] ?? j["NamaFurnitureMat"],
    ),
    outputCategory: strOr(j["OutputCategory"]),
    outputs: parseOutputJenisList(j["Outputs"]),
    isLocked: asBool(j["IsLocked"]),
    lastClosedDate: asDateOrNull(j["LastClosedDate"]),
    idRegu: asIntOrNull(j["IdRegu"]),
    namaRegu: strOr(j["NamaRegu"]),
    isComplete: asBool(j["IsComplete"]) || asString(j["status"]) === "complete",
    produksiStatus:
      asString(j["status"]) ||
      (asBool(j["IsComplete"]) ? "complete" : "pending"),
    inputMode: strOr(j["InputMode"]),
  };
}

export function parseInjectMesinInfo(
  j: Record<string, unknown>,
): InjectMesinInfo {
  return {
    idMesin: asInt(j["IdMesin"]),
    namaMesin: asString(j["NamaMesin"]),
    bagian: strOr(j["Bagian"]),
    target: asIntOrNull(j["Target"]),
    noProduksi: strOr(j["NoProduksi"]),
    tglProduksi: asDateOrNull(j["TglProduksi"] ?? j["Tanggal"] ?? j["date"]),
    idCetakan: asIntOrNull(j["IdCetakan"]),
    namaCetakan: strOr(j["NamaCetakan"]),
    idWarna: asIntOrNull(j["IdWarna"]),
    warna: strOr(j["Warna"]),
    idFurnitureMaterial: asIntOrNull(j["IdFurnitureMaterial"]),
    namaFurnitureMaterial: strOr(j["NamaFurnitureMaterial"]),
    outputCategory: strOr(j["OutputCategory"]),
    outputs: parseOutputJenisList(j["Outputs"]),
    idOperators: parseOperatorIds(j["IdOperators"]),
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

export function parseCetakan(j: Record<string, unknown>): CetakanItem {
  return {
    idCetakan: asInt(j["IdCetakan"] ?? j["idCetakan"]),
    namaCetakan: asString(j["NamaCetakan"] ?? j["namaCetakan"]),
    enable: asBool(j["Enable"] ?? j["enable"], true),
  };
}

export function parseWarna(j: Record<string, unknown>): WarnaItem {
  return {
    idWarna: asInt(j["IdWarna"] ?? j["idWarna"]),
    warna: asString(j["Warna"] ?? j["warna"]),
    enable: asBool(j["Enable"] ?? j["enable"], true),
  };
}

export function parseFurnitureMaterial(
  j: Record<string, unknown>,
): FurnitureMaterialItem {
  return {
    idFurnitureMaterial: asInt(
      j["IdFurnitureMaterial"] ?? j["idFurnitureMaterial"],
    ),
    nama: asString(j["Nama"] ?? j["nama"]),
    itemCode: strOr(j["ItemCode"] ?? j["itemCode"]),
  };
}

export function parseRejectType(j: Record<string, unknown>): RejectTypeItem {
  return {
    idReject: asInt(j["IdReject"] ?? j["idReject"]),
    namaReject: asString(j["NamaReject"] ?? j["Nama"] ?? j["namaReject"]),
    enable: asBool(j["Enable"] ?? j["enable"], true),
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

const PARTIAL_KEYS = [
  "NoPartial",
  "noPartial",
  "NoBrokerPartial",
  "noBrokerPartial",
  "NoMixerPartial",
  "noMixerPartial",
  "NoGilinganPartial",
  "noGilinganPartial",
];

function parseSakItem(
  j: Record<string, unknown>,
  labelKeys: string[],
): InjectSakItem {
  return {
    noLabel: strOr(pickFirst(j, labelKeys)),
    noSak: asIntOrNull(j["NoSak"] ?? j["noSak"]),
    noPartial: strOr(pickFirst(j, PARTIAL_KEYS)),
    berat: asDoubleOrNull(j["Berat"] ?? j["berat"]),
    beratAct: asDoubleOrNull(j["BeratAct"] ?? j["beratAct"]),
    isPartial: asBoolOrNull(j["IsPartial"] ?? j["isPartial"]),
    idJenis: asIntOrNull(j["IdJenis"] ?? j["idJenis"]),
    namaJenis: strOr(j["NamaJenis"] ?? j["namaJenis"]),
    dateUsage: asDateOrNull(j["DateUsage"] ?? j["dateUsage"]),
  };
}

function parseBeratItem(
  j: Record<string, unknown>,
  labelKeys: string[],
): InjectBeratItem {
  return {
    noLabel: strOr(pickFirst(j, labelKeys)),
    noPartial: strOr(pickFirst(j, PARTIAL_KEYS)),
    berat: asDoubleOrNull(j["Berat"] ?? j["berat"]),
    beratAct: asDoubleOrNull(j["BeratAct"] ?? j["beratAct"]),
    isPartial: asBoolOrNull(j["IsPartial"] ?? j["isPartial"]),
    idJenis: asIntOrNull(j["IdJenis"] ?? j["idJenis"]),
    namaJenis: strOr(j["NamaJenis"] ?? j["namaJenis"]),
    dateUsage: asDateOrNull(j["DateUsage"] ?? j["dateUsage"]),
  };
}

function parseFwipInputItem(j: Record<string, unknown>): InjectFwipInputItem {
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
    datetimeInput: asDateOrNull(j["datetimeInput"] ?? j["DatetimeInput"]),
  };
}

/** Backend Inject menyimpan material di kolom Pcs → `jumlah` = pcs. */
function parseMaterialInputItem(
  j: Record<string, unknown>,
): InjectMaterialInputItem {
  const pcs = asIntOrNull(j["pcs"] ?? j["Pcs"]);
  return {
    idCabinetMaterial: asIntOrNull(
      j["idCabinetMaterial"] ?? j["IdCabinetMaterial"],
    ),
    jumlah: asIntOrNull(j["jumlah"] ?? j["Jumlah"]) ?? pcs,
    berat: asDoubleOrNull(j["berat"] ?? j["Berat"]),
    noBahanPendukung: strOr(j["noBahanPendukung"] ?? j["NoBahanPendukung"]),
    pcs,
    namaJenis: strOr(j["namaJenis"] ?? j["NamaJenis"] ?? j["Nama"]),
    namaUom: strOr(j["namaUom"] ?? j["NamaUOM"] ?? j["NamaUom"]),
    datetimeInput: asDateOrNull(j["datetimeInput"] ?? j["DatetimeInput"]),
  };
}

export function parseInjectInputs(j: Record<string, unknown>): InjectInputs {
  const summaryRaw = (j["summary"] ?? {}) as Record<string, unknown>;
  const summary: Record<string, number> = {};
  for (const [k, v] of Object.entries(summaryRaw)) summary[k] = asInt(v);

  return {
    broker: listOf(j["broker"], (m) =>
      parseSakItem(m, ["noBroker", "NoBroker", "noLabel"]),
    ),
    mixer: listOf(j["mixer"], (m) =>
      parseSakItem(m, ["noMixer", "NoMixer", "noLabel"]),
    ),
    gilingan: listOf(j["gilingan"], (m) =>
      parseBeratItem(m, ["noGilingan", "NoGilingan", "noLabel"]),
    ),
    furnitureWip: listOf(
      j["furnitureWip"] ?? j["FurnitureWip"],
      parseFwipInputItem,
    ),
    cabinetMaterial: listOf(
      j["cabinetMaterial"] ?? j["CabinetMaterial"],
      parseMaterialInputItem,
    ),
    summary,
  };
}

export function parseInjectOutput(
  j: Record<string, unknown>,
  category: InjectOutputCategory,
): InjectOutput {
  const noLabel =
    category === "fwip"
      ? asString(j["NoFurnitureWIP"] ?? j["noFurnitureWip"])
      : category === "bj"
        ? asString(j["NoBJ"] ?? j["noBJ"] ?? j["noBj"])
        : category === "bonggolan"
          ? asString(j["NoBonggolan"] ?? j["noBonggolan"])
          : asString(j["NoReject"] ?? j["noReject"]);
  return {
    noProduksi: asString(j["NoProduksi"] ?? j["noProduksi"]),
    noLabel,
    category,
    idJenis: asIntOrNull(j["IdJenis"] ?? j["idJenis"] ?? j["IdBonggolan"]),
    namaJenis: strOr(j["NamaJenis"] ?? j["namaJenis"] ?? j["NamaBonggolan"]),
    hasBeenPrinted: asInt(j["HasBeenPrinted"] ?? j["hasBeenPrinted"]),
    berat: asDoubleOrNull(j["Berat"] ?? j["berat"]),
    pcs: asIntOrNull(j["Pcs"] ?? j["pcs"]),
  };
}

export function parseStokFwipItem(j: Record<string, unknown>): StokFwipItem {
  return {
    idCabinetWip: asInt(j["IdCabinetWIP"] ?? j["idCabinetWip"]),
    nama: asString(j["Nama"] ?? j["nama"]),
    labelSisa: asInt(j["LabelSisa"] ?? j["labelSisa"]),
    pcsSisa: asInt(j["PcsSisa"] ?? j["pcsSisa"]),
    beratSisa: asDoubleOrNull(j["BeratSisa"] ?? j["beratSisa"]) ?? 0,
    dateCreateTertua: asDateOrNull(
      j["DateCreateTertua"] ?? j["dateCreateTertua"],
    ),
  };
}

export function parseStokFwipLabel(j: Record<string, unknown>): StokFwipLabel {
  return {
    noFurnitureWip: asString(
      j["NoFurnitureWIP"] ?? j["Label"] ?? j["noFurnitureWip"],
    ),
    dateCreate: asDateOrNull(j["DateCreate"] ?? j["dateCreate"]),
    pcs: asInt(j["Pcs"] ?? j["pcs"]),
    berat: asDoubleOrNull(j["Berat"] ?? j["berat"]) ?? 0,
  };
}

function parseBatchLabel(v: unknown): InjectBatchLabelItem {
  if (typeof v === "string") {
    return { code: v, namaJenis: "", pcs: null, berat: null, hasBeenPrinted: 0 };
  }
  const j = (v ?? {}) as Record<string, unknown>;
  return {
    code: asString(
      j["noFurnitureWIP"] ??
        j["noBarangJadi"] ??
        j["noBJ"] ??
        j["noBonggolan"] ??
        j["noReject"] ??
        j["code"],
    ),
    namaJenis: asString(
      j["namaJenis"] ?? j["namaBarang"] ?? j["namaBonggolan"] ?? j["namaReject"],
    ),
    pcs: asIntOrNull(j["pcs"]),
    berat: asDoubleOrNull(j["berat"]),
    hasBeenPrinted: asInt(j["hasBeenPrinted"]),
  };
}

function parseBatchLabelList(v: unknown): InjectBatchLabelItem[] {
  return Array.isArray(v) ? v.map(parseBatchLabel).filter((l) => l.code) : [];
}

function parseBatchItem(j: Record<string, unknown>): InjectBatchItem {
  const labelsRaw = (j["labels"] ?? {}) as Record<string, unknown>;
  const jenisItems = listOf(j["items"], (m) => ({
    idJenis: asInt(m["idJenis"]),
    outputCategory: asString(m["outputCategory"]),
    carryOverIn: asInt(m["carryOverIn"]),
    pcsInput: asInt(m["pcsInput"]),
    carryOverOut: asInt(m["carryOverOut"]),
  }));
  const sum = (f: (i: InjectBatchJenisItem) => number, fallback: unknown) =>
    jenisItems.length > 0
      ? jenisItems.reduce((a, i) => a + f(i), 0)
      : asInt(fallback);
  return {
    id: asInt(j["id"]),
    noProduksi: asString(j["noProduksi"]),
    hourStart: asString(j["hourStart"]).slice(0, 5),
    carryOverIn: sum((i) => i.carryOverIn, j["carryOverIn"]),
    pcsInput: sum((i) => i.pcsInput, j["pcsInput"]),
    carryOverOut: sum((i) => i.carryOverOut, j["carryOverOut"]),
    berat: asDoubleOrNull(j["berat"]),
    cycleTime: asDoubleOrNull(j["cycleTime"]),
    counter: asIntOrNull(j["counter"]),
    keterangan: strOr(j["keterangan"]),
    isDowntime: j["isDowntime"] === true,
    labels: {
      furnitureWip: parseBatchLabelList(labelsRaw["furnitureWip"]),
      barangJadi: parseBatchLabelList(labelsRaw["barangJadi"]),
      bonggolan: parseBatchLabelList(labelsRaw["bonggolan"]),
      reject: parseBatchLabelList(labelsRaw["reject"]),
    },
    jenisItems,
  };
}

export function parseBatchSubmitResult(
  j: Record<string, unknown>,
): InjectBatchSubmitResult {
  const batch = (j["batch"] ?? {}) as Record<string, unknown>;
  const single = (v: unknown) => {
    if (v == null || v === "") return null;
    const l = parseBatchLabel(v);
    return l.code ? l : null;
  };
  return {
    batchId: asInt(batch["id"]),
    hourStart: asString(batch["hourStart"]).slice(0, 5),
    furnitureWip: parseBatchLabelList(j["furnitureWIP"]),
    barangJadi: parseBatchLabelList(j["barangJadi"]),
    bonggolan: single(j["bonggolan"]),
    reject: single(j["reject"]),
    keterangan: strOr(batch["keterangan"]),
    isDowntime: batch["isDowntime"] === true,
  };
}

// ── API calls ────────────────────────────────────────────────────────────────

/** GET /mst-mesin/inject — mesin inject (IdBagianMesin = 4). */
export async function fetchInjectMesin(
  token: string | undefined,
): Promise<InjectMesinResult> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    data?: Record<string, unknown>[];
    activeShift?: Record<string, unknown>;
  }>("/mst-mesin/inject", t);
  const mesinList = (res.data.data ?? []).map(parseInjectMesinInfo);
  const shiftRaw = res.data.activeShift;
  const activeShift: InjectActiveShift | null = shiftRaw
    ? {
        shift: asInt(shiftRaw["shift"] ?? shiftRaw["noShift"], 1),
        hourStart: asString(shiftRaw["hourStart"]).slice(0, 5),
        hourEnd: asString(shiftRaw["hourEnd"]).slice(0, 5),
      }
    : null;
  return { mesinList, activeShift };
}

/** GET /mst-cetakan — master cetakan aktif. */
export async function fetchCetakanList(
  token: string | undefined,
): Promise<CetakanItem[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ data?: Record<string, unknown>[] }>(
    "/mst-cetakan",
    t,
  );
  return (res.data.data ?? [])
    .map(parseCetakan)
    .filter((x) => x.idCetakan !== 0 && x.enable);
}

/** GET /mst-warna/cetakan/:idCetakan — warna yang tersedia untuk cetakan. */
export async function fetchWarnaByCetakan(
  token: string | undefined,
  idCetakan: number,
): Promise<WarnaItem[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ data?: Record<string, unknown>[] }>(
    `/mst-warna/cetakan/${idCetakan}`,
    t,
  );
  return (res.data.data ?? [])
    .map(parseWarna)
    .filter((x) => x.idWarna !== 0 && x.enable);
}

/** GET /mst-furniture-material/by-cetakan-warna — opsional (404 = kosong). */
export async function fetchFurnitureMaterialByCetakanWarna(
  token: string | undefined,
  idCetakan: number,
  idWarna: number,
): Promise<FurnitureMaterialItem[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    data?: Record<string, unknown>[] | Record<string, unknown>;
  }>(
    `/mst-furniture-material/by-cetakan-warna?idCetakan=${idCetakan}&idWarna=${idWarna}`,
    t,
  );
  if (res.status === 404) return [];
  const data = res.data.data;
  const rows = Array.isArray(data) ? data : data ? [data] : [];
  return rows
    .map(parseFurnitureMaterial)
    .filter((x) => x.idFurnitureMaterial !== 0);
}

/**
 * Jenis output untuk dropdown bila mapping Master Input Output belum ada:
 * fwip = GET /furniture-wip-type, bj = GET /packing-type.
 */
export async function fetchOutputTypes(
  token: string | undefined,
  category: "fwip" | "bj",
): Promise<OutputTypeItem[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ data?: Record<string, unknown>[] }>(
    category === "fwip" ? "/furniture-wip-type" : "/packing-type",
    t,
  );
  return (res.data.data ?? [])
    .map((j) =>
      category === "fwip"
        ? {
            idJenis: asInt(j["IdCabinetWIP"] ?? j["idCabinetWip"]),
            nama: asString(j["Nama"] ?? j["nama"]),
          }
        : {
            idJenis: asInt(j["IdBJ"] ?? j["idBj"]),
            nama: asString(j["NamaBJ"] ?? j["nama"]),
          },
    )
    .filter((x) => x.idJenis !== 0);
}

/** GET /reject-type — jenis reject aktif (untuk output Reject). */
export async function fetchRejectTypes(
  token: string | undefined,
): Promise<RejectTypeItem[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ data?: Record<string, unknown>[] }>(
    "/reject-type",
    t,
  );
  const rows = res.data.data ?? [];
  return rows.map(parseRejectType).filter((x) => x.idReject !== 0);
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

export async function fetchInjectList(
  token: string | undefined,
  params: FetchInjectListParams = {},
): Promise<FetchInjectListResult> {
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
  }>(`/production/inject?${qp.toString()}`, t);

  const items = (res.data.data ?? []).map(parseInjectProduction);
  const meta = res.data.meta ?? {};
  return {
    items,
    page: asInt(meta.page, params.page ?? 1),
    totalPages: asInt(meta.totalPages, 1),
    total: asInt(res.data.totalData ?? meta.total, 0),
  };
}

export async function fetchInjectOne(
  token: string | undefined,
  noProduksi: string,
): Promise<InjectProduction | null> {
  const result = await fetchInjectList(token, {
    page: 1,
    pageSize: 1,
    search: noProduksi.trim(),
  });
  return result.items[0] ?? null;
}

export async function createInject(
  token: string | undefined,
  payload: CreateInjectPayload,
): Promise<InjectProduction> {
  const t = requireToken(token);
  const body: Record<string, unknown> = {
    tglProduksi: payload.tglProduksi,
    idMesin: payload.idMesin,
    idOperators: payload.idOperators,
    shift: payload.shift,
    idRegu: payload.idRegu,
    idCetakan: payload.idCetakan,
    idWarna: payload.idWarna,
    jmlhAnggota: payload.idOperators.length,
    hadir: payload.idOperators.length,
    hourStart: payload.hourStart ? normalizeTime(payload.hourStart) : null,
    hourEnd: payload.hourEnd ? normalizeTime(payload.hourEnd) : null,
  };
  if (payload.idFurnitureMaterial) {
    body.idFurnitureMaterial = payload.idFurnitureMaterial;
  }
  if (payload.jamKerja != null) body.jam = payload.jamKerja;

  const res = await apiFetchAuth<{
    data?: Record<string, unknown>;
    message?: string;
  }>("/production/inject", t, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (res.status !== 201 && res.status !== 200) {
    throw new ApiRequestError(
      res.data.message ?? `Gagal membuat produksi (${res.status})`,
    );
  }
  if (!res.data.data) throw new ApiRequestError("Response create tidak valid");
  return parseInjectProduction(res.data.data);
}

export async function updateInject(
  token: string | undefined,
  noProduksi: string,
  payload: UpdateInjectPayload,
): Promise<InjectProduction> {
  const t = requireToken(token);
  const body: Record<string, unknown> = {};
  if (payload.tglProduksi) body.tglProduksi = payload.tglProduksi;
  if (payload.idMesin != null) body.idMesin = payload.idMesin;
  if (payload.idOperators?.length) {
    body.idOperators = payload.idOperators;
    body.jmlhAnggota = payload.idOperators.length;
    body.hadir = payload.idOperators.length;
  }
  if (payload.idRegu != null) body.idRegu = payload.idRegu;
  if (payload.jamKerja != null) body.jam = payload.jamKerja;
  if (payload.shift != null) body.shift = payload.shift;
  if (payload.hourStart) body.hourStart = normalizeTime(payload.hourStart);
  if (payload.hourEnd) body.hourEnd = normalizeTime(payload.hourEnd);
  if (payload.idCetakan != null) body.idCetakan = payload.idCetakan;
  if (payload.idWarna != null) body.idWarna = payload.idWarna;
  if (payload.idFurnitureMaterial != null) {
    body.idFurnitureMaterial = payload.idFurnitureMaterial;
  }
  if (payload.hourMeter != null) body.hourMeter = payload.hourMeter;
  if (payload.checkBy1) body.checkBy1 = payload.checkBy1;
  if (payload.checkBy2) body.checkBy2 = payload.checkBy2;
  if (payload.approveBy) body.approveBy = payload.approveBy;

  const res = await apiFetchAuth<{
    data?: Record<string, unknown>;
    message?: string;
  }>(`/production/inject/${encodeURIComponent(noProduksi)}`, t, {
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
  return parseInjectProduction(res.data.data);
}

export async function deleteInject(
  token: string | undefined,
  noProduksi: string,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ message?: string; error?: string }>(
    `/production/inject/${encodeURIComponent(noProduksi)}`,
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

export async function completeInject(
  token: string | undefined,
  noProduksi: string,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ message?: string; success?: boolean }>(
    `/production/inject/${encodeURIComponent(noProduksi)}/complete`,
    t,
    { method: "PATCH" },
  );
  if (res.status !== 200 || res.data.success === false) {
    throw new ApiRequestError(
      res.data.message ?? `Gagal menyelesaikan (${res.status})`,
    );
  }
}

export async function uncompleteInject(
  token: string | undefined,
  noProduksi: string,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ message?: string; success?: boolean }>(
    `/production/inject/${encodeURIComponent(noProduksi)}/uncomplete`,
    t,
    { method: "PATCH" },
  );
  if (res.status !== 200 || res.data.success === false) {
    throw new ApiRequestError(
      res.data.message ?? `Gagal membuka kunci (${res.status})`,
    );
  }
}

export async function splitInjectTime(
  token: string | undefined,
  idMesin: number,
  tanggal: string,
  payload: {
    hourStart: string;
    idCetakan: number;
    idWarna: number;
    idFurnitureMaterial?: number;
    /** Batch bucket jam berjalan yang ikut disubmit saat ganti (realtime). */
    batch?: Record<string, unknown>;
  },
): Promise<{ noProduksi?: string }> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    message?: string;
    data?: Record<string, unknown>;
    noProduksi?: string;
  }>(
    `/production/inject/split-time/${idMesin}/${encodeURIComponent(tanggal)}`,
    t,
    {
      method: "POST",
      body: JSON.stringify({
        hourStart: normalizeTime(payload.hourStart),
        idCetakan: payload.idCetakan,
        idWarna: payload.idWarna,
        ...(payload.idFurnitureMaterial
          ? { idFurnitureMaterial: payload.idFurnitureMaterial }
          : {}),
        ...(payload.batch ? { batch: payload.batch } : {}),
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

export async function fetchInjectInputs(
  token: string | undefined,
  noProduksi: string,
): Promise<InjectInputs> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ data?: Record<string, unknown> }>(
    `/production/inject/${encodeURIComponent(noProduksi)}/inputs`,
    t,
  );
  if (!res.data.data) throw new ApiRequestError("Response inputs tidak valid");
  return parseInjectInputs(res.data.data);
}

export async function fetchInjectOutputs(
  token: string | undefined,
  noProduksi: string,
): Promise<InjectOutput[]> {
  const t = requireToken(token);
  const no = encodeURIComponent(noProduksi);
  const get = (path: string) =>
    apiFetchAuth<{ data?: Record<string, unknown>[] }>(
      `/production/inject/${no}/outputs/${path}`,
      t,
    ).catch(() => ({ status: 200, data: { data: [] as Record<string, unknown>[] } }));
  const [fwip, bj, reject, bonggolan] = await Promise.all([
    get("furniture-wip"),
    get("barang-jadi"),
    get("reject"),
    get("bonggolan"),
  ]);
  const map = (
    r: { data: { data?: Record<string, unknown>[] } },
    c: InjectOutputCategory,
  ) => (r.data.data ?? []).map((j) => parseInjectOutput(j, c));
  return [
    ...map(fwip, "fwip"),
    ...map(bj, "bj"),
    ...map(bonggolan, "bonggolan"),
    ...map(reject, "reject"),
  ];
}

export async function submitInjectInputs(
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
    `/production/inject/${encodeURIComponent(noProduksi)}/inputs`,
    t,
    {
      method: "POST",
      body: JSON.stringify({
        ...payload,
        // Backend Inject menyimpan material di kolom Pcs.
        ...(payload.cabinetMaterial
          ? {
              cabinetMaterial: payload.cabinetMaterial.map(
                ({ jumlah, ...rest }) => ({ ...rest, pcs: jumlah }),
              ),
            }
          : {}),
      }),
    },
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

export async function deleteInjectInputs(
  token: string | undefined,
  noProduksi: string,
  payload: DeleteInputsPayload,
): Promise<Record<string, unknown>> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ success?: boolean; message?: string }>(
    `/production/inject/${encodeURIComponent(noProduksi)}/inputs`,
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
 * (D. Broker, H. Mixer, V. Gilingan, BB. Furniture WIP). 404 = tidak ada / sudah dipakai.
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
 * Create label output Furniture WIP — POST /labels/furniture-wip
 * (outputCode = NoProduksi Inject, prefix S.).
 */
export async function createFwipOutput(
  token: string | undefined,
  noProduksi: string,
  idJenis: number,
  tanggal: string,
  pcs: number,
): Promise<string> {
  const t = requireToken(token);
  const payload = {
    header: {
      IdFurnitureWIP: idJenis,
      Pcs: pcs,
      DateCreate: tanggal,
    },
    outputCode: noProduksi,
  };
  const res = await apiFetchAuth<{
    data?: Record<string, unknown> | Record<string, unknown>[];
    message?: string;
  }>("/labels/furniture-wip", t, {
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
  return asString(first["NoFurnitureWIP"] ?? first["noFurnitureWIP"]);
}

/**
 * Create label output Barang Jadi — POST /labels/packing
 * (outputCode = NoProduksi Inject).
 */
export async function createBjOutput(
  token: string | undefined,
  noProduksi: string,
  idBj: number,
  tanggal: string,
  pcs: number,
): Promise<string> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    data?: Record<string, unknown> | Record<string, unknown>[];
    message?: string;
  }>("/labels/packing", t, {
    method: "POST",
    body: JSON.stringify({
      header: { IdBJ: idBj, Pcs: pcs, DateCreate: tanggal },
      outputCode: noProduksi,
    }),
  });
  if (res.status !== 200 && res.status !== 201) {
    throw new ApiRequestError(
      res.data.message ?? `Gagal membuat label (${res.status})`,
    );
  }
  return firstLabelNo(res.data.data, ["NoBJ", "noBJ"]);
}

/**
 * Create label output Bonggolan — POST /labels/bonggolan
 * (ProcessedCode = NoProduksi Inject, gudang 5).
 */
export async function createBonggolanOutput(
  token: string | undefined,
  noProduksi: string,
  idBonggolan: number,
  tanggal: string,
  berat: number,
): Promise<string> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    data?: Record<string, unknown> | Record<string, unknown>[];
    message?: string;
  }>("/labels/bonggolan", t, {
    method: "POST",
    body: JSON.stringify({
      header: {
        IdBonggolan: idBonggolan,
        IdWarehouse: 5,
        DateCreate: tanggal,
        Berat: berat,
      },
      ProcessedCode: noProduksi,
    }),
  });
  if (res.status !== 200 && res.status !== 201) {
    throw new ApiRequestError(
      res.data.message ?? `Gagal membuat label (${res.status})`,
    );
  }
  return firstLabelNo(res.data.data, ["NoBonggolan", "noBonggolan"]);
}

/** Ambil nomor label pertama dari response create label (headers/header/array). */
function firstLabelNo(
  data: Record<string, unknown> | Record<string, unknown>[] | undefined,
  keys: string[],
): string {
  const rows: Record<string, unknown>[] = [];
  const collect = (d: Record<string, unknown>) => {
    const h = d["headers"];
    if (Array.isArray(h)) rows.push(...(h as Record<string, unknown>[]));
    else if (d["header"] && typeof d["header"] === "object")
      rows.push(d["header"] as Record<string, unknown>);
    else rows.push(d);
  };
  if (Array.isArray(data)) data.forEach(collect);
  else if (data) collect(data);
  const first = rows[0] ?? {};
  return asString(pickFirst(first, keys));
}

/** Create label output Reject — POST /labels/reject (outputCode = NoProduksi). */
export async function createRejectOutput(
  token: string | undefined,
  noProduksi: string,
  idReject: number,
  tanggal: string,
  berat: number,
  jam: string,
): Promise<string> {
  const t = requireToken(token);
  const payload = {
    header: {
      IdReject: idReject,
      Berat: berat,
      DateCreate: tanggal,
      Jam: jam,
    },
    outputCode: noProduksi,
  };
  const res = await apiFetchAuth<{
    data?: Record<string, unknown> | Record<string, unknown>[];
    message?: string;
  }>("/labels/reject", t, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (res.status !== 200 && res.status !== 201) {
    throw new ApiRequestError(
      res.data.message ?? `Gagal membuat label reject (${res.status})`,
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
  return asString(first["NoReject"] ?? first["noReject"]);
}

const LABEL_PATH: Record<InjectOutputCategory, string> = {
  fwip: "furniture-wip",
  bj: "packing",
  reject: "reject",
  bonggolan: "bonggolan",
};

export async function markLabelPrinted(
  token: string | undefined,
  category: InjectOutputCategory,
  noLabel: string,
): Promise<number | null> {
  const t = requireToken(token);
  const path = `/labels/${LABEL_PATH[category]}/${encodeURIComponent(noLabel)}/print`;
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
  category: InjectOutputCategory,
  noLabel: string,
): Promise<void> {
  const t = requireToken(token);
  const path = `/labels/${LABEL_PATH[category]}/${encodeURIComponent(noLabel)}`;
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
  category: InjectOutputCategory,
  noLabel: string,
): Promise<string> {
  const t = requireToken(token);
  const base = process.env.BACKEND_API_URL ?? "http://localhost:5002";
  const path = `/api/labels/${LABEL_PATH[category]}/${encodeURIComponent(noLabel)}/pdf`;
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

/** GET /mst-furniture-wip/stok — stok Furniture WIP sisa per jenis. */
export async function fetchInjectStokFwip(
  token: string | undefined,
): Promise<StokFwipItem[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ data?: Record<string, unknown>[] }>(
    "/mst-furniture-wip/stok",
    t,
  );
  if (res.status !== 200) {
    throw new ApiRequestError(`Gagal memuat stok FWIP (${res.status})`);
  }
  return (res.data.data ?? []).map(parseStokFwipItem);
}

/** GET /mst-furniture-wip/:idcabinetwip/label — label sisa per jenis. */
export async function fetchInjectStokFwipLabels(
  token: string | undefined,
  idCabinetWip: number,
): Promise<StokFwipLabel[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ data?: Record<string, unknown>[] }>(
    `/mst-furniture-wip/${idCabinetWip}/label`,
    t,
  );
  if (res.status !== 200) {
    throw new ApiRequestError(`Gagal memuat label FWIP (${res.status})`);
  }
  return (res.data.data ?? []).map(parseStokFwipLabel);
}

/** GET /production/inject/pcs-per-label/:no — target pcs/label + standar mesin. */
export async function fetchInjectPcsPerLabel(
  token: string | undefined,
  noProduksi: string,
): Promise<InjectPcsPerLabelResult> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ data?: Record<string, unknown> }>(
    `/production/inject/pcs-per-label/${encodeURIComponent(noProduksi)}`,
    t,
  );
  if (res.status !== 200) {
    throw new ApiRequestError(`Gagal memuat pcs per label (${res.status})`);
  }
  const j = res.data.data ?? {};
  return {
    outputCategory: asString(j["outputCategory"]),
    counterCurrent: asIntOrNull(j["counterCurrent"]),
    standarBerat: asDoubleOrNull(j["standarBerat"]),
    standarCycleTime: asDoubleOrNull(j["standarCycleTime"]),
    items: listOf(j["items"], (m) => ({
      idJenis: asInt(m["idJenis"]),
      namaBarang: asString(m["namaBarang"]),
      pcsPerLabel: asInt(m["pcsPerLabel"]),
      pcsPerLabelAwal: asIntOrNull(m["pcsPerLabelAwal"]),
    })),
  };
}

/** GET /production/inject/batch/:no — batch per jam yang sudah disubmit. */
export async function fetchInjectBatch(
  token: string | undefined,
  noProduksi: string,
): Promise<InjectBatchItem[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ data?: Record<string, unknown>[] }>(
    `/production/inject/batch/${encodeURIComponent(noProduksi)}`,
    t,
  );
  if (res.status === 404) return [];
  if (res.status !== 200) {
    throw new ApiRequestError(`Gagal memuat batch (${res.status})`);
  }
  return (res.data.data ?? []).map(parseBatchItem);
}

/** POST /production/inject/batch — submit bucket jam (atau downtime). */
export async function submitInjectBatch(
  token: string | undefined,
  payload: InjectBatchSubmitPayload,
): Promise<InjectBatchSubmitResult> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    data?: Record<string, unknown>;
    message?: string;
  }>("/production/inject/batch", t, {
    method: "POST",
    body: JSON.stringify({
      ...payload,
      hourStart: normalizeTime(payload.hourStart),
    }),
  });
  if (res.status < 200 || res.status >= 300) {
    throw new ApiRequestError(
      res.data.message ?? `Gagal submit batch (${res.status})`,
    );
  }
  return parseBatchSubmitResult(res.data.data ?? {});
}

/**
 * POST /production/inject/:no/terminate — akhiri produksi di tengah jam:
 * HourEnd diubah ke jam terminate, batch terakhir disubmit, lalu complete.
 */
export async function terminateInject(
  token: string | undefined,
  noProduksi: string,
  payload: Omit<InjectBatchSubmitPayload, "noProduksi"> & { hourEnd: string },
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ message?: string }>(
    `/production/inject/${encodeURIComponent(noProduksi)}/terminate`,
    t,
    {
      method: "POST",
      body: JSON.stringify({
        ...payload,
        hourStart: normalizeTime(payload.hourStart),
        hourEnd: normalizeTime(payload.hourEnd),
      }),
    },
  );
  if (res.status < 200 || res.status >= 300) {
    throw new ApiRequestError(
      res.data.message ?? `Gagal terminate produksi (${res.status})`,
    );
  }
}

/** POST /production/inject/:no/pcs-per-label/discard — reset target awal. */
export async function discardInjectPcsPerLabel(
  token: string | undefined,
  noProduksi: string,
  idJenis: number,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ message?: string }>(
    `/production/inject/${encodeURIComponent(noProduksi)}/pcs-per-label/discard`,
    t,
    { method: "POST", body: JSON.stringify({ idJenis }) },
  );
  if (res.status < 200 || res.status >= 300) {
    throw new ApiRequestError(
      res.data.message ?? `Gagal reset target awal (${res.status})`,
    );
  }
}

export { apiFetch, ApiRequestError };
