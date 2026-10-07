import { getBackendBaseUrl, apiFetchAuth, ApiRequestError } from "@/services/api";

export type BsCategory =
  | "bahanBaku"
  | "washing"
  | "broker"
  | "crusher"
  | "gilingan"
  | "furnitureWip"
  | "barangJadi"
  | "bonggolan"
  | "mixer";

const CATEGORY_LABELS: Record<string, string> = {
  washing: "Washing",
  broker: "Broker",
  crusher: "Crusher",
  gilingan: "Gilingan",
  mixer: "Mixer",
  furnitureWip: "Furniture WIP",
  barangJadi: "Barang Jadi",
  bahanBaku: "Bahan Baku",
  bonggolan: "Bonggolan",
};

const CATEGORY_CODES: Record<string, string> = {
  washing: "B.",
  broker: "D.",
  crusher: "F.",
  gilingan: "V.",
  mixer: "H.",
  furnitureWip: "BB.",
  barangJadi: "BA.",
  bahanBaku: "A.",
  bonggolan: "M.",
};

export function bsCategoryLabel(
  category: string | null | undefined,
  unknownLabel = "Unknown",
): string {
  if (!category) return "-";
  return CATEGORY_LABELS[category] ?? unknownLabel;
}

export function bsCategoryLabelWithCode(
  category: string | null | undefined,
): string {
  if (!category) return "-";
  const label = CATEGORY_LABELS[category] ?? "Bonggolan";
  const code = CATEGORY_CODES[category] ?? CATEGORY_CODES["bonggolan"];
  return `${label} (${code})`;
}

export function bsIsPcsCategory(category: string | null | undefined): boolean {
  return category === "furnitureWip" || category === "barangJadi";
}

const BS_PARTIAL_CATEGORIES = new Set(["mixer", "furnitureWip", "barangJadi"]);

export function bsSupportsPartialInput(
  category: string | null | undefined,
): boolean {
  return category != null && BS_PARTIAL_CATEGORIES.has(category);
}

export function bsPartialUnit(category: string | null | undefined): "pcs" | "kg" {
  return category === "mixer" ? "kg" : "pcs";
}

export function bsHasSaks(category: string | null | undefined): boolean {
  return (
    category === "washing" ||
    category === "broker" ||
    category === "mixer" ||
    category === "bahanBaku"
  );
}

export type BsSak = {
  noSak: number;
  berat: number;
  isPartial: boolean;
};

export type BsLabelInfo = {
  labelCode: string;
  category: string;
  idJenis: number;
  namaJenis: string;
  totalBerat: number;
  jumlahSak: number;
  saks: BsSak[];
  noBahanBaku: string | null;
  noPallet: string | null;
  isPartial: boolean;
};

export type BsOutputLabel = {
  labelCode: string | null;
  noBahanBaku: string | null;
  noPallet: string | null;
  idJenis: number;
  namaJenis: string;
  totalBerat: number;
  category: string;
  jumlahSak: number;
  saks: BsSak[];
  berat: number | null;
  printCount: number;
};

export type BsListRow = {
  noBongkarSusun: string;
  tanggal: string;
  username: string | null;
  note: string | null;
  category: string | null;
  inputLabelCount: number;
  outputLabelCount: number;
  balance: boolean | null;
};

export type BsDetail = {
  noBongkarSusun: string;
  tanggal: string;
  username: string | null;
  note: string | null;
  category: string | null;
  inputs: BsLabelInfo[];
  outputs: BsOutputLabel[];
};

export type BsOutputPayload = Record<string, unknown>;

/** Input partial kategori pcs/kg (furniture WIP / barang jadi / mixer): label + qty terpakai (pcs atau kg). */
export type BsInputPartialPayload = { labelCode: string; qty: number };

export type BsCreatePayload = {
  note: string;
  inputs: string[];
  inputsPartial?: BsInputPartialPayload[];
  outputs: BsOutputPayload[];
};

