import { apiFetchAuth, ApiRequestError } from "@/services/api";

export type MappingBlok = {
  blok: string;
  idWarehouse: number;
  namaWarehouse: string;
  totalLokasi: number;
  totalJenis: number;
};

export type LokasiJenis = {
  idKategori: number;
  idJenis: number;
  kodeKategori: string;
  namaKategori: string;
  namaJenis: string;
  idUOM: number | null;
  namaUOM: string;
};

export type MappingLokasi = {
  idLokasi: number;
  blok: string;
  description: string;
  enable: boolean;
  label: string;
  jenisList: LokasiJenis[];
  totalLabel: number;
  totalQty: number;
  totalBerat: number;
  namaJenis: string;
  namaUOM: string;
};

export type MasterKategori = {
  idKategori: number;
  namaKategori: string;
};

export type MasterJenis = {
  idJenis: number;
  namaJenis: string;
};

export type MappingLabelItem = {
  labelCode: string;
  dateCreate: string;
  namaJenis: string;
  kategori: string;
  uom: string;
  blok: string;
  idLokasi: number;
  qty: number;
  berat: number | null;
};

export type MappingLabelResult = {
  data: MappingLabelItem[];
  totalData: number;
  totalQty: number;
  totalBerat: number;
};

export type MappingLabelHistoryItem = {
  eventTime: string | null;
  actorUsername: string;
  beforeBlok: string;
  beforeIdLokasi: number | null;
  afterBlok: string;
  afterIdLokasi: number | null;
};

export type MappingLabelHistoryResult = {
  labelCode: string;
  history: MappingLabelHistoryItem[];
};

export type LayoutCellPayload = {
  row: number;
  col: number;
  cellType: string;
  idLokasi: number | null;
  labelText: string | null;
  rowSpan: number;
  colSpan: number;
};

export type MappingLayoutData = {
  rows: number;
  cols: number;
  cells: LayoutCellPayload[];
};

export type JenisPairInput = {
  idKategori: number;
  idJenis: number;
};

function requireToken(token: string | undefined): string {
  if (!token) throw new ApiRequestError("Tidak terautentikasi");
  return token;
}

function asStr(v: unknown): string {
  return v == null ? "" : String(v);
}

function asStrOrNull(v: unknown): string | null {
  const s = asStr(v).trim();
  return s ? s : null;
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

function asFloat(v: unknown, fallback = 0): number {
  if (v == null || v === "") return fallback;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

function asFloatOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function asBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    return s === "true" || s === "1";
  }
  return false;
}

function errMsg(e: unknown, fallback: string): string {
  if (e instanceof ApiRequestError) return e.message;
  if (e instanceof Error) return e.message.replace(/^Exception:\s*/, "");
  return fallback;
}

