import { ApiRequestError, apiFetchAuth, getBackendBaseUrl } from "@/services/api";

export type LmxHeader = {
  NoMixer: string;
  IdMixer: number;
  NamaMixer: string | null;
  DateCreate: string | null;
  StatusText: string;
  Blok: string | null;
  IdLokasi: number | null;
  Moisture: number | null;
  Moisture2: number | null;
  Moisture3: number | null;
  MaxMeltTemp: number | null;
  MinMeltTemp: number | null;
  MFI: number | null;
  OutputType: string | null;
  OutputCode: string | null;
  OutputNamaMesin: string | null;
  NoProduksi: string | null;
  NoBongkarSusun: string | null;
  NamaMesin: string | null;
  CreateBy: string | null;
  DateTimeCreate: string | null;
  HasBeenPrinted: number;
  Used: boolean;
};

export type LmxDetail = {
  NoMixer: string;
  NoSak: number;
  Berat: number | null;
  DateUsage: string | null;
  IsPartial: boolean | null;
};

export type LmxOutputItem = {
  NoMixer: string;
  HasBeenPrinted: number;
};

export type LmxJenis = {
  IdMixer: number;
  Nama: string;
};

export type LmxProcessOption = {
  noProduksi: string;
  namaMesin: string;
};

export type LmxPartialRow = {
  NoMixerPartial: string;
  NoMixer: string;
  NoSak: number;
  Berat: number;
  SourceType: string | null;
  NoProduksi: string | null;
  TglProduksi: string | null;
  NamaMesin: string | null;
  Jam: string | null;
  Shift: string | null;
};

export type LmxPartialInfo = {
  totalPartialWeight: number;
  rows: LmxPartialRow[];
};

export type LmxMaxSak = {
  JlhSak: number;
  DefaultKG: number;
};

type Envelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
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

