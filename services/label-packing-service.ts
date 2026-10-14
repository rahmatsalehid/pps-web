import { ApiRequestError, apiFetchAuth, getBackendBaseUrl } from "@/services/api";

export type LpkMode = "packing" | "inject" | "retur";

export type LpkHeader = {
  NoBJ: string;
  DateCreate: string | null;
  IdBJ: number;
  NamaBJ: string | null;
  /** Pcs sudah dikurangi total partial (backend). */
  Pcs: number | null;
  Berat: number | null;
  IsPartial: boolean;
  IdWarehouse: number | null;
  Blok: string | null;
  IdLokasi: string | null;
  OutputType: string | null;
  OutputCode: string | null;
  OutputNamaMesin: string | null;
  HasBeenPrinted: number;
  Used: boolean;
};

export type LpkOutputItem = {
  NoBJ: string;
  HasBeenPrinted: number;
};

export type LpkJenis = {
  IdBJ: number;
  NamaBJ: string;
};

export type LpkProcessOption = {
  code: string;
  nama: string;
};

export type LpkPartialRow = {
  NoBJPartial: string;
  NoBJ: string;
  Pcs: number;
  SourceType: string | null;
  NoBJJual: string | null;
  TanggalJual: string | null;
  IdPembeli: number | null;
  NamaPembeli: string | null;
  Remark: string | null;
};

export type LpkPartialInfo = {
  totalPartialPcs: number;
  rows: LpkPartialRow[];
};

export type LpkInjectPackingInfo = {
  beratProdukHasilTimbang: number | null;
  items: LpkJenis[];
};

type Envelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  totalPartialPcs?: number;
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

function parseHeader(r: Record<string, unknown>): LpkHeader {
  return {
    NoBJ: str(r.NoBJ),
    DateCreate: strOrNull(r.DateCreate),
    IdBJ: num0(r.IdBJ),
    NamaBJ: strOrNull(r.NamaBJ),
    Pcs: numOrNull(r.Pcs),
    Berat: numOrNull(r.Berat),
    IsPartial: bool(r.IsPartial),
    IdWarehouse: numOrNull(r.IdWarehouse),
    Blok: strOrNull(r.Blok),
    IdLokasi: strOrNull(r.IdLokasi),
    OutputType: strOrNull(r.OutputType),
    OutputCode: strOrNull(r.OutputCode),
    OutputNamaMesin: strOrNull(r.OutputNamaMesin),
    HasBeenPrinted: num0(r.HasBeenPrinted),
    Used: bool(r.Used),
  };
}

