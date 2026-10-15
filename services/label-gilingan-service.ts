import { ApiRequestError, apiFetchAuth, getBackendBaseUrl } from "@/services/api";

export type LglHeader = {
  NoGilingan: string;
  DateCreate: string | null;
  IdGilingan: number;
  NamaGilingan: string | null;
  Berat: number | null;
  IsPartial: boolean;
  IdStatus: number | null;
  StatusText: string | null;
  Used: boolean;
  HasBeenPrinted: number;
  Blok: string | null;
  IdLokasi: string | null;
  GilinganNoProduksi: string | null;
  GilinganNamaMesin: string | null;
  NoBongkarSusun: string | null;
};

export type LglOutputItem = {
  NoGilingan: string;
  HasBeenPrinted: number;
};

export type LglJenis = {
  IdGilingan: number;
  NamaGilingan: string;
};

export type LglProduksiOption = {
  code: string;
  namaMesin: string;
  shift: number | null;
  hourRange: string;
};

export type LglPartialRow = {
  NoGilinganPartial: string;
  NoGilingan: string;
  Berat: number;
  SourceType: string | null;
  NoProduksi: string | null;
  TglProduksi: string | null;
  IdMesin: number | null;
  NamaMesin: string | null;
  IdOperator: number | null;
  Jam: string | null;
  Shift: number | null;
};

export type LglPartialInfo = {
  totalRows: number;
  totalPartialWeight: number;
  rows: LglPartialRow[];
};

type Envelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  totalRows?: number;
  totalPartialWeight?: number;
  meta?: { page?: number; limit?: number; total?: number; totalPages?: number };
};

function requireToken(token: string | undefined): string {
  if (!token) throw new ApiRequestError("Sesi login berakhir, silakan login ulang");
  return token;
}

const numOrNull = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const num0 = (v: unknown): number => numOrNull(v) ?? 0;
const bool = (v: unknown): boolean => v === true || v === 1 || v === "1";
const str = (v: unknown): string => (v == null ? "" : String(v));
const strOrNull = (v: unknown): string | null => (v == null ? null : String(v));

function parseHeader(r: Record<string, unknown>): LglHeader {
  return {
    NoGilingan: str(r.NoGilingan),
    DateCreate: strOrNull(r.DateCreate),
    IdGilingan: num0(r.IdGilingan),
    NamaGilingan: strOrNull(r.NamaGilingan),
    Berat: numOrNull(r.Berat),
    IsPartial: bool(r.IsPartial),
    IdStatus: numOrNull(r.IdStatus),
    StatusText: strOrNull(r.StatusText),
    Used: bool(r.Used),
    HasBeenPrinted: num0(r.HasBeenPrinted),
    Blok: strOrNull(r.Blok),
    IdLokasi: strOrNull(r.IdLokasi),
    GilinganNoProduksi: strOrNull(r.GilinganNoProduksi),
    GilinganNamaMesin: strOrNull(r.GilinganNamaMesin),
    NoBongkarSusun: strOrNull(r.NoBongkarSusun),
  };
}

export async function getLglHeaders(
  token: string | undefined,
  args: { page: number; limit: number; search: string; includeUsed: boolean },
): Promise<{ headers: LglHeader[]; total: number; totalPages: number }> {
  const t = requireToken(token);
  const qs = new URLSearchParams({
    page: String(args.page),
    limit: String(args.limit),
  });
  if (args.search) qs.set("search", args.search);
  if (args.includeUsed) qs.set("includeUsed", "true");
  const res = await apiFetchAuth<Envelope<Record<string, unknown>[]>>(
    `/labels/gilingan?${qs.toString()}`,
    t,
  );
  if (res.status !== 200 || !res.data || res.data.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal memuat data (${res.status})`);
  }
  const raw = res.data.data;
  const arr = Array.isArray(raw) ? raw : raw ? [raw as Record<string, unknown>] : [];
  const headers = arr.map((r) => parseHeader(r));
  return {
    headers,
    total: res.data.meta?.total ?? headers.length,
    totalPages: res.data.meta?.totalPages ?? 1,
  };
}

export async function getLglJenis(token: string | undefined): Promise<LglJenis[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ data?: Record<string, unknown>[] }>(
    "/gilingan-type",
    t,
  );
  return (res.data.data ?? [])
    .filter((r) => r.Enable === 1 || r.Enable === true || r.Enable == null)
    .map((r) => ({
      IdGilingan: num0(r.IdGilingan),
      NamaGilingan: str(r.NamaGilingan),
    }))
    .filter((j) => j.IdGilingan > 0);
}

export async function getLglProduksiOptions(
  token: string | undefined,
  tanggal: string,
): Promise<LglProduksiOption[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{ data?: Record<string, unknown>[] }>(
    `/production/gilingan/${encodeURIComponent(tanggal)}`,
    t,
  );
  return (res.data.data ?? [])
    .map((p) => {
      const hourStart = strOrNull(p.HourStart ?? p.hourStart);
      const hourEnd = strOrNull(p.HourEnd ?? p.hourEnd);
      const hourRange =
        hourStart || hourEnd ? `${hourStart ?? "--:--"} - ${hourEnd ?? "--:--"}` : "";
      return {
        code: str(p.NoProduksi),
        namaMesin: str(p.NamaMesin),
        shift: numOrNull(p.Shift),
        hourRange,
      };
    })
    .filter((o) => o.code !== "");
}

export function glgProduksiOptionLabel(o: LglProduksiOption): string {
  const range = o.hourRange ? ` • ${o.hourRange}` : "";
  const shift = o.shift != null ? ` (SHIFT ${o.shift})` : "";
  return `${o.code} | ${o.namaMesin}${range}${shift}`;
}

export function glgOutputSourcePrefix(noCode: string): "W" | "BG" | null {
  const c = noCode.trim();
  if (c.startsWith("W.")) return "W";
  if (c.startsWith("BG.")) return "BG";
  return null;
}

export async function getLglOutputs(
  token: string | undefined,
  noCode: string,
): Promise<LglOutputItem[]> {
  const t = requireToken(token);
  const prefix = glgOutputSourcePrefix(noCode);
  if (!prefix) return [];
  const path =
    prefix === "W"
      ? `/production/gilingan/${encodeURIComponent(noCode)}/outputs`
      : `/bongkar-susun/${encodeURIComponent(noCode)}/outputs/gilingan`;
  const res = await apiFetchAuth<Envelope<Record<string, unknown>[]>>(path, t);
  if (res.status !== 200 || !res.data || res.data.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal memuat output (${res.status})`);
  }
  const raw = res.data.data;
  const arr = Array.isArray(raw) ? raw : raw ? [raw as Record<string, unknown>] : [];
  return arr
    .map((r) => ({
      NoGilingan: str(r.NoGilingan),
      HasBeenPrinted: num0(r.HasBeenPrinted),
    }))
    .filter((o) => o.NoGilingan !== "");
}

