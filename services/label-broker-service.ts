import { ApiRequestError, apiFetchAuth, getBackendBaseUrl } from "@/services/api";

export type LbrHeader = {
  NoBroker: string;
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
  MaxMeltTemp: number | null;
  MinMeltTemp: number | null;
  MFI: number | null;
  VisualNote: string | null;
  NoProduksi: string | null;
  NamaMesin: string | null;
  NoBongkarSusun: string | null;
  CreateBy: string | null;
  DateTimeCreate: string | null;
  HasBeenPrinted: number;
  Used: boolean;
};

export type LbrDetail = {
  NoBroker: string;
  NoSak: number;
  Berat: number | null;
  DateUsage: string | null;
  IdLokasi: string | null;
  IsPartial: boolean | null;
};

export type LbrOutputItem = {
  NoBroker: string;
  HasBeenPrinted: number;
};

export type LbrJenis = {
  IdBroker: number;
  Nama: string;
};

export type LbrProcessOption = {
  noProduksi: string;
  namaMesin: string;
};

export type LbrPartialRow = {
  NoBrokerPartial: string;
  NoBroker: string;
  NoSak: number;
  Berat: number;
  NoProduksi: string | null;
  TglProduksi: string | null;
  NamaMesin: string | null;
};

export type LbrPartialInfo = {
  totalPartialWeight: number;
  rows: LbrPartialRow[];
};

export type LbrMaxSak = {
  JlhSak: number;
  DefaultKG: number;
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

export async function getLbrHeaders(
  token: string | undefined,
  args: { page: number; limit: number; search: string; includeUsed: boolean },
): Promise<{ headers: LbrHeader[]; total: number; totalPages: number }> {
  const t = requireToken(token);
  const qs = new URLSearchParams({
    page: String(args.page),
    limit: String(args.limit),
  });
  if (args.search) qs.set("search", args.search);
  if (args.includeUsed) qs.set("includeUsed", "true");
  const res = await apiFetchAuth<Envelope<Record<string, unknown>[]>>(
    `/labels/broker?${qs.toString()}`,
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

function parseHeader(r: Record<string, unknown>): LbrHeader {
  return {
    NoBroker: str(r.NoBroker),
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
    MaxMeltTemp: numOrNull(r.MaxMeltTemp),
    MinMeltTemp: numOrNull(r.MinMeltTemp),
    MFI: numOrNull(r.MFI),
    VisualNote: strOrNull(r.VisualNote),
    NoProduksi: strOrNull(r.NoProduksi),
    NamaMesin: strOrNull(r.NamaMesin),
    NoBongkarSusun: strOrNull(r.NoBongkarSusun),
    CreateBy: strOrNull(r.CreateBy),
    DateTimeCreate: strOrNull(r.DateTimeCreate),
    HasBeenPrinted: num0(r.HasBeenPrinted),
    Used: bool(r.Used),
  };
}

export async function getLbrDetails(
  token: string | undefined,
  noBroker: string,
): Promise<LbrDetail[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<
    Envelope<{ nobroker?: string; details?: Record<string, unknown>[] }>
  >(`/labels/broker/${encodeURIComponent(noBroker)}`, t);
  if (res.status !== 200 || !res.data || res.data.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal memuat detail (${res.status})`);
  }
  return (res.data.data?.details ?? []).map((r) => ({
    NoBroker: str(r.NoBroker),
    NoSak: num0(r.NoSak),
    Berat: numOrNull(r.Berat),
    DateUsage: strOrNull(r.DateUsage),
    IdLokasi: strOrNull(r.IdLokasi),
    IsPartial: r.IsPartial == null ? null : bool(r.IsPartial),
  }));
}

export async function getLbrJenis(token: string | undefined): Promise<LbrJenis[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<Record<string, unknown>[]>>("/mst-broker", t);
  if (res.status !== 200 || !res.data || res.data.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal memuat jenis broker (${res.status})`);
  }
  return (res.data.data ?? [])
    .filter((r) => r.IsEnable === true || r.IsEnable === 1 || r.IsEnable === "1")
    .map((r) => ({
      IdBroker: num0(r.IdBroker),
      Nama: str(r.Nama),
    }));
}

export async function getLbrMaxSak(token: string | undefined): Promise<LbrMaxSak> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<Record<string, unknown>>>("/max-sak/2", t);
  if (res.status !== 200 || !res.data || res.data.success !== true) {
    return { JlhSak: 1, DefaultKG: 1 };
  }
  return {
    JlhSak: num0(res.data.data?.JlhSak) || 1,
    DefaultKG: numOrNull(res.data.data?.DefaultKG) ?? 1,
  };
}

export async function getLbrOutputs(
  token: string | undefined,
  noProduksi: string,
): Promise<LbrOutputItem[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<Record<string, unknown>[]>>(
    `/production/broker/${encodeURIComponent(noProduksi)}/outputs`,
    t,
  );
  if (res.status !== 200 || !res.data) {
    throw new ApiRequestError(res.data?.message ?? `Gagal memuat output (${res.status})`);
  }
  return (res.data.data ?? [])
    .map((r) => ({
      NoBroker: str(r.NoBroker),
      HasBeenPrinted: num0(r.HasBeenPrinted),
    }))
    .filter((o) => o.NoBroker !== "");
}

export async function getLbrPartialInfo(
  token: string | undefined,
  noBroker: string,
  noSak: number,
): Promise<LbrPartialInfo> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<Record<string, unknown>[]>>(
    `/labels/broker/partials/${encodeURIComponent(noBroker)}/${noSak}`,
    t,
  );
  if (res.status !== 200 || !res.data || res.data.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal memuat partial (${res.status})`);
  }
  return {
    totalPartialWeight: numOrNull(res.data.totalPartialWeight) ?? 0,
    rows: (res.data.data ?? []).map((r) => ({
      NoBrokerPartial: str(r.NoBrokerPartial),
      NoBroker: str(r.NoBroker),
      NoSak: num0(r.NoSak),
      Berat: num0(r.Berat),
      NoProduksi: strOrNull(r.NoProduksi),
      TglProduksi: strOrNull(r.TglProduksi),
      NamaMesin: strOrNull(r.NamaMesin),
    })),
  };
}

export type LbrHeaderPayload = Partial<{
  IdJenisPlastik: number;
  IdWarehouse: number;
  DateCreate: string;
  Density: number | null;
  Density2: number | null;
  Density3: number | null;
  Moisture: number | null;
  Moisture2: number | null;
  Moisture3: number | null;
  MaxMeltTemp: number | null;
  MinMeltTemp: number | null;
  MFI: number | null;
  VisualNote: string | null;
}>;

export type LbrSavePayload = {
  header: LbrHeaderPayload;
  details?: { NoSak: number; Berat: number; IdLokasi?: string }[];
  NoProduksi?: string;
};

export async function createLbr(
  token: string | undefined,
  payload: LbrSavePayload,
): Promise<string | null> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<{ header?: Record<string, unknown> }>>(
    "/labels/broker",
    t,
    { method: "POST", body: JSON.stringify(payload) },
  );
  if (res.status < 200 || res.status >= 300 || res.data?.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal membuat label (${res.status})`);
  }
  return strOrNull(res.data.data?.header?.NoBroker);
}