export async function getLpkHeaders(
  token: string | undefined,
  args: { page: number; limit: number; search: string; includeUsed: boolean },
): Promise<{ headers: LpkHeader[]; total: number; totalPages: number }> {
  const t = requireToken(token);
  const qs = new URLSearchParams({
    page: String(args.page),
    limit: String(args.limit),
  });
  if (args.search) qs.set("search", args.search);
  if (args.includeUsed) qs.set("includeUsed", "true");
  const res = await apiFetchAuth<Envelope<Record<string, unknown>[]>>(
    `/labels/packing?${qs.toString()}`,
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

export async function getLpkJenis(token: string | undefined): Promise<LpkJenis[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<Record<string, unknown>[]>>("/packing-type", t);
  if (res.status !== 200 || !res.data || res.data.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal memuat jenis packing (${res.status})`);
  }
  return (res.data.data ?? [])
    .filter((r) => r.Enable === 1 || r.Enable === true)
    .map((r) => ({
      IdBJ: num0(r.IdBJ),
      NamaBJ: str(r.NamaBJ),
    }));
}

async function fetchProduksiList(
  t: string,
  path: string,
  tanggal: string,
  modeField: "NoPacking" | "NoProduksi" | "NoRetur",
  namaField: "NamaMesin" | "NamaPembeli",
): Promise<LpkProcessOption[]> {
  const qs = new URLSearchParams({
    page: "1",
    pageSize: "100",
    dateFrom: tanggal,
    dateTo: tanggal,
  });
  const res = await apiFetchAuth<{ data?: Record<string, unknown>[] }>(
    `${path}?${qs.toString()}`,
    t,
  );
  return (res.data.data ?? [])
    .map((p) => ({
      code: str(p[modeField]),
      nama: str(p[namaField]),
    }))
    .filter((o) => o.code !== "");
}

export async function getLpkPackingProduksiOptions(
  token: string | undefined,
  tanggal: string,
): Promise<LpkProcessOption[]> {
  const t = requireToken(token);
  return fetchProduksiList(t, "/production/packing", tanggal, "NoPacking", "NamaMesin");
}

export async function getLpkInjectProduksiOptions(
  token: string | undefined,
  tanggal: string,
): Promise<LpkProcessOption[]> {
  const t = requireToken(token);
  const qs = new URLSearchParams({
    page: "1",
    pageSize: "100",
    tanggal,
  });
  const res = await apiFetchAuth<{ data?: Record<string, unknown>[] }>(
    `/production/inject?${qs.toString()}`,
    t,
  );
  return (res.data.data ?? [])
    .map((p) => ({
      code: str(p.NoProduksi),
      nama: str(p.NamaMesin),
    }))
    .filter((o) => o.code !== "");
}

export async function getLpkReturProduksiOptions(
  token: string | undefined,
  tanggal: string,
): Promise<LpkProcessOption[]> {
  const t = requireToken(token);
  return fetchProduksiList(t, "/production/return", tanggal, "NoRetur", "NamaPembeli");
}

export async function getLpkPackingOutputs(
  token: string | undefined,
  noCode: string,
): Promise<LpkOutputItem[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<Record<string, unknown>[]>>(
    `/production/packing/${encodeURIComponent(noCode)}/outputs`,
    t,
  );
  if (res.status !== 200 || !res.data) {
    throw new ApiRequestError(res.data?.message ?? `Gagal memuat output (${res.status})`);
  }
  return (res.data.data ?? [])
    .map((r) => ({
      NoBJ: str(r.NoBJ),
      HasBeenPrinted: num0(r.HasBeenPrinted),
    }))
    .filter((o) => o.NoBJ !== "");
}

export async function getLpkInjectOutputs(
  token: string | undefined,
  noCode: string,
): Promise<LpkOutputItem[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<Record<string, unknown>[]>>(
    `/production/inject/${encodeURIComponent(noCode)}/outputs/barang-jadi`,
    t,
  );
  if (res.status !== 200 || !res.data) {
    throw new ApiRequestError(res.data?.message ?? `Gagal memuat output (${res.status})`);
  }
  return (res.data.data ?? [])
    .map((r) => ({
      NoBJ: str(r.NoBJ),
      HasBeenPrinted: num0(r.HasBeenPrinted),
    }))
    .filter((o) => o.NoBJ !== "");
}

export async function getLpkReturOutputs(
  token: string | undefined,
  noCode: string,
): Promise<LpkOutputItem[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<Record<string, unknown>[]>>(
    `/production/return/${encodeURIComponent(noCode)}/outputs/barang-jadi`,
    t,
  );
  if (res.status !== 200 || !res.data) {
    throw new ApiRequestError(res.data?.message ?? `Gagal memuat output (${res.status})`);
  }
  return (res.data.data ?? [])
    .map((r) => ({
      NoBJ: str(r.NoBJ),
      HasBeenPrinted: num0(r.HasBeenPrinted),
    }))
    .filter((o) => o.NoBJ !== "");
}

export async function getLpkInjectPackingInfo(
  token: string | undefined,
  noProduksi: string,
): Promise<LpkInjectPackingInfo> {
  const t = requireToken(token);
  const res = await apiFetchAuth<{
    success?: boolean;
    message?: string;
    data?: {
      beratProdukHasilTimbang?: number | null;
      items?: Record<string, unknown>[];
    };
  }>(`/production/inject/packing/${encodeURIComponent(noProduksi)}`, t);
  if (res.status !== 200 || !res.data || res.data.success !== true) {
    return { beratProdukHasilTimbang: null, items: [] };
  }
  return {
    beratProdukHasilTimbang: numOrNull(res.data.data?.beratProdukHasilTimbang),
    items: (res.data.data?.items ?? []).map((r) => ({
      IdBJ: num0(r.IdBJ),
      NamaBJ: str(r.NamaBJ),
    })),
  };
}

export async function getLpkPartialInfo(
  token: string | undefined,
  noBJ: string,
): Promise<LpkPartialInfo> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<Record<string, unknown>[]>>(
    `/labels/packing/partials/${encodeURIComponent(noBJ)}`,
    t,
  );
  if (res.status !== 200 || !res.data || res.data.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal memuat partial (${res.status})`);
  }
  return {
    totalPartialPcs: numOrNull(res.data.totalPartialPcs) ?? 0,
    rows: (res.data.data ?? []).map((r) => ({
      NoBJPartial: str(r.NoBJPartial),
      NoBJ: str(r.NoBJ),
      Pcs: num0(r.Pcs),
      SourceType: strOrNull(r.SourceType),
      NoBJJual: strOrNull(r.NoBJJual),
      TanggalJual: strOrNull(r.TanggalJual),
      IdPembeli: numOrNull(r.IdPembeli),
      NamaPembeli: strOrNull(r.NamaPembeli),
      Remark: strOrNull(r.Remark),
    })),
  };
}

export type LpkHeaderPayload = Partial<{
  IdBJ: number;
  Pcs: number;
  Berat: number;
  DateCreate: string;
  Jam: string;
  IsPartial: 0 | 1;
  IdWarehouse: number;
  Blok: string;
  IdLokasi: string;
}>;

export type LpkSavePayload = {
  header: LpkHeaderPayload;
  /** Wajib saat create — BD. / S. / L. */
  outputCode?: string;
};

export async function createLpk(
  token: string | undefined,
  payload: LpkSavePayload,
): Promise<{ noBJ: string | null; count: number }> {
  const t = requireToken(token);
  const res = await apiFetchAuth<
    Envelope<{ headers?: Record<string, unknown>[]; header?: Record<string, unknown>; output?: { count?: number } }>
  >("/labels/packing", t, { method: "POST", body: JSON.stringify(payload) });
  if (res.status < 200 || res.status >= 300 || res.data?.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal membuat label (${res.status})`);
  }
  const headers = Array.isArray(res.data.data?.headers) ? res.data.data!.headers! : [];
  const count =
    typeof res.data.data?.output?.count === "number"
      ? res.data.data!.output!.count!
      : headers.length || 1;
  const firstNo = headers[0]?.NoBJ ?? res.data.data?.header?.NoBJ ?? null;
  return { noBJ: firstNo != null ? str(firstNo) : null, count };
}

export async function updateLpk(
  token: string | undefined,
  noBJ: string,
  payload: LpkSavePayload,
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<unknown>>(
    `/labels/packing/${encodeURIComponent(noBJ)}`,
    t,
    { method: "PUT", body: JSON.stringify(payload) },
  );
  if (res.status < 200 || res.status >= 300 || res.data?.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal menyimpan label (${res.status})`);
  }
}