export type FetchBsListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
};

export type FetchBsListResult = {
  items: BsListRow[];
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

async function expectOk(
  status: number,
  data: { success?: boolean; message?: string } | null,
  fallback: string,
): Promise<void> {
  if (status >= 200 && status < 300 && (!data || data.success !== false)) {
    return;
  }
  throw new ApiRequestError(data?.message?.trim() || fallback);
}

function parseSak(raw: unknown): BsSak {
  const r = (raw ?? {}) as Record<string, unknown>;
  const partial = r["isPartial"] ?? r["IsPartial"];
  return {
    noSak: asInt(r["noSak"] ?? r["NoSak"]),
    berat: asFloat(r["berat"] ?? r["Berat"] ?? r["BeratAct"]),
    isPartial: partial === true || partial === 1,
  };
}

function firstNonEmpty(...values: unknown[]): string | null {
  for (const v of values) {
    const s = asStr(v).trim();
    if (s) return s;
  }
  return null;
}

/**
 * Parse satu label input — meniru parsing BsV2LabelInfo.fromJson di tablet:
 * bahan Baku memakai `details` (NoSak/BeratAct) + beratSisa/sakSisa, kategori
 * pcs (furnitureWip/barangJadi) memakai `pcs`, gilingan memakai `idGilingan`.
 */
export function parseBsLabelInfo(raw: unknown): BsLabelInfo {
  const j = (raw ?? {}) as Record<string, unknown>;
  const category = asStr(j["category"]);
  const detailsRaw = Array.isArray(j["details"]) ? j["details"] : [];
  const saksRaw = Array.isArray(j["saks"]) ? j["saks"] : [];
  const source =
    category === "bahanBaku" && detailsRaw.length > 0 ? detailsRaw : saksRaw;
  const saks = source.map(parseSak);

  let totalBerat: number;
  if (bsIsPcsCategory(category)) {
    totalBerat = asFloat(j["pcs"] ?? j["totalPcs"]);
  } else if (category === "bahanBaku") {
    totalBerat = asFloat(
      firstNonEmpty(j["beratSisa"], j["totalBerat"], j["berat"]) ?? 0,
      0,
    );
    if (saks.length > 0) totalBerat = saks.reduce((s, x) => s + x.berat, 0);
  } else if (saks.length > 0) {
    totalBerat = saks.reduce((s, x) => s + x.berat, 0);
  } else {
    totalBerat = asFloat(j["totalBerat"] ?? j["berat"]);
  }

  let noBahanBaku: string | null = null;
  let noPallet: string | null = null;
  if (category === "bahanBaku") {
    noPallet = firstNonEmpty(j["noPallet"], j["NoPallet"]);
    const labelCode = asStr(j["labelCode"]);
    noBahanBaku = firstNonEmpty(j["noBahanBaku"], j["NoBahanBaku"]);
    if (!noBahanBaku && labelCode.includes("-")) {
      noBahanBaku = labelCode.slice(0, labelCode.lastIndexOf("-"));
    }
  }

  const jumlahSak =
    category === "bahanBaku"
      ? asInt(j["sakSisa"] ?? j["jumlahSak"], saks.length)
      : asInt(j["jumlahSak"], saks.length);

  return {
    labelCode: asStr(j["labelCode"]),
    category,
    idJenis:
      category === "gilingan"
        ? asInt(j["idGilingan"] ?? j["idJenis"])
        : asInt(j["idJenis"]),
    namaJenis: asStr(j["namaJenis"]),
    totalBerat,
    jumlahSak,
    saks,
    noBahanBaku,
    noPallet,
    isPartial:
      j["isPartial"] === true || j["isPartial"] === 1 || saks.some((s) => s.isPartial),
  };
}

/** Parse satu label output detail — meniru BsV2OutputLabel.fromJson. */
export function parseBsOutputLabel(raw: unknown): BsOutputLabel {
  const j = (raw ?? {}) as Record<string, unknown>;
  const category = asStr(j["category"]);
  const saksRaw = Array.isArray(j["saks"]) ? j["saks"] : [];
  const saks = saksRaw.map(parseSak);
  const rawNoPallet = j["noPallet"] ?? j["NoPallet"];
  const rawNoBahanBaku = j["noBahanBaku"] ?? j["NoBahanBaku"];
  const noPallet = rawNoPallet == null ? null : asStr(rawNoPallet);
  const noBahanBaku =
    rawNoBahanBaku == null
      ? noPallet && noPallet.includes("-")
        ? noPallet.slice(0, noPallet.lastIndexOf("-"))
        : null
      : asStr(rawNoBahanBaku);

  const labelCode = firstNonEmpty(
    j["labelCode"],
    rawNoPallet,
    j["noWashing"],
    j["noBonggolan"],
    j["noBroker"],
    j["noCrusher"],
    j["noGilingan"],
    j["noMixer"],
    j["noFurnitureWIP"],
    j["noBJ"],
    rawNoBahanBaku,
  );

  const isPcs = bsIsPcsCategory(category);
  const totalBerat = isPcs
    ? asFloat(j["pcs"] ?? j["totalPcs"])
    : saks.length > 0
      ? saks.reduce((s, x) => s + x.berat, 0)
      : asFloat(j["totalBerat"] ?? j["berat"]);

  return {
    labelCode,
    noBahanBaku: category === "bahanBaku" ? noBahanBaku : null,
    noPallet: category === "bahanBaku" ? noPallet : null,
    idJenis:
      category === "gilingan"
        ? asInt(j["idGilingan"] ?? j["idJenis"])
        : asInt(j["idJenis"]),
    namaJenis: asStr(j["namaJenis"]),
    totalBerat,
    category,
    jumlahSak: asInt(j["jumlahSak"], saks.length),
    saks,
    berat: j["berat"] == null ? null : asFloat(j["berat"]),
    printCount: asInt(j["printCount"] ?? j["hasBeenPrinted"] ?? j["HasBeenPrinted"]),
  };
}

export async function fetchBsList(
  token: string | undefined,
  params: FetchBsListParams = {},
): Promise<FetchBsListResult> {
  const t = requireToken(token);
  const page = Math.max(params.page ?? 1, 1);
  const pageSize = Math.min(Math.max(params.pageSize ?? 20, 1), 100);
  const qs = new URLSearchParams();
  qs.set("page", String(page));
  qs.set("pageSize", String(pageSize));
  const search = (params.search ?? "").trim();
  if (search) qs.set("search", search);

  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: Record<string, unknown>[];
    total?: number;
    page?: number;
    pageSize?: number;
  }>(`/bongkar-susun-v2?${qs.toString()}`, t);
  await expectOk(res.status, res.data, "Gagal memuat data bongkar susun");

  const rows = Array.isArray(res.data.data) ? res.data.data : [];
  const items: BsListRow[] = rows.map((raw) => {
    const inputs = Array.isArray(raw["inputs"]) ? raw["inputs"] : [];
    const firstInput =
      inputs.length > 0 && typeof inputs[0] === "object"
        ? (inputs[0] as Record<string, unknown>)
        : null;
    const rawCategory = asStr(raw["category"] ?? raw["Category"]);
    const category =
      rawCategory || (firstInput ? asStr(firstInput["category"]) : "");
    return {
      noBongkarSusun: asStr(raw["NoBongkarSusun"] ?? raw["noBongkarSusun"]),
      tanggal: asStr(raw["Tanggal"] ?? raw["tanggal"]),
      username: firstNonEmpty(raw["Username"], raw["username"]),
      note: firstNonEmpty(raw["Note"], raw["note"]),
      category: category ? category : null,
      inputLabelCount: asInt(raw["inputLabelCount"]),
      outputLabelCount: asInt(raw["outputLabelCount"]),
      balance:
        raw["balance"] == null
          ? null
          : typeof raw["balance"] === "boolean"
            ? raw["balance"]
            : asStr(raw["balance"]).toLowerCase() === "true",
    };
  });

  const total = asInt(res.data.total);
  const size = asInt(res.data.pageSize, pageSize) || pageSize;
  const totalPages = size > 0 ? Math.max(Math.ceil(total / size), 1) : 1;
  return { items, total, page, pageSize: size, totalPages };
}

