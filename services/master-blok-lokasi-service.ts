import { apiFetchAuth, ApiRequestError } from "@/services/api";

// ── Types ────────────────────────────────────────────────────────────────────

export type WarehouseOption = {
  idWarehouse: number;
  namaWarehouse: string;
};

export type KategoriOption = {
  idKategori: number;
  kodeKategori: string;
  namaKategori: string;
};

export type BlokRow = {
  blok: string;
  idWarehouse: number;
  namaWarehouse: string;
};

export type LokasiRow = {
  idLokasi: number;
  blok: string;
  description: string;
  enable: boolean;
};

export type JenisOption = {
  id: number;
  nama: string;
};

export type LokasiJenisRow = {
  blok: string;
  idLokasi: number;
  idKategori: number;
  idJenis: number;
  namaKategori: string;
  namaJenis: string;
};

export type BlokInput = {
  blok: string;
  idWarehouse: number;
};

export type LokasiInput = {
  blok: string;
  description: string;
  enable: boolean;
};

export type LokasiJenisInput = {
  blok: string;
  idLokasi: number;
  idKategori: number;
  idJenis: number;
};

export type BlokLokasiMaster = {
  warehouses: WarehouseOption[];
  kategoris: KategoriOption[];
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

function errMsg(data: { message?: string } | null, fallback: string): string {
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

function parseWarehouse(raw: Record<string, unknown>): WarehouseOption {
  return {
    idWarehouse: asInt(raw["IdWarehouse"] ?? raw["idWarehouse"]),
    namaWarehouse: asStr(raw["NamaWarehouse"] ?? raw["namaWarehouse"]),
  };
}

function parseKategori(raw: Record<string, unknown>): KategoriOption {
  return {
    idKategori: asInt(raw["IdKategori"] ?? raw["idKategori"]),
    kodeKategori: asStr(raw["KodeKategori"] ?? raw["kodeKategori"]),
    namaKategori: asStr(raw["NamaKategori"] ?? raw["namaKategori"]),
  };
}

function parseBlok(raw: Record<string, unknown>): BlokRow {
  return {
    blok: asStr(raw["Blok"] ?? raw["blok"]),
    idWarehouse: asInt(raw["IdWarehouse"] ?? raw["idWarehouse"]),
    namaWarehouse: asStr(raw["NamaWarehouse"] ?? raw["namaWarehouse"]),
  };
}

function parseLokasi(raw: Record<string, unknown>): LokasiRow {
  return {
    idLokasi: asInt(raw["IdLokasi"] ?? raw["idLokasi"]),
    blok: asStr(raw["Blok"] ?? raw["blok"]),
    description: asStr(raw["Description"] ?? raw["description"]),
    enable: asBool(raw["Enable"] ?? raw["enable"], false),
  };
}

function parseJenis(raw: Record<string, unknown>): JenisOption {
  return {
    id: asInt(raw["Id"] ?? raw["id"]),
    nama: asStr(raw["Nama"] ?? raw["nama"]),
  };
}

function parseLokasiJenis(raw: Record<string, unknown>): LokasiJenisRow {
  return {
    blok: asStr(raw["Blok"] ?? raw["blok"]),
    idLokasi: asInt(raw["IdLokasi"] ?? raw["idLokasi"]),
    idKategori: asInt(raw["IdKategori"] ?? raw["idKategori"]),
    idJenis: asInt(raw["IdJenis"] ?? raw["idJenis"]),
    namaKategori: asStr(raw["NamaKategori"] ?? raw["namaKategori"]),
    namaJenis: asStr(raw["NamaJenis"] ?? raw["namaJenis"]),
  };
}

// ── Master (combobox) ────────────────────────────────────────────────────────

export async function fetchBlokLokasiMaster(
  token: string | undefined,
): Promise<BlokLokasiMaster> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: {
      warehouses?: Record<string, unknown>[];
      kategoris?: Record<string, unknown>[];
    };
  }>("/mst-blok-lokasi/master", t);
  await expectOk(res.status, res.data, "Gagal memuat data master");
  const d = res.data?.data;
  return {
    warehouses: Array.isArray(d?.warehouses)
      ? d.warehouses.map(parseWarehouse)
      : [],
    kategoris: Array.isArray(d?.kategoris)
      ? d.kategoris.map(parseKategori)
      : [],
  };
}

// ── Blok ─────────────────────────────────────────────────────────────────────

export async function fetchBlokList(
  token: string | undefined,
  search = "",
): Promise<BlokRow[]> {
  const t = requireToken(token);
  const qs = search.trim()
    ? `?search=${encodeURIComponent(search.trim())}`
    : "";
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: Record<string, unknown>[];
  }>(`/mst-blok-lokasi/blok${qs}`, t);
  await expectOk(res.status, res.data, "Gagal memuat data blok");
  return rowsOf(res).map(parseBlok);
}

