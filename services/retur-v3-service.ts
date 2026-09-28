import { apiFetchAuth, ApiRequestError } from "@/services/api";

export type ReturStatus = "PENDING" | "DIGANTI" | "TIDAK_DIGANTI";

export type ReturHeader = {
  noRetur: string;
  tanggal: string | null;
  idPembeli: number | null;
  namaPembeli: string | null;
  keterangan: string | null;
  statusRetur: ReturStatus | string;
  isComplete: boolean;
  isLocked: boolean;
  itemCount: number;
  turnoverTargetPcs: number;
  turnoverScannedPcs: number;
  decisionBy: number | null;
  decisionByUsername: string | null;
  decisionAt: string | null;
  completedByUsername: string | null;
  completedAt: string | null;
  dateTimeCreate: string | null;
  isPending: boolean;
  isDiganti: boolean;
  isTidakDiganti: boolean;
  isTurnoverFulfilled: boolean;
};

export type ReturItem = {
  idItem: number;
  kodeKategori: string;
  idJenis: number;
  namaJenis: string | null;
  pcs: number;
  kategoriInput: string;
  berat: number | null;
  idReject: number | null;
  namaReject: string | null;
  generatedLabelCode: string | null;
  hasGeneratedLabel: boolean;
  isReject: boolean;
  turnoverTargetPcs: number | null;
  turnoverScannedPcs: number | null;
  turnoverRemainingPcs: number | null;
  turnoverFulfilled: boolean | null;
};

export type ReturOutput = {
  labelCode: string;
  dateCreate: string | null;
  namaJenis: string | null;
  kodeKategori: string;
  kategori: string | null;
  uom: string | null;
  blok: string | null;
  idLokasi: number | null;
  qty: number;
  printCount: number;
  hasBeenPrinted: boolean;
};

export type ReturScanEntry = {
  idTurnover: number;
  labelCode: string;
  noPartial: string | null;
  pcs: number;
  dateTimeScan: string | null;
  isPartialSplit: boolean;
};

export type ReturTurnover = {
  idItem: number;
  kodeKategoriAsal: string | null;
  idJenisAsal: number | null;
  namaJenisAsal: string | null;
  pcsAsal: number;
  scannedPcs: number;
  isFulfilled: boolean;
  remainingPcs: number;
  scans: ReturScanEntry[];
};

export type ReturDetail = {
  header: ReturHeader;
  items: ReturItem[];
  turnover: ReturTurnover[];
  outputs: ReturOutput[];
};

export type FetchReturListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type FetchReturListResult = {
  items: ReturHeader[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type ReturCreateInput = {
  tanggal: string;
  idPembeli: number;
  keterangan?: string;
};

export type ReturItemInput = {
  kodeKategori: string;
  idJenis: number;
  pcs: number;
  kategoriInput: string;
};

export type ReturScanSuggestion = {
  labelCode: string;
  availablePcs: number;
  pcsNeeded: number;
  message: string;
};

export type ReturScanData = {
  labelCode: string;
  noPartial: string | null;
  partialCode: string | null;
  wasPartialSplit: boolean;
  pcs: number;
  scannedPcs: number;
  targetPcs: number;
  kodeKategori: string;
  idItem: number;
};

export type ReturScanOutcome =
  | { kind: "success"; data: ReturScanData }
  | { kind: "needsConfirmation"; suggestion: ReturScanSuggestion };

export type PembeliOption = { idPembeli: number; namaPembeli: string };
export type JenisOption = { id: number; nama: string };

export type ReturMasters = {
  pembeli: PembeliOption[];
  barangJadi: JenisOption[];
  furnitureWip: JenisOption[];
  reject: JenisOption[];
};

function requireToken(token: string | undefined): string {
  if (!token) throw new ApiRequestError("Tidak terautentikasi");
  return token;
}

function asStr(v: unknown): string {
  return v == null ? "" : String(v);
}

function strOr(v: unknown, fallback: string): string {
  const s = asStr(v).trim();
  return s === "" ? fallback : s;
}

function asInt(v: unknown, fallback = 0): number {
  if (v == null || v === "") return fallback;
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function asIntOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function asFloatOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function asBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  const s = asStr(v).toLowerCase();
  return s === "true" || s === "1" || s === "y" || s === "yes";
}

function pick<T>(row: Record<string, unknown>, keys: string[], fallback: T): T {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null) return v as T;
  }
  return fallback;
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
  okStatus: number[] = [200, 201],
): Promise<void> {
  if (okStatus.includes(status) && (!data || data.success !== false)) return;
  throw new ApiRequestError(errMsg(data, fallback));
}