export async function getLmxHeaders(
  token: string | undefined,
  args: { page: number; limit: number; search: string; includeUsed: boolean },
): Promise<{ headers: LmxHeader[]; total: number; totalPages: number }> {
  const t = requireToken(token);
  const qs = new URLSearchParams({
    page: String(args.page),
    limit: String(args.limit),
  });
  if (args.search) qs.set("search", args.search);
  if (args.includeUsed) qs.set("includeUsed", "true");
  const res = await apiFetchAuth<Envelope<Record<string, unknown>[]>>(
    `/labels/mixer?${qs.toString()}`,
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

function parseHeader(r: Record<string, unknown>): LmxHeader {
  const rawOutputType = r.OutputType != null ? String(r.OutputType) : null;
  const rawOutputCode = r.OutputCode != null ? String(r.OutputCode) : null;
  const rawOutputNamaMesin = r.OutputNamaMesin != null ? String(r.OutputNamaMesin) : null;
  const legacyNoProduksi = r.NoProduksi != null ? String(r.NoProduksi) : null;
  const legacyNoBongkarSusun = r.NoBongkarSusun != null ? String(r.NoBongkarSusun) : null;
  const legacyNamaMesin = r.NamaMesin != null ? String(r.NamaMesin) : null;

  const effOutputType =
    rawOutputType ??
    (legacyNoProduksi
      ? "MIXER_PRODUKSI"
      : legacyNoBongkarSusun
        ? "BONGKAR_SUSUN"
        : null);
  const effOutputCode = rawOutputCode ?? legacyNoProduksi ?? legacyNoBongkarSusun;
  const effOutputNamaMesin =
    rawOutputNamaMesin ??
    (effOutputType === "BONGKAR_SUSUN" ? "Bongkar Susun" : legacyNamaMesin);
  const effNoProduksi = effOutputType === "MIXER_PRODUKSI" ? effOutputCode : null;
  const effNoBongkarSusun = effOutputType === "BONGKAR_SUSUN" ? effOutputCode : null;

  return {
    NoMixer: str(r.NoMixer),
    IdMixer: num0(r.IdMixer),
    NamaMixer: strOrNull(r.NamaMixer),
    DateCreate: strOrNull(r.DateCreate),
    StatusText: str(r.StatusText),
    Blok: strOrNull(r.Blok),
    IdLokasi: numOrNull(r.IdLokasi),
    Moisture: numOrNull(r.Moisture),
    Moisture2: numOrNull(r.Moisture2),
    Moisture3: numOrNull(r.Moisture3),
    MaxMeltTemp: numOrNull(r.MaxMeltTemp),
    MinMeltTemp: numOrNull(r.MinMeltTemp),
    MFI: numOrNull(r.MFI),
    OutputType: effOutputType,
    OutputCode: effOutputCode,
    OutputNamaMesin: effOutputNamaMesin,
    NoProduksi: effNoProduksi,
    NoBongkarSusun: effNoBongkarSusun,
    NamaMesin: effOutputNamaMesin,
    CreateBy: strOrNull(r.CreateBy),
    DateTimeCreate: strOrNull(r.DateTimeCreate),
    HasBeenPrinted: num0(r.HasBeenPrinted),
    Used: bool(r.Used),
  };
}

export async function getLmxDetails(
  token: string | undefined,
  noMixer: string,
): Promise<LmxDetail[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<
    Envelope<{ nomixer?: string; details?: Record<string, unknown>[] }>
  >(`/labels/mixer/${encodeURIComponent(noMixer)}`, t);
  if (res.status !== 200 || !res.data || res.data.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal memuat detail (${res.status})`);
  }
  return (res.data.data?.details ?? []).map((r) => ({
    NoMixer: str(r.NoMixer),
    NoSak: num0(r.NoSak),
    Berat: numOrNull(r.Berat),
    DateUsage: strOrNull(r.DateUsage),
    IsPartial: r.IsPartial == null ? null : bool(r.IsPartial),
  }));
}

export async function getLmxJenis(token: string | undefined): Promise<LmxJenis[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<Record<string, unknown>[]>>("/mst-mixer", t);
  if (res.status !== 200 || !res.data || res.data.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal memuat jenis mixer (${res.status})`);
  }
  return (res.data.data ?? [])
    .filter((r) => r.IsEnable === true || r.IsEnable === 1 || r.IsEnable === "1" || r.Enable === 1)
    .map((r) => ({
      IdMixer: num0(r.IdMixer),
      Nama: str(r.Nama ?? r.Jenis),
    }));
}

export async function getLmxMaxSak(token: string | undefined): Promise<LmxMaxSak> {
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

export async function getLmxMixerProduksiOptions(
  token: string | undefined,
  tanggal: string,
): Promise<LmxProcessOption[]> {
  const t = requireToken(token);
  const qs = new URLSearchParams({ page: "1", pageSize: "100", tanggal });
  const res = await apiFetchAuth<{
    data?: Record<string, unknown>[];
  }>(`/production/mixer?${qs.toString()}`, t);
  return (res.data.data ?? []).map((p) => ({
    noProduksi: str(p.NoProduksi),
    namaMesin: str(p.NamaMesin),
  }));
}

export async function getLmxInjectProduksiOptions(
  token: string | undefined,
  tanggal: string,
): Promise<LmxProcessOption[]> {
  const t = requireToken(token);
  const qs = new URLSearchParams({ page: "1", pageSize: "100", tanggal });
  const res = await apiFetchAuth<{
    data?: Record<string, unknown>[];
  }>(`/production/inject?${qs.toString()}`, t);
  return (res.data.data ?? []).map((p) => ({
    noProduksi: str(p.NoProduksi),
    namaMesin: str(p.NamaMesin),
  }));
}

export async function getLmxMixerOutputs(
  token: string | undefined,
  noProduksi: string,
): Promise<LmxOutputItem[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<Record<string, unknown>[]>>(
    `/production/mixer/${encodeURIComponent(noProduksi)}/outputs`,
    t,
  );
  if (res.status !== 200 || !res.data) {
    throw new ApiRequestError(res.data?.message ?? `Gagal memuat output (${res.status})`);
  }
  return (res.data.data ?? [])
    .map((r) => ({
      NoMixer: str(r.NoMixer),
      HasBeenPrinted: num0(r.HasBeenPrinted),
    }))
    .filter((o) => o.NoMixer !== "");
}

export async function getLmxInjectOutputs(
  token: string | undefined,
  noProduksi: string,
): Promise<LmxOutputItem[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<Record<string, unknown>[]>>(
    `/production/inject/${encodeURIComponent(noProduksi)}/outputs`,
    t,
  );
  if (res.status !== 200 || !res.data) {
    throw new ApiRequestError(res.data?.message ?? `Gagal memuat output (${res.status})`);
  }
  return (res.data.data ?? [])
    .map((r) => ({
      NoMixer: str(r.NoMixer),
      HasBeenPrinted: num0(r.HasBeenPrinted),
    }))
    .filter((o) => o.NoMixer !== "");
}

export async function getLmxPartialInfo(
  token: string | undefined,
  noMixer: string,
  noSak: number,
): Promise<LmxPartialInfo> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<Record<string, unknown>[]>>(
    `/labels/mixer/partials/${encodeURIComponent(noMixer)}/${noSak}`,
    t,
  );
  if (res.status !== 200 || !res.data || res.data.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal memuat partial (${res.status})`);
  }
  return {
    totalPartialWeight: numOrNull(res.data.totalPartialWeight) ?? 0,
    rows: (res.data.data ?? []).map((r) => ({
      NoMixerPartial: str(r.NoMixerPartial),
      NoMixer: str(r.NoMixer),
      NoSak: num0(r.NoSak),
      Berat: num0(r.Berat),
      SourceType: strOrNull(r.SourceType),
      NoProduksi: strOrNull(r.NoProduksi),
      TglProduksi: strOrNull(r.TglProduksi),
      NamaMesin: strOrNull(r.NamaMesin),
      Jam: strOrNull(r.Jam),
      Shift: strOrNull(r.Shift),
    })),
  };
}

export type LmxHeaderPayload = Partial<{
  IdMixer: number;
  IdStatus: number;
  Blok: string;
  IdLokasi: number;
  Moisture: number | null;
  Moisture2: number | null;
  Moisture3: number | null;
  MaxMeltTemp: number | null;
  MinMeltTemp: number | null;
  MFI: number | null;
}>;

export type LmxSavePayload = {
  header: LmxHeaderPayload;
  details?: { NoSak: number; Berat: number }[];
  /** Wajib saat create — I.xxx (produksi mixer) / S.xxx (inject). */
  outputCode?: string;
};

export async function createLmx(
  token: string | undefined,
  payload: LmxSavePayload,
): Promise<string | null> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<{ header?: Record<string, unknown> }>>(
    "/labels/mixer",
    t,
    { method: "POST", body: JSON.stringify(payload) },
  );
  if (res.status < 200 || res.status >= 300 || res.data?.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal membuat label (${res.status})`);
  }
  return strOrNull(res.data.data?.header?.NoMixer);
}