export async function getLglPartialInfo(
  token: string | undefined,
  noGilingan: string,
): Promise<LglPartialInfo> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<Record<string, unknown>[]>>(
    `/labels/gilingan/partials/${encodeURIComponent(noGilingan)}`,
    t,
  );
  if (res.status !== 200 || !res.data || res.data.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal memuat partial (${res.status})`);
  }
  return {
    totalRows: res.data.totalRows ?? 0,
    totalPartialWeight: res.data.totalPartialWeight ?? 0,
    rows: (res.data.data ?? []).map((r) => ({
      NoGilinganPartial: str(r.NoGilinganPartial),
      NoGilingan: str(r.NoGilingan),
      Berat: num0(r.Berat),
      SourceType: strOrNull(r.SourceType),
      NoProduksi: strOrNull(r.NoProduksi),
      TglProduksi: strOrNull(r.TglProduksi),
      IdMesin: numOrNull(r.IdMesin),
      NamaMesin: strOrNull(r.NamaMesin),
      IdOperator: numOrNull(r.IdOperator),
      Jam: strOrNull(r.Jam),
      Shift: numOrNull(r.Shift),
    })),
  };
}

export type LglHeaderPayload = Partial<{
  IdGilingan: number;
  Berat: number;
  DateCreate: string;
  IsPartial: 0 | 1;
  IdStatus: number;
  Blok: string;
  IdLokasi: string;
}>;

export type LglSavePayload = {
  header: LglHeaderPayload;
  /** Wajib saat create — prefix "W." (produksi) */
  outputCode?: string;
};

export async function createGlg(
  token: string | undefined,
  payload: LglSavePayload,
): Promise<{ noGilingan: string | null }> {
  const t = requireToken(token);
  const res = await apiFetchAuth<
    Envelope<{ header?: Record<string, unknown> }>
  >("/labels/gilingan", t, { method: "POST", body: JSON.stringify(payload) });
  if (res.status < 200 || res.status >= 300 || res.data?.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal membuat label (${res.status})`);
  }
  const no = res.data.data?.header?.NoGilingan;
  return { noGilingan: no != null ? str(no) : null };
}

export async function updateGlg(
  token: string | undefined,
  noGilingan: string,
  payload: LglSavePayload,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<unknown>>(
    `/labels/gilingan/${encodeURIComponent(noGilingan)}`,
    t,
    { method: "PUT", body: JSON.stringify(payload) },
  );
  if (res.status < 200 || res.status >= 300 || res.data?.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal menyimpan label (${res.status})`);
  }
}

export async function deleteGlg(
  token: string | undefined,
  noGilingan: string,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<unknown>>(
    `/labels/gilingan/${encodeURIComponent(noGilingan)}`,
    t,
    { method: "DELETE" },
  );
  if (res.status < 200 || res.status >= 300 || res.data?.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal menghapus label (${res.status})`);
  }
}

async function fetchPdfBase64(token: string, path: string): Promise<string> {
  const base = getBackendBaseUrl();
  let response: Response;
  try {
    response = await fetch(`${base}/api${path}`, {
      headers: { Authorization: `Bearer ${token}` },
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

export async function fetchLglLabelPdfBase64(
  token: string | undefined,
  noGilingan: string,
): Promise<string> {
  return fetchPdfBase64(
    requireToken(token),
    `/labels/gilingan/${encodeURIComponent(noGilingan)}/pdf`,
  );
}

export async function markGlgPrinted(
  token: string | undefined,
  noGilingan: string,
): Promise<number | null> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<Record<string, unknown>>>(
    `/labels/gilingan/${encodeURIComponent(noGilingan)}/print`,
    t,
    { method: "PATCH" },
  );
  if (res.status < 200 || res.status >= 300 || res.data?.success !== true) {
    throw new ApiRequestError(
      res.data?.message ?? `Gagal memperbarui hitungan cetak (${res.status})`,
    );
  }
  return numOrNull(res.data.data?.HasBeenPrinted ?? res.data.data?.hasBeenPrinted);
}
