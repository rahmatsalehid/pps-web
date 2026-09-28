import { apiFetchAuth, ApiRequestError } from "@/services/api";

export type TradeInReject = {
  noReject: string;
  idReject: number;
  namaReject: string;
  berat: number;
};

export type TradeInRow = {
  noPenerimaan: string;
  tanggal: string;
  supplier: string;
  salesPersonCode: string;
  salesPersonName: string;
  reject: TradeInReject | null;
};

export type TradeInSalesPerson = {
  code: string;
  name: string;
};

export type TradeInRejectType = {
  idReject: number;
  namaReject: string;
};

export type FetchTradeInListParams = {
  page?: number;
  pageSize?: number;
  filter?: string;
};

export type FetchTradeInListResult = {
  items: TradeInRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type TradeInCreateInput = {
  supplier: string;
  salesPersonCode: string;
  jenis: string;
  tanggal: string;
  createBy: string;
  idReject: number;
  berat: string;
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
  if (status >= 200 && status < 300 && (!data || data.success !== false)) return;
  throw new ApiRequestError(errMsg(data, fallback));
}

function parseReject(raw: unknown): TradeInReject | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const noReject = asStr(r["NoReject"] ?? r["noReject"]).trim();
  if (!noReject && r["IdReject"] == null && r["idReject"] == null) return null;
  return {
    noReject,
    idReject: asInt(r["IdReject"] ?? r["idReject"]),
    namaReject: asStr(r["NamaReject"] ?? r["namaReject"]),
    berat: asFloat(r["Berat"] ?? r["berat"]),
  };
}

export async function fetchTradeInList(
  token: string | undefined,
  params: FetchTradeInListParams = {},
): Promise<FetchTradeInListResult> {
  const t = requireToken(token);
  const page = Math.max(params.page ?? 1, 1);
  const pageSize = Math.min(Math.max(params.pageSize ?? 20, 1), 100);
  const qs = new URLSearchParams();
  qs.set("page", String(page));
  qs.set("pageSize", String(pageSize));
  const filter = (params.filter ?? "").trim();
  if (filter) qs.set("filter", filter);

  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    totalData?: number;
    data?: Record<string, unknown>[];
    meta?: { totalPages?: number; page?: number; pageSize?: number };
  }>(`/trade-in?${qs.toString()}`, t);
  await expectOk(res.status, res.data, "Gagal memuat data trade-in");

  const rows = Array.isArray(res.data.data) ? res.data.data : [];
  const items: TradeInRow[] = rows.map((raw) => ({
    noPenerimaan: asStr(raw["NoPenerimaan"] ?? raw["noPenerimaan"]),
    tanggal: asStr(raw["Tanggal"] ?? raw["tanggal"]),
    supplier: asStr(raw["Supplier"] ?? raw["supplier"]),
    salesPersonCode: asStr(raw["SalesPersonCode"] ?? raw["salesPersonCode"]),
    salesPersonName: asStr(raw["SalesPersonName"] ?? raw["salesPersonName"]),
    reject: parseReject(raw["reject"]),
  }));

  const total = asInt(res.data.totalData);
  const totalPages = Math.max(asInt(res.data.meta?.totalPages, 1), 1);
  return { items, total, page, pageSize, totalPages };
}

export async function fetchTradeInNextNo(
  token: string | undefined,
): Promise<string> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: { noPenerimaan?: string };
  }>("/trade-in/next-no", t);
  await expectOk(res.status, res.data, "Gagal memuat nomor penerimaan");
  return asStr(res.data.data?.noPenerimaan);
}

export async function fetchTradeInSalesPersons(
  token: string | undefined,
): Promise<TradeInSalesPerson[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: Record<string, unknown>[];
  }>("/trade-in/master/salesperson", t);
  await expectOk(res.status, res.data, "Gagal memuat data sales person");
  const rows = Array.isArray(res.data.data) ? res.data.data : [];
  return rows.map((r) => ({
    code: asStr(r["SalesPersonCode"] ?? r["salesPersonCode"]),
    name: asStr(r["SalesPersonName"] ?? r["salesPersonName"]),
  }));
}

export async function fetchTradeInRejectTypes(
  token: string | undefined,
): Promise<TradeInRejectType[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: Record<string, unknown>[];
  }>("/trade-in/master/reject-types", t);
  await expectOk(res.status, res.data, "Gagal memuat jenis reject");
  const rows = Array.isArray(res.data.data) ? res.data.data : [];
  return rows.map((r) => ({
    idReject: asInt(r["IdReject"] ?? r["idReject"]),
    namaReject: asStr(r["NamaReject"] ?? r["namaReject"]),
  }));
}

export async function createTradeIn(
  token: string | undefined,
  input: TradeInCreateInput,
): Promise<string> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: { noPenerimaan?: string };
  }>("/trade-in", t, {
    method: "POST",
    body: JSON.stringify({
      supplier: input.supplier,
      salesPersonCode: input.salesPersonCode,
      jenis: input.jenis,
      tanggal: input.tanggal,
      createBy: input.createBy,
      reject: { idReject: input.idReject, berat: input.berat, noReject: "" },
    }),
  });
  await expectOk(res.status, res.data, "Gagal menyimpan penerimaan");
  const noPenerimaan = asStr(res.data.data?.noPenerimaan);
  if (!noPenerimaan) {
    throw new ApiRequestError("Nomor penerimaan tidak diterima dari server");
  }
  return noPenerimaan;
}

export async function deleteTradeIn(
  token: string | undefined,
  noPenerimaan: string,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ success?: boolean; message?: string }>(
    `/trade-in/${encodeURIComponent(noPenerimaan)}`,
    t,
    { method: "DELETE" },
  );
  await expectOk(res.status, res.data, "Gagal menghapus penerimaan");
}
