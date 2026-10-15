import { ApiRequestError, apiFetchAuth, getBackendBaseUrl } from "@/services/api";

export type LwsHeader = {
  NoWashing: string;
  IdJenisPlastik: number;
  NamaJenisPlastik: string | null;
  IdWarehouse: number | null;
  NamaWarehouse: string | null;
  DateCreate: string | null;
  StatusText: string;
  Blok: string | null;
  IdLokasi: string | null;
  Density: number | null;
  Density2: number | null;
  Density3: number | null;
  Moisture: number | null;
  Moisture2: number | null;
  Moisture3: number | null;
  NoProduksi: string | null;
  NamaMesin: string | null;
  NoBongkarSusun: string | null;
  CreateBy: string | null;
  DateTimeCreate: string | null;
  HasBeenPrinted: number;
  Used: boolean;
};

export type LwsDetail = {
  NoWashing: string;
  NoSak: number;
  Berat: number | null;
  DateUsage: string | null;
  IdLokasi: string | null;
};

export type LwsOutputItem = {
  NoWashing: string;
  HasBeenPrinted: number;
};

export type LwsJenis = {
  IdWashing: number;
  Nama: string;
};

export type LwsProcessOption = {
  noProduksi: string;
  namaMesin: string;
};

export type LwsMaxSak = {
  JlhSak: number;
  DefaultKG: number;
};

type Envelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
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

function parseHeader(r: Record<string, unknown>): LwsHeader {
  return {
    NoWashing: str(r.NoWashing),
    IdJenisPlastik: num0(r.IdJenisPlastik),
    NamaJenisPlastik: strOrNull(r.NamaJenisPlastik),
    IdWarehouse: numOrNull(r.IdWarehouse),
    NamaWarehouse: strOrNull(r.NamaWarehouse),
    DateCreate: strOrNull(r.DateCreate),
    StatusText: str(r.StatusText),
    Blok: strOrNull(r.Blok),
    IdLokasi: strOrNull(r.IdLokasi),
    Density: numOrNull(r.Density),
    Density2: numOrNull(r.Density2),
    Density3: numOrNull(r.Density3),
    Moisture: numOrNull(r.Moisture),
    Moisture2: numOrNull(r.Moisture2),
    Moisture3: numOrNull(r.Moisture3),
    NoProduksi: strOrNull(r.NoProduksi),
    NamaMesin: strOrNull(r.NamaMesin),
    NoBongkarSusun: strOrNull(r.NoBongkarSusun),
    CreateBy: strOrNull(r.CreateBy),
    DateTimeCreate: strOrNull(r.DateTimeCreate),
    HasBeenPrinted: num0(r.HasBeenPrinted),
    Used: bool(r.Used),
  };
}

export async function getLwsHeaders(
  token: string | undefined,
  args: { page: number; limit: number; search: string; includeUsed: boolean },
): Promise<{ headers: LwsHeader[]; total: number; totalPages: number }> {
  const t = requireToken(token);
  const qs = new URLSearchParams({
    page: String(args.page),
    limit: String(args.limit),
  });
  if (args.search) qs.set("search", args.search);
  if (args.includeUsed) qs.set("includeUsed", "true");
  const res = await apiFetchAuth<Envelope<Record<string, unknown>[]>>(
    `/labels/washing?${qs.toString()}`,
    t,
  );
  if (res.status !== 200 || !res.data || res.data.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal memuat data (${res.status})`);
  }
  const headers = (res.data.data ?? []).map((r) => parseHeader(r));
  return {
    headers,
    total: res.data.meta?.total ?? headers.length,
    totalPages: res.data.meta?.totalPages ?? 1,
  };
}

export async function getLwsDetails(
  token: string | undefined,
  noWashing: string,
): Promise<LwsDetail[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<
    Envelope<{ nowashing?: string; details?: Record<string, unknown>[] }>
  >(`/labels/washing/${encodeURIComponent(noWashing)}`, t);
  if (res.status !== 200 || !res.data || res.data.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal memuat detail (${res.status})`);
  }
  return (res.data.data?.details ?? []).map((r) => ({
    NoWashing: str(r.NoWashing),
    NoSak: num0(r.NoSak),
    Berat: numOrNull(r.Berat),
    DateUsage: strOrNull(r.DateUsage),
    IdLokasi: strOrNull(r.IdLokasi),
  }));
}