function parseHeader(raw: Record<string, unknown>): ReturHeader {
  const status = strOr(
    pick<string>(raw, ["StatusRetur", "statusRetur", "Status", "status"], ""),
    "PENDING",
  ).toUpperCase();
  const target = asInt(raw["TurnoverTargetPcs"] ?? raw["turnoverTargetPcs"]);
  const scanned = asInt(raw["TurnoverScannedPcs"] ?? raw["turnoverScannedPcs"]);
  return {
    noRetur: asStr(raw["NoRetur"] ?? raw["noRetur"]),
    tanggal: strOr(raw["Tanggal"] ?? raw["tanggal"], "") || null,
    idPembeli: asIntOrNull(raw["IdPembeli"] ?? raw["idPembeli"]),
    namaPembeli:
      strOr(raw["NamaPembeli"] ?? raw["namaPembeli"], "") || null,
    keterangan: strOr(raw["Keterangan"] ?? raw["keterangan"], "") || null,
    statusRetur: status,
    isComplete: asBool(raw["IsComplete"] ?? raw["isComplete"]),
    isLocked: asBool(raw["IsLocked"] ?? raw["isLocked"]),
    itemCount: asInt(raw["ItemCount"] ?? raw["itemCount"]),
    turnoverTargetPcs: target,
    turnoverScannedPcs: scanned,
    decisionBy: asIntOrNull(raw["DecisionBy"] ?? raw["decisionBy"]),
    decisionByUsername:
      strOr(
        raw["DecisionByUsername"] ?? raw["decisionByUsername"],
        "",
      ) || null,
    decisionAt: strOr(raw["DecisionAt"] ?? raw["decisionAt"], "") || null,
    completedByUsername:
      strOr(
        raw["CompletedByUsername"] ?? raw["completedByUsername"],
        "",
      ) || null,
    completedAt: strOr(raw["CompletedAt"] ?? raw["completedAt"], "") || null,
    dateTimeCreate:
      strOr(raw["DateTimeCreate"] ?? raw["dateTimeCreate"], "") || null,
    isPending: status === "PENDING",
    isDiganti: status === "DIGANTI",
    isTidakDiganti: status === "TIDAK_DIGANTI",
    isTurnoverFulfilled: target > 0 && scanned >= target,
  };
}

function parseItem(raw: Record<string, unknown>): ReturItem {
  const generated =
    strOr(
      pick<string>(
        raw,
        ["GeneratedLabelCode", "generatedLabelCode", "labelCode", "LabelCode"],
        "",
      ),
      "",
    ) || null;
  const target = asIntOrNull(raw["TurnoverTargetPcs"] ?? raw["turnoverTargetPcs"]);
  const scanned = asIntOrNull(
    raw["TurnoverScannedPcs"] ?? raw["turnoverScannedPcs"],
  );
  const hasTurnover = target !== null && scanned !== null;
  return {
    idItem: asInt(pick<number>(raw, ["IdItem", "idItem", "id"], 0)),
    kodeKategori: asStr(
      raw["KodeKategori"] ?? raw["kodeKategori"] ?? "",
    ).toLowerCase(),
    idJenis: asInt(raw["IdJenis"] ?? raw["idJenis"]),
    namaJenis: strOr(raw["NamaJenis"] ?? raw["namaJenis"], "") || null,
    pcs: asInt(raw["Pcs"] ?? raw["pcs"]),
    kategoriInput: asStr(
      raw["KategoriInput"] ?? raw["kategoriInput"] ?? "BAGUS",
    ).toUpperCase(),
    berat: asFloatOrNull(raw["Berat"] ?? raw["berat"]),
    idReject: asIntOrNull(raw["IdReject"] ?? raw["idReject"]),
    namaReject: strOr(raw["NamaReject"] ?? raw["namaReject"], "") || null,
    generatedLabelCode: generated,
    hasGeneratedLabel: generated !== null,
    isReject: asStr(raw["KategoriInput"] ?? raw["kategoriInput"]).toUpperCase() === "REJECT",
    turnoverTargetPcs: target,
    turnoverScannedPcs: scanned,
    turnoverRemainingPcs: asIntOrNull(
      raw["TurnoverRemainingPcs"] ?? raw["turnoverRemainingPcs"],
    ),
    turnoverFulfilled: hasTurnover
      ? asBool(raw["TurnoverFulfilled"] ?? raw["turnoverFulfilled"])
      : null,
  };
}