export async function deleteLpk(token: string | undefined, noBJ: string): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<unknown>>(
    `/labels/packing/${encodeURIComponent(noBJ)}`,
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

export async function fetchLpkLabelPdfBase64(
  token: string | undefined,
  noBJ: string,
): Promise<string> {
  return fetchPdfBase64(requireToken(token), `/labels/packing/${encodeURIComponent(noBJ)}/pdf`);
}

export async function markLpkPrinted(
  token: string | undefined,
  noBJ: string,
): Promise<number | null> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<Record<string, unknown>>>(
    `/labels/packing/${encodeURIComponent(noBJ)}/print`,
    t,
    { method: "PATCH" },
  );
  if (res.status < 200 || res.status >= 300 || res.data?.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal memperbarui hitungan cetak (${res.status})`);
  }
  return numOrNull(res.data.data?.HasBeenPrinted ?? res.data.data?.hasBeenPrinted);
}

export async function resetLpkPrinted(
  token: string | undefined,
  noBJ: string,
): Promise<number | null> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<Record<string, unknown>>>(
    `/labels/packing/${encodeURIComponent(noBJ)}/reset-print`,
    t,
    { method: "PATCH" },
  );
  if (res.status < 200 || res.status >= 300 || res.data?.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal reset status cetak (${res.status})`);
  }
  return numOrNull(res.data.data?.HasBeenPrinted ?? res.data.data?.hasBeenPrinted);
}
