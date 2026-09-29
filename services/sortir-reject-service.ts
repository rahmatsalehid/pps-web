import { getBackendBaseUrl, apiFetchAuth, ApiRequestError } from "@/services/api";

export type SrOutputType = "barangJadi" | "reject";

export type SrLabelInfo = {
  labelCode: string;
  category: string;
  idJenis: number;
  namaJenis: string;
  pcs: number;
  createBy: string | null;
};

export type SrInputLabel = {
  noBJ: string;
  dateCreate: string | null;
  idJenis: number;
  namaJenis: string;
  pcs: number;
  createBy: string | null;
};

export type SrOutputLabel = {
  noBJ: string | null;
  category: string | null;
  idJenis: number;
  namaJenis: string;
  pcs: number;
  berat: number | null;
};

export type SrTransaction = {
  noSortir: string;
  tanggal: string;
  idWarehouse: number | null;
  namaWarehouse: string | null;
  username: string | null;
  category: string | null;
  inputLabelCount: number;
  outputLabelCount: number;
  balance: boolean | null;
  totalPcsInput: number;
  totalPcsOutput: number;
  totalBeratOutput: number;
  inputs: SrInputLabel[];
  outputs: SrOutputLabel[];
};

export type SrWarehouse = { idWarehouse: number; namaWarehouse: string };
export type SrJenisItem = { id: number; nama: string };

export type SrMasters = {
  warehouses: SrWarehouse[];
  barangJadi: SrJenisItem[];
  rejectTypes: SrJenisItem[];
};

export type SrCreatePayload = {
  idWarehouse: number;
  inputs: string[];
  outputs: Record<string, unknown>[];
};

export type FetchSrListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
};