export async function createBlok(
  token: string | undefined,
  input: BlokInput,
): Promise<BlokRow> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>("/mst-blok-lokasi/blok", t, {
    method: "POST",
    body: JSON.stringify(input),
  });
  await expectOk(res.status, res.data, "Gagal menyimpan blok");
  const d = res.data?.data;
  if (!d) throw new ApiRequestError("Data blok tidak diterima");
  return parseBlok(d);
}

export async function updateBlok(
  token: string | undefined,
  blok: string,
  input: BlokInput,
): Promise<BlokRow> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>(`/mst-blok-lokasi/blok/${encodeURIComponent(blok)}`, t, {
    method: "PUT",
    body: JSON.stringify(input),
  });
  await expectOk(res.status, res.data, "Gagal mengubah blok");
  const d = res.data?.data;
  if (!d) throw new ApiRequestError("Data blok tidak diterima");
  return parseBlok(d);
}

export async function deleteBlok(
  token: string | undefined,
  blok: string,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
  }>(`/mst-blok-lokasi/blok/${encodeURIComponent(blok)}`, t, {
    method: "DELETE",
  });
  await expectOk(res.status, res.data, "Gagal menghapus blok");
}

// ── Lokasi ───────────────────────────────────────────────────────────────────

export async function fetchLokasiList(
  token: string | undefined,
  blok: string,
): Promise<LokasiRow[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: Record<string, unknown>[];
  }>(
    `/mst-blok-lokasi/lokasi?blok=${encodeURIComponent(blok)}`,
    t,
  );
  await expectOk(res.status, res.data, "Gagal memuat data lokasi");
  return rowsOf(res).map(parseLokasi);
}

export async function fetchNextLokasiId(
  token: string | undefined,
  blok: string,
): Promise<number> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: { nextId?: number };
  }>(
    `/mst-blok-lokasi/lokasi/next-id?blok=${encodeURIComponent(blok)}`,
    t,
  );
  await expectOk(res.status, res.data, "Gagal memuat ID lokasi berikutnya");
  return asInt(res.data?.data?.nextId, 0);
}

export async function createLokasi(
  token: string | undefined,
  input: LokasiInput,
): Promise<LokasiRow> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>("/mst-blok-lokasi/lokasi", t, {
    method: "POST",
    body: JSON.stringify(input),
  });
  await expectOk(res.status, res.data, "Gagal menyimpan lokasi");
  const d = res.data?.data;
  if (!d) throw new ApiRequestError("Data lokasi tidak diterima");
  return parseLokasi(d);
}

export async function updateLokasi(
  token: string | undefined,
  blok: string,
  idLokasi: number,
  input: LokasiInput,
): Promise<LokasiRow> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>(
    `/mst-blok-lokasi/lokasi/${encodeURIComponent(blok)}/${idLokasi}`,
    t,
    { method: "PUT", body: JSON.stringify(input) },
  );
  await expectOk(res.status, res.data, "Gagal mengubah lokasi");
  const d = res.data?.data;
  if (!d) throw new ApiRequestError("Data lokasi tidak diterima");
  return parseLokasi(d);
}

export async function deleteLokasi(
  token: string | undefined,
  blok: string,
  idLokasi: number,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
  }>(
    `/mst-blok-lokasi/lokasi/${encodeURIComponent(blok)}/${idLokasi}`,
    t,
    { method: "DELETE" },
  );
  await expectOk(res.status, res.data, "Gagal menghapus lokasi");
}

// ── Jenis (dynamic per kategori) ─────────────────────────────────────────────

export async function fetchJenisList(
  token: string | undefined,
  idKategori: number,
): Promise<JenisOption[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: Record<string, unknown>[];
  }>(`/mst-blok-lokasi/jenis?idKategori=${idKategori}`, t);
  await expectOk(res.status, res.data, "Gagal memuat daftar jenis");
  return rowsOf(res).map(parseJenis);
}

// ── Relasi lokasi <-> jenis ──────────────────────────────────────────────────

export async function fetchLokasiJenisList(
  token: string | undefined,
  blok: string,
  idLokasi: number,
): Promise<LokasiJenisRow[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: Record<string, unknown>[];
  }>(
    `/mst-blok-lokasi/lokasi-jenis?blok=${encodeURIComponent(blok)}&idLokasi=${idLokasi}`,
    t,
  );
  await expectOk(res.status, res.data, "Gagal memuat daftar jenis lokasi");
  return rowsOf(res).map(parseLokasiJenis);
}

export async function addLokasiJenis(
  token: string | undefined,
  input: LokasiJenisInput,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
  }>("/mst-blok-lokasi/lokasi-jenis", t, {
    method: "POST",
    body: JSON.stringify(input),
  });
  await expectOk(res.status, res.data, "Gagal menambah jenis");
}

export async function removeLokasiJenis(
  token: string | undefined,
  input: LokasiJenisInput,
): Promise<void> {
  const t = requireToken(token);
  const path =
    `/mst-blok-lokasi/lokasi-jenis/${encodeURIComponent(input.blok)}` +
    `/${input.idLokasi}/${input.idKategori}/${input.idJenis}`;
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
  }>(path, t, { method: "DELETE" });
  await expectOk(res.status, res.data, "Gagal menghapus jenis");
}
