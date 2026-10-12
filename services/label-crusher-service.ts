import { ApiRequestError, apiFetchAuth, getBackendBaseUrl } from "@/services/api";

export type LcsHeader = {
  NoCrusher: string;
  DateCreate: string | null;
  IdCrusher: number;
  NamaCrusher: string | null;
  IdWarehouse: number;
  NamaWarehouse: string | null;
  Blok: string | null;
  IdLokasi: string | null;
  Berat: number | null;
  Used: boolean;
  HasBeenPrinted: number;
  StatusText: string;
  CrusherNoProduksi: string | null;
  CrusherNamaMesin: string | null;
  NoBongkarSusun: string | null;
};

export type LcsOutputItem = {
  NoCrusher: string;
  HasBeenPrinted: number;
};

export type LcsJenis = {
  IdCrusher: number;
  NamaCrusher: string;
};

export type LcsProcessOption = {
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

export async function getLcsHeaders(
  token: string | undefined,
  args: { page: number; limit: number; search: string; includeUsed: boolean },
): Promise<{ headers: LcsHeader[]; total: number; totalPages: number }> {
  const t = requireToken(token);
  const qs = new URLSearchParams({
    page: String(args.page),
    limit: String(args.limit),
  });
  if (args.search) qs.set("search", args.search);
  if (args.includeUsed) qs.set("includeUsed", "true");
  const res = await apiFetchAuth<Envelope<Record<string, unknown>[]>>(
    `/labels/crusher?${qs.toString()}`,
    t,
  );
  if (res.status !== 200 || !res.data || res.data.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal memuat data (${res.status})`);
  }
  const headers = (res.data.data ?? []).map((r) => ({
    NoCrusher: str(r.NoCrusher),
    DateCreate: strOrNull(r.DateCreate),
    IdCrusher: num0(r.IdCrusher),
    NamaCrusher: strOrNull(r.NamaCrusher),
    IdWarehouse: num0(r.IdWarehouse),
    NamaWarehouse: strOrNull(r.NamaWarehouse),
    Blok: strOrNull(r.Blok),
    IdLokasi: strOrNull(r.IdLokasi),
    Berat: numOrNull(r.Berat),
    Used: bool(r.Used),
    HasBeenPrinted: num0(r.HasBeenPrinted),
    StatusText: str(r.StatusText),
    CrusherNoProduksi: strOrNull(r.CrusherNoProduksi),
    CrusherNamaMesin: strOrNull(r.CrusherNamaMesin),
    NoBongkarSusun: strOrNull(r.NoBongkarSusun),
  }));
  return {
    headers,
    total: res.data.meta?.total ?? headers.length,
    totalPages: res.data.meta?.totalPages ?? 1,
  };
}

export async function getLcsJenis(token: string | undefined): Promise<LcsJenis[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<Record<string, unknown>[]>>("/crusher-type", t);
  if (res.status !== 200 || !res.data || res.data.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal memuat jenis crusher (${res.status})`);
  }
  return (res.data.data ?? [])
    .map((r) => ({
      IdCrusher: num0(r.IdCrusher),
      NamaCrusher: str(r.NamaCrusher),
    }))
    .filter((j) => j.IdCrusher !== 0);
}

export async function getLcsOutputs(
  token: string | undefined,
  noProduksi: string,
): Promise<LcsOutputItem[]> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<Record<string, unknown>[]>>(
    `/production/crusher/${encodeURIComponent(noProduksi)}/outputs`,
    t,
  );
  if (res.status !== 200 || !res.data) {
    throw new ApiRequestError(res.data?.message ?? `Gagal memuat output (${res.status})`);
  }
  return (res.data.data ?? [])
    .map((r) => ({
      NoCrusher: str(r.NoCrusher),
      HasBeenPrinted: num0(r.HasBeenPrinted),
    }))
    .filter((o) => o.NoCrusher !== "");
}

export async function createLcs(
  token: string | undefined,
  body: {
    header: { IdCrusher: number; IdWarehouse: number; DateCreate: string; Berat: number };
    ProcessedCode?: string;
  },
): Promise<string | null> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<{ header?: Record<string, unknown> }>>(
    "/labels/crusher",
    t,
    { method: "POST", body: JSON.stringify(body) },
  );
  if (res.status < 200 || res.status >= 300 || res.data?.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal membuat label (${res.status})`);
  }
  return strOrNull(res.data.data?.header?.NoCrusher);
}

export async function updateLcs(
  token: string | undefined,
  noCrusher: string,
  body: { DateCreate?: string; IdCrusher?: number; Berat?: number },
): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<unknown>>(
    `/labels/crusher/${encodeURIComponent(noCrusher)}`,
    t,
    { method: "PUT", body: JSON.stringify(body) },
  );
  if (res.status < 200 || res.status >= 300 || res.data?.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal menyimpan label (${res.status})`);
  }
}

export async function deleteLcs(token: string | undefined, noCrusher: string): Promise<void> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<unknown>>(
    `/labels/crusher/${encodeURIComponent(noCrusher)}`,
    t,
    { method: "DELETE" },
  );
  if (res.status < 200 || res.status >= 300 || res.data?.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal menghapus label (${res.status})`);
  }
}

export async function fetchLcsLabelPdfBase64(
  token: string | undefined,
  noCrusher: string,
): Promise<string> {
  const t = requireToken(token);
  const base = getBackendBaseUrl();
  const path = `/labels/crusher/${encodeURIComponent(noCrusher)}/pdf`;
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

export async function markLcsPrinted(
  token: string | undefined,
  noCrusher: string,
): Promise<number | null> {
  const t = requireToken(token);
  const res = await apiFetchAuth<Envelope<Record<string, unknown>>>(
    `/labels/crusher/${encodeURIComponent(noCrusher)}/print`,
    t,
    { method: "PATCH" },
  );
  if (res.status < 200 || res.status >= 300 || res.data?.success !== true) {
    throw new ApiRequestError(res.data?.message ?? `Gagal memperbarui hitungan cetak (${res.status})`);
  }
  return numOrNull(res.data.data?.HasBeenPrinted ?? res.data.data?.hasBeenPrinted);
}