export async function fetchBsLabelInfo(
  token: string | undefined,
  labelCode: string,
): Promise<BsLabelInfo> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>(`/bongkar-susun-v2/label/${encodeURIComponent(labelCode)}`, t);
  await expectOk(res.status, res.data, "Gagal memuat info label");
  if (!res.data.data) {
    throw new ApiRequestError("Response tidak mengandung data label");
  }
  return parseBsLabelInfo(res.data.data);
}

/**
 * Kategori pcs (mis. barang jadi) bisa punya baris di tabel input penuh DAN
 * input partial untuk label yang sama. Total pcs untuk cek balance =
 * input + input partial, jadi baris dengan labelCode sama dijumlahkan.
 */
function mergeBsInputsByLabel(inputs: BsLabelInfo[]): BsLabelInfo[] {
  const merged = new Map<string, BsLabelInfo>();
  const result: BsLabelInfo[] = [];
  for (const inp of inputs) {
    const prev =
      bsIsPcsCategory(inp.category) && inp.labelCode
        ? merged.get(inp.labelCode)
        : undefined;
    if (prev) {
      prev.totalBerat += inp.totalBerat;
      prev.isPartial = prev.isPartial || inp.isPartial;
      continue;
    }
    const copy = { ...inp };
    if (bsIsPcsCategory(inp.category) && inp.labelCode) {
      merged.set(inp.labelCode, copy);
    }
    result.push(copy);
  }
  return result;
}

