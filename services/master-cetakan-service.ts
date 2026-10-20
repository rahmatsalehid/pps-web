import { apiFetchAuth, ApiRequestError } from "@/services/api";

export type CetakanOption = {
  idCetakan: number;
  namaCetakan: string;
};

export type WarnaOption = {
  idWarna: number;
  warna: string;
};

export type BarangJadiOption = {
  idBJ: number;
  namaBJ: string;
};

export type FurnitureWipOption = {
  idCabinetWIP: number;
  nama: string;
};

export type MaterialOption = {
  idCabinetMaterial: number;
  nama: string;
};

export type CetakanWarnaOptions = {
  cetakan: CetakanOption[];
  warna: WarnaOption[];
  barangJadi: BarangJadiOption[];
  furnitureWip: FurnitureWipOption[];
  materials: MaterialOption[];
};

export type CetakanWarnaKey = {
  idCetakan: number;
  idWarna: number;
  idMaterial: number;
};

export type CetakanWarnaRow = CetakanWarnaKey & {
  namaCetakan: string;
  warna: string;
  namaMaterial: string;
};

export type CetakanWarnaDetail = {
  barangJadi: BarangJadiOption[];
  furnitureWip: FurnitureWipOption[];
};

export type CetakanWarnaInput = CetakanWarnaKey & {
  barangJadi: number[];
  furnitureWip: number[];
};

export type CetakanWarnaListQuery = {
  top: number;
  q: string;
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

function parseCetakan(raw: Record<string, unknown>): CetakanOption {
  return {
    idCetakan: asInt(raw["IdCetakan"] ?? raw["idCetakan"]),
    namaCetakan: asStr(raw["NamaCetakan"] ?? raw["namaCetakan"]),
  };
}

function parseWarna(raw: Record<string, unknown>): WarnaOption {
  return {
    idWarna: asInt(raw["IdWarna"] ?? raw["idWarna"]),
    warna: asStr(raw["Warna"] ?? raw["warna"]),
  };
}

function parseBarangJadi(raw: Record<string, unknown>): BarangJadiOption {
  return {
    idBJ: asInt(raw["IdBJ"] ?? raw["idBJ"]),
    namaBJ: asStr(raw["NamaBJ"] ?? raw["namaBJ"]),
  };
}

function parseFurnitureWip(raw: Record<string, unknown>): FurnitureWipOption {
  return {
    idCabinetWIP: asInt(raw["IdCabinetWIP"] ?? raw["idCabinetWIP"]),
    nama: asStr(raw["Nama"] ?? raw["nama"]),
  };
}

function parseMaterial(raw: Record<string, unknown>): MaterialOption {
  return {
    idCabinetMaterial: asInt(
      raw["IdCabinetMaterial"] ?? raw["idCabinetMaterial"],
    ),
    nama: asStr(raw["Nama"] ?? raw["nama"]),
  };
}

function parseRow(raw: Record<string, unknown>): CetakanWarnaRow {
  return {
    idCetakan: asInt(raw["IdCetakan"] ?? raw["idCetakan"]),
    idWarna: asInt(raw["IdWarna"] ?? raw["idWarna"]),
    idMaterial: asInt(raw["IdMaterial"] ?? raw["idMaterial"]),
    namaCetakan: asStr(raw["NamaCetakan"] ?? raw["namaCetakan"]),
    warna: asStr(raw["Warna"] ?? raw["warna"]),
    namaMaterial: asStr(raw["NamaMaterial"] ?? raw["namaMaterial"]),
  };
}

// ── Master data (list) ───────────────────────────────────────────────────────

export async function fetchCetakanWarnaOptions(
  token: string | undefined,
): Promise<CetakanWarnaOptions> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: Record<string, Record<string, unknown>[]>;
  }>("/mst-cetakan/warna-material/options", t);
  await expectOk(res.status, res.data, "Gagal memuat data opsi");
  const d = res.data?.data ?? {};
  const arr = (k: string): Record<string, unknown>[] =>
    Array.isArray(d[k]) ? (d[k] as Record<string, unknown>[]) : [];
  return {
    cetakan: arr("cetakan").map(parseCetakan),
    warna: arr("warna").map(parseWarna),
    barangJadi: arr("barangJadi").map(parseBarangJadi),
    furnitureWip: arr("furnitureWip").map(parseFurnitureWip),
    materials: arr("materials").map(parseMaterial),
  };
}

