import { ApiRequestError, apiFetchAuth, getBackendBaseUrl } from "@/services/api";

export type LbgHeader = {
  NoBonggolan: string;
  DateCreate: string | null;
  IdBonggolan: number;
  NamaBonggolan: string | null;
  IdWarehouse: number;
  NamaWarehouse: string | null;
  Blok: string | null;
  IdLokasi: string | null;
  Berat: number | null;
  Used: boolean;
  HasBeenPrinted: number;
  StatusText: string;
  BrokerNoProduksi: string | null;
  BrokerNamaMesin: string | null;
  InjectNoProduksi: string | null;
  InjectNamaMesin: string | null;
  NoBongkarSusun: string | null;
};

export type LbgOutputItem = {
  NoBonggolan: string;
  HasBeenPrinted: number;
};

export type LbgJenis = {
  IdBonggolan: number;
  NamaBonggolan: string;
};

export type LbgProcessOption = {
  noProduksi: string;
  namaMesin: string;
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

export async function getLbgHeaders(
  token: string | undefined,
  args: { page: number; limit: number; search: string; includeUsed: boolean },
): Promise<{ headers: LbgHeader[]; total: number; totalPages: number }> {
  const t = requireToken(token);
  const qs = new URLSearchParams({
    page: String(args.page),
    limit: String(args.limit),
  });
  if (args.search) qs.set("search", args.search);
  if (args.includeUsed) qs.set("includeUsed", "true");
  const res = await apiFetchAuth<Envelope<Record<string, unknown>[]>>(
    `/labels/bonggolan?${qs.toString()}`,
    t,
  );
  if (res.status !== 200 || !res.data || res.data.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal memuat data (${res.status})`);
  }
  const headers = (res.data.data ?? []).map((r) => ({
    NoBonggolan: str(r.NoBonggolan),
    DateCreate: strOrNull(r.DateCreate),
    IdBonggolan: num0(r.IdBonggolan),
    NamaBonggolan: strOrNull(r.NamaBonggolan),
    IdWarehouse: num0(r.IdWarehouse),
    NamaWarehouse: strOrNull(r.NamaWarehouse),
    Blok: strOrNull(r.Blok),
    IdLokasi: strOrNull(r.IdLokasi),
    Berat: numOrNull(r.Berat),
    Used: bool(r.Used),
    HasBeenPrinted: num0(r.HasBeenPrinted),
    StatusText: str(r.StatusText),
    BrokerNoProduksi: strOrNull(r.BrokerNoProduksi),
    BrokerNamaMesin: strOrNull(r.BrokerNamaMesin),
    InjectNoProduksi: strOrNull(r.InjectNoProduksi),
    InjectNamaMesin: strOrNull(r.InjectNamaMesin),
    NoBongkarSusun: strOrNull(r.NoBongkarSusun),
  }));
  return {
    headers,
    total: res.data.meta?.total ?? headers.length,
    totalPages: res.data.meta?.totalPages ?? 1,
  };
}

export async function getLbgJenis(token: string | undefined): Promise<LbgJenis[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<Record<string, unknown>[]>>("/bonggolan-type", t);
  if (res.status !== 200 || !res.data || res.data.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal memuat jenis bonggolan (${res.status})`);
  }
  return (res.data.data ?? []).map((r) => ({
    IdBonggolan: num0(r.IdBonggolan),
    NamaBonggolan: str(r.NamaBonggolan),
  }));
}

export async function getLbgOutputsByBroker(
  token: string | undefined,
  noProduksi: string,
): Promise<LbgOutputItem[]> {
  return getLbgOutputs(token, `/production/broker/${encodeURIComponent(noProduksi)}/outputs/bonggolan`);
}

export async function getLbgOutputsByInject(
  token: string | undefined,
  noProduksi: string,
): Promise<LbgOutputItem[]> {
  return getLbgOutputs(token, `/production/inject/${encodeURIComponent(noProduksi)}/outputs/bonggolan`);
}

async function getLbgOutputs(token: string | undefined, path: string): Promise<LbgOutputItem[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<Record<string, unknown>[]>>(path, t);
  if (res.status !== 200 || !res.data) {
    throw new ApiRequestError(res.data?.message ?? `Gagal memuat output (${res.status})`);
  }
  return (res.data.data ?? [])
    .map((r) => ({
      NoBonggolan: str(r.NoBonggolan),
      HasBeenPrinted: num0(r.HasBeenPrinted),
    }))
    .filter((o) => o.NoBonggolan !== "");
}

export async function createLbg(
  token: string | undefined,
  body: {
    header: { IdBonggolan: number; IdWarehouse: number; DateCreate: string; Berat: number };
    ProcessedCode?: string;
  },
): Promise<string | null> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<{ header?: Record<string, unknown> }>>(
    "/labels/bonggolan",
    t,
    { method: "POST", body: JSON.stringify(body) },
  );
  if (res.status < 200 || res.status >= 300 || res.data?.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal membuat label (${res.status})`);
  }
  return strOrNull(res.data.data?.header?.NoBonggolan);
}

export async function updateLbg(
  token: string | undefined,
  noBonggolan: string,
  body: { DateCreate?: string; IdBonggolan?: number; Berat?: number },
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<unknown>>(
    `/labels/bonggolan/${encodeURIComponent(noBonggolan)}`,
    t,
    { method: "PUT", body: JSON.stringify(body) },
  );
  if (res.status < 200 || res.status >= 300 || res.data?.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal menyimpan label (${res.status})`);
  }
}

export async function deleteLbg(token: string | undefined, noBonggolan: string): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<unknown>>(
    `/labels/bonggolan/${encodeURIComponent(noBonggolan)}`,
    t,
    { method: "DELETE" },
  );
  if (res.status < 200 || res.status >= 300 || res.data?.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal menghapus label (${res.status})`);
  }
}

export async function fetchLbgLabelPdfBase64(
  token: string | undefined,
  noBonggolan: string,
): Promise<string> {
  const t = requireToken(token);
  const base = getBackendBaseUrl();
  const path = `/labels/bonggolan/${encodeURIComponent(noBonggolan)}/pdf`;
  let response: Response;
  try {
    response = await fetch(`${base}/api${path}`, {
      headers: { Authorization: `Bearer ${t}` },
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

export async function markLbgPrinted(
  token: string | undefined,
  noBonggolan: string,
): Promise<number | null> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<Record<string, unknown>>>(
    `/labels/bonggolan/${encodeURIComponent(noBonggolan)}/print`,
    t,
    { method: "PATCH" },
  );
  if (res.status < 200 || res.status >= 300 || res.data?.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal memperbarui hitungan cetak (${res.status})`);
  }
  return numOrNull(res.data.data?.HasBeenPrinted ?? res.data.data?.hasBeenPrinted);
}