export type FetchSrListResult = {
  items: SrTransaction[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type SrPrintTarget = {
  kind: "packing" | "reject";
  noLabel: string;
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

function asIntOpt(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function asFloat(v: unknown, fallback = 0): number {
  if (v == null || v === "") return fallback;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

function asFloatOpt(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
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

function firstNonEmpty(...values: unknown[]): string | null {
  for (const v of values) {
    const s = asStr(v).trim();
    if (s) return s;
  }
  return null;
}

function labelCodeOf(j: Record<string, unknown>): string {
  return asStr(
    firstNonEmpty(
      j["NoBJ"],
      j["noBJ"],
      j["NoFurnitureWIP"],
      j["noFurnitureWIP"],
      j["noFurnitureWip"],
      j["NoFurnitureWIPPartial"],
      j["noFurnitureWIPPartial"],
      j["noFurnitureWipPartial"],
      j["NoReject"],
      j["noReject"],
      j["labelCode"],
    ),
  );
}

export function srLabelGroup(labelCode: string): string {
  const code = labelCode.toUpperCase();
  if (code.startsWith("BA")) return "BA";
  if (code.startsWith("BB")) return "BB";
  if (code.startsWith("BF")) return "BF";
  return "";
}

export function srIsRejectPrefixInput(
  inputs: { labelCode: string }[],
): boolean {
  if (inputs.length === 0) return false;
  return inputs.every((l) => {
    const code = l.labelCode.toUpperCase();
    return code.startsWith("BF") || code.startsWith("BB");
  });
}

export function srOutputTypeLabel(type: SrOutputType): string {
  return type === "reject" ? "Reject" : "Barang Jadi";
}

export function parseSrLabelInfo(raw: unknown): SrLabelInfo {
  const j = (raw ?? {}) as Record<string, unknown>;
  return {
    labelCode: asStr(j["labelCode"]),
    category: asStr(j["category"]),
    idJenis: asInt(j["idJenis"]),
    namaJenis: asStr(j["namaJenis"]),
    pcs: asInt(j["pcs"]),
    createBy: firstNonEmpty(j["createBy"], j["CreateBy"]),
  };
}

function parseSrInputLabel(raw: unknown): SrInputLabel {
  const j = (raw ?? {}) as Record<string, unknown>;
  return {
    noBJ: labelCodeOf(j),
    dateCreate: firstNonEmpty(j["DateCreate"], j["dateCreate"]),
    idJenis: asInt(j["idJenis"]),
    namaJenis: asStr(j["namaJenis"]),
    pcs: asInt(j["pcs"]),
    createBy: firstNonEmpty(j["createBy"], j["CreateBy"]),
  };
}

function parseSrOutputLabel(raw: unknown, categoryFromKey?: string) {
  const j = (raw ?? {}) as Record<string, unknown>;
  const noBJ = labelCodeOf(j);
  const berat = asFloatOpt(j["berat"] ?? j["Berat"]);
  return {
    noBJ: noBJ || null,
    category:
      firstNonEmpty(j["category"]) ?? categoryFromKey ?? null,
    idJenis: asInt(j["idJenis"]),
    namaJenis: asStr(j["namaJenis"]),
    pcs: asInt(j["pcs"]),
    berat,
  } satisfies SrOutputLabel;
}

function parseSrOutputs(raw: unknown): SrOutputLabel[] {
  if (Array.isArray(raw)) return raw.map((row) => parseSrOutputLabel(row));
  if (raw && typeof raw === "object") {
    const rows: SrOutputLabel[] = [];
    for (const [category, value] of Object.entries(
      raw as Record<string, unknown>,
    )) {
      if (!Array.isArray(value)) continue;
      for (const item of value) {
        rows.push(parseSrOutputLabel(item, category));
      }
    }
    return rows;
  }
  return [];
}

export function parseSrTransaction(raw: unknown): SrTransaction {
  const j = (raw ?? {}) as Record<string, unknown>;
  const inputsRaw = Array.isArray(j["inputs"] ?? j["Inputs"])
    ? ((j["inputs"] ?? j["Inputs"]) as unknown[])
    : [];
  const inputs = inputsRaw.map((row) =>
    typeof row === "string"
      ? { noBJ: row, dateCreate: null, idJenis: 0, namaJenis: "", pcs: 0, createBy: null }
      : parseSrInputLabel(row),
  );
  const outputs = parseSrOutputs(j["outputs"] ?? j["Outputs"]);

  let balance: boolean | null = null;
  const rawBalance = j["balance"] ?? j["Balance"];
  if (rawBalance != null) {
    balance =
      typeof rawBalance === "boolean"
        ? rawBalance
        : String(rawBalance).toLowerCase() === "true";
  }

  const rawTgl = j["tglBJSortir"] ?? j["TglBJSortir"];

  return {
    noSortir: asStr(j["noBJSortir"] ?? j["NoBJSortir"]),
    tanggal: rawTgl == null ? "" : asStr(rawTgl),
    idWarehouse: asIntOpt(j["idWarehouse"] ?? j["IdWarehouse"]),
    namaWarehouse: firstNonEmpty(j["namaWarehouse"], j["NamaWarehouse"]),
    username: firstNonEmpty(j["username"], j["Username"]),
    category: firstNonEmpty(j["category"]),
    inputLabelCount: asIntOpt(j["inputLabelCount"]) ?? inputs.length,
    outputLabelCount: asIntOpt(j["outputLabelCount"]) ?? outputs.length,
    balance,
    totalPcsInput: asInt(j["totalPcsInput"]),
    totalPcsOutput: asInt(j["totalPcsOutput"]),
    totalBeratOutput: asFloat(j["totalBeratOutput"]),
    inputs,
    outputs,
  };
}

export async function fetchSrList(
  token: string | undefined,
  params: FetchSrListParams = {},
): Promise<FetchSrListResult> {
  const t = requireToken(token);
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.max(1, params.pageSize ?? 20);
  const search = (params.search ?? "").trim();
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (search) query.set("search", search);

  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: unknown;
    total?: number | string;
    pageSize?: number;
  }>(`/sortir-reject-v2?${query.toString()}`, t);
  await expectOk(res.status, res.data, "Gagal memuat data sortir reject");

  const rows = Array.isArray(res.data.data) ? res.data.data : [];
  const total = asInt(res.data.total);
  const size = asInt(res.data.pageSize, pageSize) || pageSize;
  return {
    items: rows.map(parseSrTransaction),
    total,
    page,
    pageSize: size,
    totalPages: size > 0 ? Math.max(1, Math.ceil(total / size)) : 1,
  };
}

export async function fetchSrLabelInfo(
  token: string | undefined,
  labelCode: string,
): Promise<SrLabelInfo> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>(`/sortir-reject-v2/label/${encodeURIComponent(labelCode)}`, t);
  await expectOk(res.status, res.data, "Gagal memuat info label");
  if (!res.data.data) throw new ApiRequestError("Response tidak mengandung data label");
  return parseSrLabelInfo(res.data.data);
}

export async function fetchSrDetail(
  token: string | undefined,
  noSortir: string,
): Promise<SrTransaction> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>(`/sortir-reject-v2/${encodeURIComponent(noSortir)}`, t);
  await expectOk(res.status, res.data, "Gagal memuat detail sortir reject");
  if (!res.data.data) throw new ApiRequestError("Response tidak mengandung data transaksi");
  return parseSrTransaction(res.data.data);
}

export async function fetchSrMasters(token: string | undefined): Promise<SrMasters> {
  const t = requireToken(token);
  const [warehouseRes, bjRes, rejectRes] = await Promise.all([
    apiFetchAuth<{ success?: boolean; message?: string; data?: unknown }>(
      "/mst/warehouse",
      t,
    ),
    apiFetchAuth<{ success?: boolean; message?: string; data?: unknown }>(
      "/mst-barang-jadi",
      t,
    ),
    apiFetchAuth<{ success?: boolean; message?: string; data?: unknown }>(
      "/reject-type",
      t,
    ),
  ]);
  await expectOk(warehouseRes.status, warehouseRes.data, "Gagal memuat warehouse");
  await expectOk(bjRes.status, bjRes.data, "Gagal memuat jenis barang jadi");
  await expectOk(rejectRes.status, rejectRes.data, "Gagal memuat jenis reject");

  const rows = (r: { data?: unknown }) =>
    Array.isArray(r.data) ? (r.data as Record<string, unknown>[]) : [];

  return {
    warehouses: rows(warehouseRes).map((w) => ({
      idWarehouse: asInt(w["IdWarehouse"] ?? w["idWarehouse"]),
      namaWarehouse: asStr(w["NamaWarehouse"] ?? w["namaWarehouse"]),
    })),
    barangJadi: rows(bjRes).map((p) => ({
      id: asInt(p["idJenis"] ?? p["IdBJ"] ?? p["IdJenis"]),
      nama: asStr(p["namaJenis"] ?? p["NamaBJ"] ?? p["NamaJenis"]),
    })),
    rejectTypes: rows(rejectRes).map((p) => ({
      id: asInt(p["IdReject"] ?? p["idReject"]),
      nama: asStr(p["NamaReject"] ?? p["namaReject"]),
    })),
  };
}

export async function createSr(
  token: string | undefined,
  payload: SrCreatePayload,
): Promise<string> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>("/sortir-reject-v2", t, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  await expectOk(res.status, res.data, "Gagal membuat sortir reject");
  const noSortir = firstNonEmpty(res.data.data?.["noBJSortir"], res.data.data?.["NoBJSortir"]);
  if (!noSortir) throw new ApiRequestError("Response tidak mengandung nomor sortir");
  return noSortir;
}

export async function updateSr(
  token: string | undefined,
  payload: {
    noSortir: string;
    idWarehouse: number;
    tglBJSortir: string;
  },
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ success?: boolean; message?: string }>(
    `/sortir-reject-v2/${encodeURIComponent(payload.noSortir)}`,
    t,
    {
      method: "PUT",
      body: JSON.stringify({
        idWarehouse: payload.idWarehouse,
        tglBJSortir: payload.tglBJSortir,
      }),
    },
  );
  await expectOk(res.status, res.data, "Gagal memperbarui sortir reject");
}

export async function deleteSr(
  token: string | undefined,
  noSortir: string,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ success?: boolean; message?: string }>(
    `/sortir-reject-v2/${encodeURIComponent(noSortir)}`,
    t,
    { method: "DELETE" },
  );
  await expectOk(res.status, res.data, "Gagal menghapus sortir reject");
}

export function srPrintTargetOf(out: {
  noBJ?: string | null;
}): SrPrintTarget | null {
  const noBJ = (out.noBJ ?? "").trim();
  if (noBJ.startsWith("BA")) return { kind: "packing", noLabel: noBJ };
  if (noBJ.startsWith("BF")) return { kind: "reject", noLabel: noBJ };
  return null;
}

export function srCanPrint(out: { noBJ?: string | null }): boolean {
  return srPrintTargetOf(out) !== null;
}

export async function acquireSrPrintLock(
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

export async function releaseSrPrintLock(
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

export async function fetchSrLabelPdfBase64(
  token: string | undefined,
  target: SrPrintTarget,
): Promise<string> {
  const t = requireToken(token);
  const base = getBackendBaseUrl();
  const path = `/api/labels/${target.kind}/${encodeURIComponent(target.noLabel)}/pdf`;
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

export async function markSrLabelPrinted(
  token: string | undefined,
  target: SrPrintTarget,
): Promise<number | null> {
  const t = requireToken(token);
  const path = `/labels/${target.kind}/${encodeURIComponent(target.noLabel)}/print`;
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>(path, t, { method: "PATCH" });
  if (res.status !== 200 && res.status !== 204) {
    throw new ApiRequestError(res.data.message ?? `Gagal update cetak (${res.status})`);
  }
  const count = Number(
    res.data.data?.["HasBeenPrinted"] ?? res.data.data?.["hasBeenPrinted"] ?? 0,
  );
  return Number.isFinite(count) ? count : null;
}