export async function getLwsJenis(token: string | undefined): Promise<LwsJenis[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<Record<string, unknown>[]>>("/mst-washing", t);
  if (res.status !== 200 || !res.data) {
    throw new ApiRequestError(res.data?.message ?? `Gagal memuat jenis washing (${res.status})`);
  }
  return (res.data.data ?? [])
    .filter((r) => r.IsEnable === true || r.IsEnable === 1 || r.IsEnable === "1")
    .map((r) => ({
      IdWashing: num0(r.IdWashing),
      Nama: str(r.Nama),
    }));
}

export async function getLwsMaxSak(token: string | undefined): Promise<LwsMaxSak> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<Record<string, unknown>>>("/max-sak/7", t);
  if (res.status !== 200 || !res.data || res.data.success !== true) {
    return { JlhSak: 1, DefaultKG: 1 };
  }
  return {
    JlhSak: num0(res.data.data?.JlhSak) || 1,
    DefaultKG: numOrNull(res.data.data?.DefaultKG) ?? 1,
  };
}

export async function getLwsProduksiOptions(
  token: string | undefined,
  tanggal: string,
): Promise<LwsProcessOption[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<Record<string, unknown>[]>>(
    `/production/washing/${encodeURIComponent(tanggal)}`,
    t,
  );
  if (res.status !== 200 || !res.data) {
    throw new ApiRequestError(res.data?.message ?? `Gagal memuat proses (${res.status})`);
  }
  return (res.data.data ?? [])
    .map((r) => ({
      noProduksi: str(r.noProduksi ?? r.NoProduksi),
      namaMesin: str(r.namaMesin ?? r.NamaMesin),
    }))
    .filter((o) => o.noProduksi !== "");
}

export async function getLwsOutputs(
  token: string | undefined,
  noProduksi: string,
): Promise<LwsOutputItem[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<Record<string, unknown>[]>>(
    `/production/washing/${encodeURIComponent(noProduksi)}/outputs`,
    t,
  );
  if (res.status !== 200 || !res.data) {
    throw new ApiRequestError(res.data?.message ?? `Gagal memuat output (${res.status})`);
  }
  return (res.data.data ?? [])
    .map((r) => ({
      NoWashing: str(r.NoWashing),
      HasBeenPrinted: num0(r.HasBeenPrinted),
    }))
    .filter((o) => o.NoWashing !== "");
}

export type LwsHeaderPayload = Partial<{
  IdJenisPlastik: number;
  IdWarehouse: number;
  DateCreate: string;
  Density: number | null;
  Density2: number | null;
  Density3: number | null;
  Moisture: number | null;
  Moisture2: number | null;
  Moisture3: number | null;
}>;

export type LwsSavePayload = {
  header: LwsHeaderPayload;
  details?: { NoSak: number; Berat: number; IdLokasi?: string }[];
  NoProduksi?: string;
};

export async function createLws(
  token: string | undefined,
  payload: LwsSavePayload,
): Promise<string | null> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<{ header?: Record<string, unknown> }>>(
    "/labels/washing",
    t,
    { method: "POST", body: JSON.stringify(payload) },
  );
  if (res.status < 200 || res.status >= 300 || res.data?.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal membuat label (${res.status})`);
  }
  return strOrNull(res.data.data?.header?.NoWashing);
}

export async function updateLws(
  token: string | undefined,
  noWashing: string,
  payload: LwsSavePayload,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<unknown>>(
    `/labels/washing/${encodeURIComponent(noWashing)}`,
    t,
    { method: "PUT", body: JSON.stringify(payload) },
  );
  if (res.status < 200 || res.status >= 300 || res.data?.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal menyimpan label (${res.status})`);
  }
}

export async function deleteLws(
  token: string | undefined,
  noWashing: string,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<unknown>>(
    `/labels/washing/${encodeURIComponent(noWashing)}`,
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

export async function fetchLwsLabelPdfBase64(
  token: string | undefined,
  noWashing: string,
): Promise<string> {
  return fetchPdfBase64(
    requireToken(token),
    `/labels/washing/${encodeURIComponent(noWashing)}/pdf`,
  );
}

export async function markLwsPrinted(
  token: string | undefined,
  noWashing: string,
): Promise<number | null> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<Record<string, unknown>>>(
    `/labels/washing/${encodeURIComponent(noWashing)}/print`,
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