function parseOutput(raw: Record<string, unknown>): ReturOutput {
  const printedRaw = pick<unknown>(
    raw,
    ["HasBeenPrinted", "hasBeenPrinted", "printCount"],
    0,
  );
  let printCount = 0;
  if (typeof printedRaw === "number") printCount = printedRaw;
  else if (typeof printedRaw === "string") {
    const s = printedRaw.toLowerCase();
    printCount = s === "true" ? 1 : parseInt(printedRaw, 10) || 0;
  } else if (typeof printedRaw === "boolean") printCount = printedRaw ? 1 : 0;
  const kodeKategori = asStr(
    raw["KodeKategori"] ?? raw["kodeKategori"] ?? "",
  ).toLowerCase();
  return {
    labelCode: asStr(
      pick<string>(
        raw,
        ["LabelCode", "labelCode", "NoFurnitureWIP", "NoBJ", "NoReject"],
        "",
      ),
    ),
    dateCreate: strOr(raw["DateCreate"] ?? raw["dateCreate"], "") || null,
    namaJenis: strOr(raw["NamaJenis"] ?? raw["namaJenis"], "") || null,
    kodeKategori,
    kategori: strOr(raw["Kategori"] ?? raw["kategori"], "") || null,
    uom: strOr(raw["Uom"] ?? raw["uom"], "") || null,
    blok: strOr(raw["Blok"] ?? raw["blok"], "") || null,
    idLokasi: asIntOrNull(raw["IdLokasi"] ?? raw["idLokasi"]),
    qty: asInt(raw["Qty"] ?? raw["qty"]),
    printCount,
    hasBeenPrinted: printCount > 0,
  };
}

function parseTurnover(raw: Record<string, unknown>): ReturTurnover {
  const scansRaw = Array.isArray(raw["scans"] ?? raw["Scans"])
    ? ((raw["scans"] ?? raw["Scans"]) as Record<string, unknown>[])
    : [];
  const scans: ReturScanEntry[] = scansRaw.map((s) => {
    const noPartial = strOr(s["noPartial"] ?? s["NoPartial"], "") || null;
    return {
      idTurnover: asInt(s["idTurnover"] ?? s["IdTurnover"]),
      labelCode: asStr(s["labelCode"] ?? s["LabelCode"] ?? ""),
      noPartial,
      pcs: asInt(s["pcs"] ?? s["Pcs"]),
      dateTimeScan:
        strOr(s["dateTimeScan"] ?? s["DateTimeScan"], "") || null,
      isPartialSplit: noPartial !== null,
    };
  });
  const pcsAsal = asInt(
    pick<number>(raw, ["pcsAsal", "PcsAsal", "pcs", "Pcs"], 0),
  );
  const scannedPcs = asInt(raw["scannedPcs"] ?? raw["ScannedPcs"]);
  return {
    idItem: asInt(raw["idItem"] ?? raw["IdItem"]),
    kodeKategoriAsal:
      strOr(
        raw["kodeKategoriAsal"] ?? raw["KodeKategoriAsal"] ?? raw["kodeKategori"] ?? "",
        "",
      ).toLowerCase() || null,
    idJenisAsal: asIntOrNull(
      raw["idJenisAsal"] ?? raw["IdJenisAsal"] ?? raw["idJenis"] ?? raw["IdJenis"],
    ),
    namaJenisAsal:
      strOr(
        raw["namaJenisAsal"] ?? raw["NamaJenisAsal"] ?? raw["namaJenis"] ?? "",
        "",
      ) || null,
    pcsAsal,
    scannedPcs,
    isFulfilled: pcsAsal > 0 && scannedPcs >= pcsAsal,
    remainingPcs: Math.max(pcsAsal - scannedPcs, 0),
    scans,
  };
}

function dataOf(res: {
  status: number;
  data: Record<string, unknown> | null;
}): Record<string, unknown> | null {
  const d = res.data;
  if (!d) return null;
  return (d["data"] as Record<string, unknown>) ?? null;
}

export async function fetchReturList(
  token: string | undefined,
  params: FetchReturListParams = {},
): Promise<FetchReturListResult> {
  const t = requireToken(token);
  const qs = new URLSearchParams();
  const page = Math.max(params.page ?? 1, 1);
  const pageSize = Math.min(Math.max(params.pageSize ?? 20, 1), 100);
  qs.set("page", String(page));
  qs.set("pageSize", String(pageSize));
  const search = (params.search ?? "").trim();
  if (search) qs.set("search", search);
  const status = (params.status ?? "").trim();
  if (status) qs.set("status", status);
  if (params.dateFrom) qs.set("dateFrom", params.dateFrom);
  if (params.dateTo) qs.set("dateTo", params.dateTo);

  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: Record<string, unknown>[];
    total?: number;
    page?: number;
    pageSize?: number;
  }>(`/retur-v3?${qs.toString()}`, t);
  await expectOk(res.status, res.data, "Gagal memuat data retur");
  const rows = Array.isArray(res.data.data) ? res.data.data : [];
  const total = asInt(res.data.total);
  const effPage = asInt(res.data.page, page);
  const effSize = Math.max(asInt(res.data.pageSize, pageSize), 1);
  return {
    items: rows.map(parseHeader),
    total,
    page: effPage,
    pageSize: effSize,
    totalPages: Math.max(Math.ceil(total / effSize), 1),
  };
}

