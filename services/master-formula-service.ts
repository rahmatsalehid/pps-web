import { apiFetchAuth, ApiRequestError } from "@/services/api";

export type KategoriOption = {
  idKategori: number;
  kodeKategori: string;
  namaKategori: string;
  enable: boolean;
  isWaste: boolean;
};

export type MasterItem = {
  id: number;
  nama: string;
};

export type FormulaRow = {
  idFormula: number;
  mainKategoriId: number;
  mainKategori: string;
  mainOutputId: number;
  mainOutputNama: string;
  jumlahInput: number;
  jumlahSecondary: number;
};

export type FormulaLine = {
  kategoriId: number;
  kategoriNama: string;
  itemId: number;
  itemNama: string;
};

export type FormulaDetail = {
  idFormula: number;
  mainKategoriId: number;
  mainKategori: string;
  mainOutputId: number;
  mainOutputNama: string;
  inputs: FormulaLine[];
  secondarys: FormulaLine[];
};

export type FormulaLineInput = {
  kategoriId: number;
  itemId: number;
};

export type FormulaInput = {
  idFormula?: number;
  mainKategoriId: number;
  mainOutputId: number;
  inputs: FormulaLineInput[];
  secondarys: FormulaLineInput[];
};

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

function asBool(v: unknown): boolean {
  return v === true || v === 1 || v === "1" || v === "true";
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

function parseKategori(raw: Record<string, unknown>): KategoriOption {
  return {
    idKategori: asInt(raw["IdKategori"] ?? raw["idKategori"]),
    kodeKategori: asStr(raw["KodeKategori"] ?? raw["kodeKategori"]),
    namaKategori: asStr(raw["NamaKategori"] ?? raw["namaKategori"]),
    enable: asBool(raw["Enable"] ?? raw["enable"]),
    isWaste: asBool(raw["IsWaste"] ?? raw["isWaste"]),
  };
}

function parseItem(raw: Record<string, unknown>): MasterItem {
  return {
    id: asInt(raw["Id"] ?? raw["id"]),
    nama: asStr(raw["Nama"] ?? raw["nama"]),
  };
}

function parseRow(raw: Record<string, unknown>): FormulaRow {
  return {
    idFormula: asInt(raw["IdFormula"] ?? raw["idFormula"]),
    mainKategoriId: asInt(
      raw["MainOutputKategoriId"] ?? raw["mainKategoriId"],
    ),
    mainKategori: asStr(raw["MainKategori"] ?? raw["mainKategori"]),
    mainOutputId: asInt(raw["MainOutputId"] ?? raw["mainOutputId"]),
    mainOutputNama: asStr(raw["MainOutputNama"] ?? raw["mainOutputNama"]),
    jumlahInput: asInt(raw["JumlahInput"] ?? raw["jumlahInput"]),
    jumlahSecondary: asInt(raw["JumlahSecondary"] ?? raw["jumlahSecondary"]),
  };
}

function parseLine(raw: Record<string, unknown>): FormulaLine {
  return {
    kategoriId: asInt(raw["KategoriId"] ?? raw["kategoriId"]),
    kategoriNama: asStr(raw["KategoriNama"] ?? raw["kategoriNama"]),
    itemId: asInt(raw["ItemId"] ?? raw["itemId"]),
    itemNama: asStr(raw["ItemNama"] ?? raw["itemNama"]),
  };
}

export async function fetchFormulaKategori(
  token: string | undefined,
): Promise<KategoriOption[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
  }>("/mst-formula/kategori", t);
  await expectOk(res.status, res.data, "Gagal memuat data kategori");
  return rowsOf(res).map(parseKategori);
}

export async function fetchMasterItems(
  token: string | undefined,
  idKategori: number,
): Promise<MasterItem[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
  }>(`/mst-formula/items?idKategori=${idKategori}`, t);
  await expectOk(res.status, res.data, "Gagal memuat data item");
  return rowsOf(res).map(parseItem);
}

export async function fetchFormulaList(
  token: string | undefined,
): Promise<FormulaRow[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
  }>("/mst-formula", t);
  await expectOk(res.status, res.data, "Gagal memuat data formula");
  return rowsOf(res).map(parseRow);
}

export async function fetchFormulaDetail(
  token: string | undefined,
  idFormula: number,
): Promise<FormulaDetail> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>(`/mst-formula/detail?idFormula=${idFormula}`, t);
  await expectOk(res.status, res.data, "Gagal memuat detail formula");
  const d = res.data?.data ?? {};
  return {
    idFormula: asInt(d["IdFormula"] ?? d["idFormula"]),
    mainKategoriId: asInt(
      d["MainOutputKategoriId"] ?? d["mainKategoriId"],
    ),
    mainKategori: asStr(d["MainKategori"] ?? d["mainKategori"]),
    mainOutputId: asInt(d["MainOutputId"] ?? d["mainOutputId"]),
    mainOutputNama: asStr(d["MainOutputNama"] ?? d["mainOutputNama"]),
    inputs: Array.isArray(d["Inputs"])
      ? (d["Inputs"] as Record<string, unknown>[]).map(parseLine)
      : [],
    secondarys: Array.isArray(d["Secondarys"])
      ? (d["Secondarys"] as Record<string, unknown>[]).map(parseLine)
      : [],
  };
}

export async function createFormula(
  token: string | undefined,
  input: FormulaInput,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
  }>("/mst-formula", t, {
    method: "POST",
    body: JSON.stringify(input),
  });
  await expectOk(res.status, res.data, "Gagal menyimpan data formula");
}

export async function updateFormula(
  token: string | undefined,
  input: FormulaInput,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
  }>("/mst-formula", t, {
    method: "PUT",
    body: JSON.stringify(input),
  });
  await expectOk(res.status, res.data, "Gagal mengubah data formula");
}

export async function deleteFormula(
  token: string | undefined,
  idFormula: number,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
  }>(`/mst-formula?idFormula=${idFormula}`, t, {
    method: "DELETE",
  });
  await expectOk(res.status, res.data, "Gagal menghapus data formula");
}