export async function updateLmx(
  token: string | undefined,
  noMixer: string,
  payload: LmxSavePayload,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<unknown>>(
    `/labels/mixer/${encodeURIComponent(noMixer)}`,
    t,
    { method: "PUT", body: JSON.stringify(payload) },
  );
  if (res.status < 200 || res.status >= 300 || res.data?.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal menyimpan label (${res.status})`);
  }
}

export async function deleteLmx(token: string | undefined, noMixer: string): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<unknown>>(
    `/labels/mixer/${encodeURIComponent(noMixer)}`,
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

export async function fetchLmxLabelPdfBase64(
  token: string | undefined,
  noMixer: string,
): Promise<string> {
  return fetchPdfBase64(requireToken(token), `/labels/mixer/${encodeURIComponent(noMixer)}/pdf`);
}

export async function fetchLmxQcPdfBase64(
  token: string | undefined,
  noMixer: string,
): Promise<string> {
  return fetchPdfBase64(
    requireToken(token),
    `/labels/mixer/${encodeURIComponent(noMixer)}/qc/pdf`,
  );
}

export async function markLmxPrinted(
  token: string | undefined,
  noMixer: string,
): Promise<number | null> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<Record<string, unknown>>>(
    `/labels/mixer/${encodeURIComponent(noMixer)}/print`,
    t,
    { method: "PATCH" },
  );
  if (res.status < 200 || res.status >= 300 || res.data?.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal memperbarui hitungan cetak (${res.status})`);
  }
  return numOrNull(res.data.data?.HasBeenPrinted ?? res.data.data?.hasBeenPrinted);
}
