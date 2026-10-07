import { apiFetchAuth, ApiRequestError } from "@/services/api";

// ── Types ────────────────────────────────────────────────────────────────────

export type BagianOption = {
  idBagianMesin: number;
  namaBagianMesin: string;
};

export type OperatorRow = {
  idOperator: number;
  namaOperator: string;
  enable: boolean;
  idBagian: number;
  namaBagianMesin: string;
  status: string;
};

export type ReguRow = {
  idRegu: number;
  idBagian: number;
  namaRegu: string;
  namaBagianMesin: string;
  jumlahOperator: number;
};

export type ReguMember = {
  idOperator: number;
  namaOperator: string;
  enable: boolean;
};

export type ReguDetail = ReguRow & { operators: ReguMember[] };

export type OperatorInput = {
  namaOperator: string;
  idBagian: number;
  enable: boolean;
};

export type ReguInput = {
  namaRegu: string;
  idBagian: number;
  operatorIds: number[];
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function requireToken(token: string | undefined): string {
  if (!token) throw new ApiRequestError("Tidak terautentikasi");
  return token;
}

function asInt(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
}

function asStr(v: unknown): string {
  return v == null ? "" : String(v);
}

function asBool(v: unknown, fallback = false): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true" || s === "1") return true;
    if (s === "false" || s === "0") return false;
  }
  return fallback;
}

function errMsg(
  data: { message?: string } | null,
  fallback: string,
): string {
  const m = data?.message?.trim();
  if (m && m !== "Internal Server Error") return m;
  return fallback;
}

async function expectOk(
  status: number,
  data: { success?: boolean; message?: string } | null,
  fallback: string,
): Promise<void> {
  if ([200, 201].includes(status) && (!data || data.success !== false)) return;
  throw new ApiRequestError(errMsg(data, fallback));
}

function rowsOf(res: { data: unknown }): Record<string, unknown>[] {
  const d = res.data as { data?: unknown } | null | undefined;
  return Array.isArray(d?.data) ? (d.data as Record<string, unknown>[]) : [];
}

// ── Parsers ──────────────────────────────────────────────────────────────────

function parseBagian(raw: Record<string, unknown>): BagianOption {
  return {
    idBagianMesin: asInt(raw["IdBagianMesin"] ?? raw["idBagianMesin"]),
    namaBagianMesin: asStr(raw["NamaBagianMesin"] ?? raw["namaBagianMesin"]),
  };
}

function parseOperator(raw: Record<string, unknown>): OperatorRow {
  const enable = asBool(raw["Enable"] ?? raw["enable"], false);
  return {
    idOperator: asInt(raw["IdOperator"] ?? raw["idOperator"]),
    namaOperator: asStr(raw["NamaOperator"] ?? raw["namaOperator"]),
    enable,
    idBagian: asInt(raw["IdBagian"] ?? raw["idBagian"]),
    namaBagianMesin: asStr(
      raw["NamaBagianMesin"] ?? raw["namaBagianMesin"],
    ),
    status: asStr(raw["Status"] ?? raw["status"]) ||
      (enable ? "AKTIF" : "TIDAK AKTIF"),
  };
}

function parseRegu(raw: Record<string, unknown>): ReguRow {
  return {
    idRegu: asInt(raw["IdRegu"] ?? raw["idRegu"]),
    idBagian: asInt(raw["IdBagian"] ?? raw["idBagian"]),
    namaRegu: asStr(raw["NamaRegu"] ?? raw["namaRegu"]),
    namaBagianMesin: asStr(raw["NamaBagianMesin"] ?? raw["namaBagianMesin"]),
    jumlahOperator: asInt(raw["JumlahOperator"] ?? raw["jumlahOperator"]),
  };
}

function parseMember(raw: Record<string, unknown>): ReguMember {
  return {
    idOperator: asInt(raw["IdOperator"] ?? raw["idOperator"]),
    namaOperator: asStr(raw["NamaOperator"] ?? raw["namaOperator"]),
    enable: asBool(raw["Enable"] ?? raw["enable"], true),
  };
}

// ── Master data (list) ───────────────────────────────────────────────────────