export async function fetchBsDetail(
  token: string | undefined,
  noBongkarSusun: string,
): Promise<BsDetail> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>(`/bongkar-susun-v2/${encodeURIComponent(noBongkarSusun)}`, t);
  await expectOk(res.status, res.data, "Gagal memuat detail bongkar susun");

  const data = res.data.data;
  if (!data) throw new ApiRequestError("Response tidak mengandung data transaksi");
  const header = (data["header"] ?? {}) as Record<string, unknown>;
  const inputs = mergeBsInputsByLabel(
    (Array.isArray(data["inputs"]) ? data["inputs"] : []).map(parseBsLabelInfo),
  );
  const outputs = (Array.isArray(data["outputs"]) ? data["outputs"] : []).map(
    parseBsOutputLabel,
  );
  const rawCategory = asStr(header["category"] ?? header["Category"]);
  const category =
    rawCategory || (inputs.length > 0 ? inputs[0].category : "");

  return {
    noBongkarSusun: asStr(
      header["NoBongkarSusun"] ?? header["noBongkarSusun"] ?? data["noBongkarSusun"],
    ),
    tanggal: asStr(header["Tanggal"] ?? header["tanggal"] ?? data["tanggal"]),
    username: firstNonEmpty(header["Username"], header["username"]),
    note: firstNonEmpty(header["Note"], header["note"]),
    category: category ? category : null,
    inputs,
    outputs,
  };
}

export async function createBs(
  token: string | undefined,
  payload: BsCreatePayload,
): Promise<string> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>("/bongkar-susun-v2", t, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  await expectOk(res.status, res.data, "Gagal menyimpan bongkar susun");
  const noBongkarSusun = asStr(res.data.data?.["noBongkarSusun"]);
  if (!noBongkarSusun) {
    throw new ApiRequestError("Nomor bongkar susun tidak diterima dari server");
  }
  return noBongkarSusun;
}

export async function deleteBs(
  token: string | undefined,
  noBongkarSusun: string,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ success?: boolean; message?: string }>(
    `/bongkar-susun-v2/${encodeURIComponent(noBongkarSusun)}`,
    t,
    { method: "DELETE" },
  );
  await expectOk(res.status, res.data, "Gagal menghapus bongkar susun");
}