export async function fetchReturDetail(
  token: string | undefined,
  noRetur: string,
): Promise<{ header: ReturHeader; items: ReturItem[] }> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>(`/retur-v3/${encodeURIComponent(noRetur)}`, t);
  await expectOk(res.status, res.data, "Gagal memuat detail retur");
  const d = dataOf(res);
  if (!d) throw new ApiRequestError("Data retur tidak ditemukan");
  const itemsRaw = Array.isArray(d["items"]) ? (d["items"] as Record<string, unknown>[]) : [];
  return { header: parseHeader(d), items: itemsRaw.map(parseItem) };
}

export async function fetchReturTurnover(
  token: string | undefined,
  noRetur: string,
): Promise<ReturTurnover[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: Record<string, unknown>[];
  }>(`/retur-v3/${encodeURIComponent(noRetur)}/turnover`, t);
  await expectOk(res.status, res.data, "Gagal memuat data turnover");
  const rows = Array.isArray(res.data.data) ? res.data.data : [];
  return rows.map(parseTurnover);
}

export async function fetchReturOutputs(
  token: string | undefined,
  noRetur: string,
): Promise<ReturOutput[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: Record<string, unknown>[];
  }>(`/retur-v3/${encodeURIComponent(noRetur)}/outputs`, t);
  await expectOk(res.status, res.data, "Gagal memuat label hasil generate");
  const rows = Array.isArray(res.data.data) ? res.data.data : [];
  return rows.map(parseOutput);
}

export async function fetchReturMasters(
  token: string | undefined,
): Promise<ReturMasters> {
  const t = requireToken(token);

  const [pembeliRes, bjRes, fwipRes, rejectRes] = await Promise.all([
    apiFetchAuth<{ success?: boolean; data?: Record<string, unknown>[] }>(
      "/mst/pembeli",
      t,
    ),
    apiFetchAuth<{ success?: boolean; data?: Record<string, unknown>[] }>(
      "/mst-barang-jadi",
      t,
    ),
    apiFetchAuth<{ success?: boolean; data?: Record<string, unknown>[] }>(
      "/furniture-wip-type",
      t,
    ),
    apiFetchAuth<{ success?: boolean; data?: Record<string, unknown>[] }>(
      "/reject-type",
      t,
    ),
  ]);

  const rows = (r: typeof pembeliRes) =>
    Array.isArray(r.data.data) ? r.data.data : [];

  return {
    pembeli: rows(pembeliRes).map((p) => ({
      idPembeli: asInt(p["IdPembeli"] ?? p["idPembeli"]),
      namaPembeli: asStr(p["NamaPembeli"] ?? p["namaPembeli"]),
    })),
    barangJadi: rows(bjRes).map((p) => ({
      id: asInt(p["idJenis"] ?? p["IdBJ"] ?? p["IdJenis"]),
      nama: asStr(p["namaJenis"] ?? p["NamaBJ"] ?? p["NamaJenis"]),
    })),
    furnitureWip: rows(fwipRes).map((p) => ({
      id: asInt(p["IdCabinetWIP"] ?? p["idCabinetWip"]),
      nama: asStr(p["Nama"] ?? p["nama"]),
    })),
    reject: rows(rejectRes).map((p) => ({
      id: asInt(p["IdReject"] ?? p["idReject"]),
      nama: asStr(p["NamaReject"] ?? p["namaReject"]),
    })),
  };
}

export async function createRetur(
  token: string | undefined,
  input: ReturCreateInput,
): Promise<string> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>("/retur-v3", t, {
    method: "POST",
    body: JSON.stringify({
      tanggal: input.tanggal,
      idPembeli: input.idPembeli,
      ...(input.keterangan ? { keterangan: input.keterangan } : {}),
    }),
  });
  await expectOk(res.status, res.data, "Gagal membuat retur");
  const noRetur = asStr(res.data.data?.["noRetur"] ?? res.data.data?.["NoRetur"]);
  if (!noRetur) throw new ApiRequestError("Nomor retur tidak diterima dari server");
  return noRetur;
}