export async function fetchOperatorMasterList(
  token: string | undefined,
  q = "",
): Promise<OperatorRow[]> {
  const t = requireToken(token);
  const qs = q.trim() ? `?all=1&q=${encodeURIComponent(q.trim())}` : "?all=1";
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: Record<string, unknown>[];
  }>(`/mst-operator${qs}`, t);
  await expectOk(res.status, res.data, "Gagal memuat data operator");
  return rowsOf(res).map(parseOperator);
}

export async function fetchBagianList(
  token: string | undefined,
): Promise<BagianOption[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: Record<string, unknown>[];
  }>("/mst-operator/bagian", t);
  await expectOk(res.status, res.data, "Gagal memuat data bagian");
  return rowsOf(res).map(parseBagian);
}

export async function fetchReguMasterList(
  token: string | undefined,
  q = "",
): Promise<ReguRow[]> {
  const t = requireToken(token);
  const params = new URLSearchParams({ orderBy: "IdRegu", orderDir: "ASC" });
  if (q.trim()) params.set("q", q.trim());
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: Record<string, unknown>[];
  }>(`/mst/regu?${params.toString()}`, t);
  await expectOk(res.status, res.data, "Gagal memuat data regu");
  return rowsOf(res).map(parseRegu);
}

export async function fetchReguDetail(
  token: string | undefined,
  idRegu: number,
): Promise<ReguDetail> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>(`/mst/regu/${idRegu}`, t);
  await expectOk(res.status, res.data, "Gagal memuat detail regu");
  const d = (res.data?.data ?? null) as Record<string, unknown> | null;
  if (!d) throw new ApiRequestError("Regu tidak ditemukan");
  const members = Array.isArray(d["operators"])
    ? (d["operators"] as Record<string, unknown>[])
    : [];
  return { ...parseRegu(d), operators: members.map(parseMember) };
}

// ── Operator CRUD ────────────────────────────────────────────────────────────

export async function createOperator(
  token: string | undefined,
  input: OperatorInput,
): Promise<OperatorRow> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>("/mst-operator", t, {
    method: "POST",
    body: JSON.stringify(input),
  });
  await expectOk(res.status, res.data, "Gagal menyimpan operator");
  const d = res.data?.data;
  if (!d) throw new ApiRequestError("Data operator tidak diterima");
  return parseOperator(d);
}

export async function updateOperator(
  token: string | undefined,
  idOperator: number,
  input: OperatorInput,
): Promise<OperatorRow> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>(`/mst-operator/${idOperator}`, t, {
    method: "PUT",
    body: JSON.stringify(input),
  });
  await expectOk(res.status, res.data, "Gagal mengubah operator");
  const d = res.data?.data;
  if (!d) throw new ApiRequestError("Data operator tidak diterima");
  return parseOperator(d);
}

export async function deleteOperator(
  token: string | undefined,
  idOperator: number,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
  }>(`/mst-operator/${idOperator}`, t, { method: "DELETE" });
  await expectOk(res.status, res.data, "Gagal menghapus operator");
}

// ── Regu CRUD ────────────────────────────────────────────────────────────────

export async function createRegu(
  token: string | undefined,
  input: ReguInput,
): Promise<ReguDetail> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>("/mst/regu", t, {
    method: "POST",
    body: JSON.stringify(input),
  });
  await expectOk(res.status, res.data, "Gagal menyimpan regu");
  const d = res.data?.data;
  if (!d) throw new ApiRequestError("Data regu tidak diterima");
  return fetchReguDetail(t, asInt(d["IdRegu"] ?? d["idRegu"]));
}

export async function updateRegu(
  token: string | undefined,
  idRegu: number,
  input: ReguInput,
): Promise<ReguDetail> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>(`/mst/regu/${idRegu}`, t, {
    method: "PUT",
    body: JSON.stringify(input),
  });
  await expectOk(res.status, res.data, "Gagal mengubah regu");
  const d = res.data?.data;
  if (!d) throw new ApiRequestError("Data regu tidak diterima");
  return fetchReguDetail(t, idRegu);
}

export async function deleteRegu(
  token: string | undefined,
  idRegu: number,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
  }>(`/mst/regu/${idRegu}`, t, { method: "DELETE" });
  await expectOk(res.status, res.data, "Gagal menghapus regu");
}