export async function updateLbr(
  token: string | undefined,
  noBroker: string,
  payload: LbrSavePayload,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<unknown>>(
    `/labels/broker/${encodeURIComponent(noBroker)}`,
    t,
    { method: "PUT", body: JSON.stringify(payload) },
  );
  if (res.status < 200 || res.status >= 300 || res.data?.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal menyimpan label (${res.status})`);
  }
}

export async function deleteLbr(token: string | undefined, noBroker: string): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<unknown>>(
    `/labels/broker/${encodeURIComponent(noBroker)}`,
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

export async function fetchLbrLabelPdfBase64(
  token: string | undefined,
  noBroker: string,
): Promise<string> {
  return fetchPdfBase64(requireToken(token), `/labels/broker/${encodeURIComponent(noBroker)}/pdf`);
}

export async function fetchLbrQcPdfBase64(
  token: string | undefined,
  noBroker: string,
): Promise<string> {
  return fetchPdfBase64(
    requireToken(token),
    `/labels/broker/${encodeURIComponent(noBroker)}/qc/pdf`,
  );
}

export async function markLbrPrinted(
  token: string | undefined,
  noBroker: string,
): Promise<number | null> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<Record<string, unknown>>>(
    `/labels/broker/${encodeURIComponent(noBroker)}/print`,
    t,
    { method: "PATCH" },
  );
  if (res.status < 200 || res.status >= 300 || res.data?.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal memperbarui hitungan cetak (${res.status})`);
  }
  return numOrNull(res.data.data?.HasBeenPrinted ?? res.data.data?.hasBeenPrinted);
}