export type BsPrintTarget = {
  /** prefix path label pada /api/labels/... */
  path: string;
  /** kode label untuk lock cetak */
  lockCode: string;
  labelCode: string;
};

function deriveNoBahanBaku(noPallet: string): string {
  if (noPallet.includes("-")) return noPallet.slice(0, noPallet.lastIndexOf("-"));
  return noPallet;
}

/**
 * Susun target cetak untuk satu label output. Mengikuti tablet: prefix kode
 * menentukan modul label (A. bahan baku, B. washing, BA. packing, BB. furniture
 * WIP, D. broker, F. crusher, H. mixer, M. bonggolan, V. gilingan).
 */
export function bsPrintTargetOf(out: BsOutputLabel): BsPrintTarget | null {
  const code = (out.labelCode ?? "").trim();
  if (!code) return null;
  // Prefix yang bisa dicetak — sama dengan _canPrintCode di tablet.
  const printable =
    code.startsWith("A") ||
    code.startsWith("B") ||
    code.startsWith("D") ||
    code.startsWith("F") ||
    code.startsWith("H") ||
    code.startsWith("M") ||
    code.startsWith("V");
  if (!printable) return null;

  const isBahanBaku = code.startsWith("A");
  const isPacking = code.startsWith("BA");
  const isFurnitureWip = code.startsWith("BB");
  const isBroker = code.startsWith("D");
  const isCrusher = code.startsWith("F");
  const isMixer = code.startsWith("H");
  const isBonggolan = code.startsWith("M");
  const isGilingan = code.startsWith("V");

  if (isBahanBaku) {
    const noPallet =
      out.noPallet && out.noPallet.trim() ? out.noPallet.trim() : code;
    const noBahanBaku =
      out.noBahanBaku && out.noBahanBaku.trim()
        ? out.noBahanBaku.trim()
        : deriveNoBahanBaku(noPallet);
    return {
      path: `bahan-baku/${encodeURIComponent(noBahanBaku)}/pallet/${encodeURIComponent(noPallet)}`,
      lockCode: noPallet,
      labelCode: code,
    };
  }

  const path = isPacking
    ? `packing/${encodeURIComponent(code)}`
    : isFurnitureWip
      ? `furniture-wip/${encodeURIComponent(code)}`
      : isBroker
        ? `broker/${encodeURIComponent(code)}`
        : isCrusher
          ? `crusher/${encodeURIComponent(code)}`
          : isMixer
            ? `mixer/${encodeURIComponent(code)}`
            : isBonggolan
              ? `bonggolan/${encodeURIComponent(code)}`
              : isGilingan
                ? `gilingan/${encodeURIComponent(code)}`
                : `washing/${encodeURIComponent(code)}`;

  return { path, lockCode: code, labelCode: code };
}

export function bsCanPrint(out: BsOutputLabel): boolean {
  return bsPrintTargetOf(out) !== null;
}

export async function acquireBsPrintLock(
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

export async function releaseBsPrintLock(
  token: string | undefined,
  noLabel: string,
): Promise<void> {
  const t = requireToken(token);
  try {
    await apiFetchAuth(`/labels/${encodeURIComponent(noLabel)}/print-lock`, t, {
      method: "DELETE",
    });
  } catch {
    // release best-effort
  }
}

export async function fetchBsLabelPdfBase64(
  token: string | undefined,
  target: BsPrintTarget,
): Promise<string> {
  const t = requireToken(token);
  const base = getBackendBaseUrl();
  let response: Response;
  try {
    response = await fetch(`${base}/api/labels/${target.path}/pdf`, {
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

export async function markBsLabelPrinted(
  token: string | undefined,
  target: BsPrintTarget,
): Promise<number | null> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>(`/labels/${target.path}/print`, t, { method: "PATCH" });
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