export async function fetchCetakanWarnaList(
  token: string | undefined,
  query: CetakanWarnaListQuery,
): Promise<CetakanWarnaRow[]> {
  const t = requireToken(token);
  const params = new URLSearchParams({ top: String(query.top) });
  if (query.q.trim()) params.set("q", query.q.trim());
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: Record<string, unknown>[];
  }>(`/mst-cetakan/warna-material?${params.toString()}`, t);
  await expectOk(res.status, res.data, "Gagal memuat data cetakan");
  return rowsOf(res).map(parseRow);
}

export async function fetchCetakanWarnaDetail(
  token: string | undefined,
  key: CetakanWarnaKey,
): Promise<CetakanWarnaDetail> {
  const t = requireToken(token);
  const params = new URLSearchParams({
    idCetakan: String(key.idCetakan),
    idWarna: String(key.idWarna),
    idMaterial: String(key.idMaterial),
  });
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: {
      barangJadi?: Record<string, unknown>[];
      furnitureWip?: Record<string, unknown>[];
    };
  }>(`/mst-cetakan/warna-material/detail?${params.toString()}`, t);
  await expectOk(res.status, res.data, "Gagal memuat detail cetakan");
  const d = res.data?.data;
  return {
    barangJadi: Array.isArray(d?.barangJadi)
      ? d.barangJadi.map(parseBarangJadi)
      : [],
    furnitureWip: Array.isArray(d?.furnitureWip)
      ? d.furnitureWip.map(parseFurnitureWip)
      : [],
  };
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

export async function createCetakanWarna(
  token: string | undefined,
  input: CetakanWarnaInput,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
  }>("/mst-cetakan/warna-material", t, {
    method: "POST",
    body: JSON.stringify(input),
  });
  await expectOk(res.status, res.data, "Gagal menyimpan data cetakan");
}

export async function updateCetakanWarna(
  token: string | undefined,
  oldKey: CetakanWarnaKey,
  input: CetakanWarnaInput,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
  }>("/mst-cetakan/warna-material", t, {
    method: "PUT",
    body: JSON.stringify({ ...input, oldKey }),
  });
  await expectOk(res.status, res.data, "Gagal mengubah data cetakan");
}

export async function deleteCetakanWarna(
  token: string | undefined,
  key: CetakanWarnaKey,
): Promise<void> {
  const t = requireToken(token);
  const params = new URLSearchParams({
    idCetakan: String(key.idCetakan),
    idWarna: String(key.idWarna),
    idMaterial: String(key.idMaterial),
  });
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
  }>(`/mst-cetakan/warna-material?${params.toString()}`, t, {
    method: "DELETE",
  });
  await expectOk(res.status, res.data, "Gagal menghapus data cetakan");
}

// ── Master baru (dari form Tambah) ───────────────────────────────────────────

export async function createCetakanBaru(
  token: string | undefined,
  namaCetakan: string,
): Promise<CetakanOption> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>("/mst-cetakan/new-cetakan", t, {
    method: "POST",
    body: JSON.stringify({ namaCetakan }),
  });
  await expectOk(res.status, res.data, "Gagal menambah cetakan baru");
  return parseCetakan(res.data?.data ?? {});
}

export async function createWarnaBaru(
  token: string | undefined,
  warna: string,
): Promise<WarnaOption> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: Record<string, unknown>;
  }>("/mst-cetakan/new-warna", t, {
    method: "POST",
    body: JSON.stringify({ warna }),
  });
  await expectOk(res.status, res.data, "Gagal menambah warna baru");
  return parseWarna(res.data?.data ?? {});
}