function expectOk(
  status: number,
  data: { success?: boolean; message?: string } | null,
  fallback: string,
): void {
  if (status >= 200 && status < 300 && (!data || data.success !== false)) {
    return;
  }
  throw new ApiRequestError(errMsg(data, fallback));
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatDateIso(raw: string): string {
  if (!raw) return "";
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return raw;
  return `${pad2(dt.getDate())}/${pad2(dt.getMonth() + 1)}/${dt.getFullYear()}`;
}

function formatDateTime(raw: string | null): string | null {
  if (!raw) return null;
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return raw;
  return `${pad2(dt.getDate())}/${pad2(dt.getMonth() + 1)}/${dt.getFullYear()} ${pad2(
    dt.getHours(),
  )}:${pad2(dt.getMinutes())}`;
}

function parseJenis(j: Record<string, unknown>): LokasiJenis {
  return {
    idKategori: asInt(j["IdKategori"]),
    idJenis: asInt(j["IdJenis"]),
    kodeKategori: asStr(j["KodeKategori"]),
    namaKategori: asStr(j["NamaKategori"]),
    namaJenis: asStr(j["NamaJenis"]),
    idUOM: asIntOrNull(j["IdUOM"]),
    namaUOM: asStr(j["NamaUOM"]),
  };
}

function parseBlok(j: Record<string, unknown>): MappingBlok {
  return {
    blok: asStr(j["Blok"]),
    idWarehouse: asInt(j["IdWarehouse"]),
    namaWarehouse: asStr(j["NamaWarehouse"]),
    totalLokasi: asInt(j["TotalLokasi"]),
    totalJenis: asInt(j["TotalJenis"]),
  };
}

function parseLokasi(j: Record<string, unknown>): MappingLokasi {
  const rawId = j["IdLokasi"];
  const idLokasi =
    typeof rawId === "number" ? Math.trunc(rawId) : asInt(rawId);
  const blok = asStr(j["Blok"]);
  const rawJenis = j["JenisList"];
  const jenisList = Array.isArray(rawJenis)
    ? rawJenis.map((e) => parseJenis(e as Record<string, unknown>))
    : [];
  const namaJenis = jenisList
    .map((e) => e.namaJenis)
    .filter((s) => s.length > 0)
    .join(", ");
  const namaUOM = jenisList.find((e) => e.namaUOM.length > 0)?.namaUOM ?? "";
  return {
    idLokasi,
    blok,
    description: asStr(j["Description"]),
    enable: asBool(j["Enable"]),
    label: `${blok}${idLokasi}`,
    jenisList,
    totalLabel: asInt(j["TotalLabel"]),
    totalQty: asInt(j["TotalQty"]),
    totalBerat: asFloat(j["TotalBerat"]),
    namaJenis,
    namaUOM,
  };
}

function parseLabelItem(j: Record<string, unknown>): MappingLabelItem {
  return {
    labelCode: asStr(j["LabelCode"]),
    dateCreate: formatDateIso(asStr(j["DateCreate"])),
    namaJenis: asStr(j["NamaJenis"]),
    kategori: asStr(j["Kategori"]),
    uom: asStr(j["NamaUOM"] ?? j["Uom"]),
    blok: asStr(j["Blok"]),
    idLokasi: asInt(j["IdLokasi"]),
    qty: asInt(j["Qty"]),
    berat: asFloatOrNull(j["Berat"]),
  };
}

function parseHistoryItem(j: Record<string, unknown>): MappingLabelHistoryItem {
  return {
    eventTime: formatDateTime(asStrOrNull(j["eventTime"])),
    actorUsername: asStr(j["actorUsername"]),
    beforeBlok: asStr(j["beforeBlok"]),
    beforeIdLokasi: asIntOrNull(j["beforeIdLokasi"]),
    afterBlok: asStr(j["afterBlok"]),
    afterIdLokasi: asIntOrNull(j["afterIdLokasi"]),
  };
}

function parseLayoutCell(j: Record<string, unknown>): LayoutCellPayload {
  const cellType = asStr(j["cellType"]).trim().toLowerCase();
  return {
    row: asInt(j["row"]),
    col: asInt(j["col"]),
    cellType,
    idLokasi: cellType === "lokasi" ? asIntOrNull(j["idLokasi"]) : null,
    labelText: cellType === "label" ? asStrOrNull(j["labelText"]) : null,
    rowSpan: Math.max(1, asInt(j["rowSpan"], 1)),
    colSpan: Math.max(1, asInt(j["colSpan"], 1)),
  };
}

export async function fetchBlokList(
  token: string | undefined,
): Promise<MappingBlok[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: unknown;
  }>("/mapping/blok", t);
  if (res.status === 404) return [];
  expectOk(res.status, res.data, "Gagal memuat data blok");
  const rows = Array.isArray(res.data.data) ? res.data.data : [];
  return rows.map((r) => parseBlok(r as Record<string, unknown>));
}

export async function fetchLokasiByBlok(
  token: string | undefined,
  blok: string,
): Promise<MappingLokasi[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: unknown;
  }>(`/mapping/lokasi?blok=${encodeURIComponent(blok)}`, t);
  if (res.status === 404) return [];
  expectOk(res.status, res.data, "Gagal memuat data lokasi");
  const rows = Array.isArray(res.data.data) ? res.data.data : [];
  return rows.map((r) => parseLokasi(r as Record<string, unknown>));
}

export async function fetchLayout(
  token: string | undefined,
  blok: string,
): Promise<MappingLayoutData | null> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: Record<string, unknown> | null;
  }>(`/mapping/layout/${encodeURIComponent(blok)}`, t);
  if (res.status === 404) return null;
  expectOk(res.status, res.data, "Gagal memuat layout");
  const data = res.data.data;
  if (!data) return null;
  const cellsRaw = Array.isArray(data["cells"]) ? data["cells"] : [];
  return {
    rows: asInt(data["rows"]),
    cols: asInt(data["cols"]),
    cells: cellsRaw.map((c) => parseLayoutCell(c as Record<string, unknown>)),
  };
}