export async function addReturItems(
  token: string | undefined,
  noRetur: string,
  items: ReturItemInput[],
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ success?: boolean; message?: string }>(
    `/retur-v3/${encodeURIComponent(noRetur)}/items`,
    t,
    { method: "POST", body: JSON.stringify({ items }) },
  );
  await expectOk(res.status, res.data, "Gagal menyimpan item retur");
}

export async function decideRetur(
  token: string | undefined,
  noRetur: string,
  decision: "DIGANTI" | "TIDAK_DIGANTI",
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ success?: boolean; message?: string }>(
    `/retur-v3/${encodeURIComponent(noRetur)}/decision`,
    t,
    { method: "PATCH", body: JSON.stringify({ decision }) },
  );
  await expectOk(res.status, res.data, "Gagal menetapkan keputusan");
}

export async function generateReturLabel(
  token: string | undefined,
  noRetur: string,
  idItem: number,
  body: { berat?: number; idReject?: number } = {},
): Promise<{ labelCode: string; kodeKategori: string }> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>(
    `/retur-v3/${encodeURIComponent(noRetur)}/items/${idItem}/generate-label`,
    t,
    { method: "POST", body: JSON.stringify(body) },
  );
  await expectOk(res.status, res.data, "Gagal generate label");
  const d = dataOf(res) ?? {};
  return {
    labelCode: asStr(
      pick<string>(d, ["labelCode", "LabelCode"], ""),
    ),
    kodeKategori: asStr(d["kodeKategori"] ?? d["KodeKategori"] ?? "").toLowerCase(),
  };
}

export async function scanReturLabel(
  token: string | undefined,
  noRetur: string,
  labelCode: string,
  confirmPartial = false,
): Promise<ReturScanOutcome> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    needsConfirmation?: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>(`/retur-v3/${encodeURIComponent(noRetur)}/scan`, t, {
    method: "POST",
    body: JSON.stringify({ labelCode, confirmPartial }),
  });

  if (res.data?.needsConfirmation === true) {
    const d = res.data.data ?? {};
    return {
      kind: "needsConfirmation",
      suggestion: {
        labelCode: asStr(d["labelCode"] ?? d["LabelCode"] ?? labelCode),
        availablePcs: asInt(d["availablePcs"] ?? d["AvailablePcs"]),
        pcsNeeded: asInt(d["pcsNeeded"] ?? d["PcsNeeded"]),
        message: strOr(
          d["message"] ?? res.data.message,
          "Pcs label melebihi sisa kebutuhan",
        ),
      },
    };
  }
  await expectOk(res.status, res.data, "Gagal scan label");
  const d = dataOf(res) ?? {};
  const noPartial = strOr(d["noPartial"] ?? d["NoPartial"], "") || null;
  const partialCode =
    strOr(d["partialCode"] ?? d["PartialCode"], "") || null;
  return {
    kind: "success",
    data: {
      labelCode: asStr(d["labelCode"] ?? d["LabelCode"] ?? labelCode),
      noPartial,
      partialCode,
      wasPartialSplit: asBool(d["wasPartialSplit"] ?? d["WasPartialSplit"]),
      pcs: asInt(d["pcs"] ?? d["Pcs"]),
      scannedPcs: asInt(d["scannedPcs"] ?? d["ScannedPcs"]),
      targetPcs: asInt(d["targetPcs"] ?? d["TargetPcs"]),
      kodeKategori: asStr(d["kodeKategori"] ?? d["KodeKategori"] ?? "").toLowerCase(),
      idItem: asInt(d["idItem"] ?? d["IdItem"]),
    },
  };
}

export async function undoReturScan(
  token: string | undefined,
  noRetur: string,
  idTurnover: number,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ success?: boolean; message?: string }>(
    `/retur-v3/${encodeURIComponent(noRetur)}/turnover/${idTurnover}`,
    t,
    { method: "DELETE" },
  );
  await expectOk(res.status, res.data, "Gagal membatalkan scan");
}

export async function completeRetur(
  token: string | undefined,
  noRetur: string,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ success?: boolean; message?: string }>(
    `/retur-v3/${encodeURIComponent(noRetur)}/complete`,
    t,
    { method: "PATCH", body: JSON.stringify({}) },
  );
  await expectOk(res.status, res.data, "Gagal mengirim retur");
}

/** Kategori label untuk endpoint PDF/cetak (`packing` | `furniture-wip` | `reject`). */
export function labelCategoryOf(
  kodeKategori: string,
): "bj" | "fwip" | "reject" {
  const k = kodeKategori.toLowerCase();
  if (k === "furniturewip") return "fwip";
  if (k === "reject") return "reject";
  return "bj";
}