export async function saveLayout(
  token: string | undefined,
  blok: string,
  payload: { rows: number; cols: number; cells: LayoutCellPayload[] },
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ success?: boolean; message?: string }>(
    `/mapping/layout/${encodeURIComponent(blok)}`,
    t,
    { method: "POST", body: JSON.stringify(payload) },
  );
  expectOk(res.status, res.data, "Gagal menyimpan layout");
}

export async function createLokasi(
  token: string | undefined,
  blok: string,
  payload: { idLokasi: number; jenisList: JenisPairInput[] },
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ success?: boolean; message?: string }>(
    `/mapping/lokasi/${encodeURIComponent(blok)}`,
    t,
    {
      method: "POST",
      body: JSON.stringify({
        IdLokasi: payload.idLokasi,
        JenisList: payload.jenisList.map((p) => ({
          IdKategori: p.idKategori,
          IdJenis: p.idJenis,
        })),
        Enable: true,
      }),
    },
  );
  expectOk(res.status, res.data, "Gagal menambahkan lokasi");
}

export async function updateLokasi(
  token: string | undefined,
  blok: string,
  idLokasi: number,
  payload: { jenisList: JenisPairInput[] },
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ success?: boolean; message?: string }>(
    `/mapping/lokasi/${encodeURIComponent(blok)}/${idLokasi}`,
    t,
    {
      method: "PUT",
      body: JSON.stringify({
        JenisList: payload.jenisList.map((p) => ({
          IdKategori: p.idKategori,
          IdJenis: p.idJenis,
        })),
      }),
    },
  );
  expectOk(res.status, res.data, "Gagal memperbarui lokasi");
}

export async function fetchKategori(
  token: string | undefined,
): Promise<MasterKategori[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: unknown;
  }>("/master-kategori", t);
  expectOk(res.status, res.data, "Gagal memuat data kategori");
  const rows = Array.isArray(res.data.data) ? res.data.data : [];
  return rows.map((r) => {
    const j = r as Record<string, unknown>;
    return {
      idKategori: asInt(j["IdKategori"]),
      namaKategori: asStr(j["NamaKategori"]),
    };
  });
}

export async function fetchJenis(
  token: string | undefined,
  idKategori: number,
): Promise<MasterJenis[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: unknown;
  }>(`/master-jenis?idKategori=${idKategori}`, t);
  expectOk(res.status, res.data, "Gagal memuat data jenis");
  const rows = Array.isArray(res.data.data) ? res.data.data : [];
  return rows.map((r) => {
    const j = r as Record<string, unknown>;
    return {
      idJenis: asInt(j["IdJenis"]),
      namaJenis: asStr(j["NamaJenis"]),
    };
  });
}

export async function fetchLabelByLokasi(
  token: string | undefined,
  blok: string,
  idLokasi: number,
): Promise<MappingLabelResult> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: unknown;
    totalData?: number;
  }>(
    `/label/all/v2?blok=${encodeURIComponent(blok)}&idlokasi=${idLokasi}`,
    t,
  );
  expectOk(res.status, res.data, "Gagal memuat data label");
  const rows = Array.isArray(res.data.data) ? res.data.data : [];
  const items = rows.map((r) => parseLabelItem(r as Record<string, unknown>));
  return {
    data: items,
    totalData: asInt(res.data.totalData, items.length) || items.length,
    totalQty: items.reduce((s, e) => s + e.qty, 0),
    totalBerat: items.reduce((s, e) => s + (e.berat ?? 0), 0),
  };
}

export async function fetchLabelHistory(
  token: string | undefined,
  labelCode: string,
): Promise<MappingLabelHistoryResult> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    labelCode?: string;
    history?: unknown;
  }>(`/label/history-lokasi/${encodeURIComponent(labelCode)}`, t);
  expectOk(res.status, res.data, "Gagal memuat riwayat label");
  const raw = res.data.history;
  if (!Array.isArray(raw)) {
    throw new ApiRequestError("Format data riwayat label tidak sesuai");
  }
  return {
    labelCode: asStr(res.data.labelCode) || labelCode,
    history: raw.map((e) => parseHistoryItem(e as Record<string, unknown>)),
  };
}
